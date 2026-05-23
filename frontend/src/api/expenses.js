import { expenseApiRoutes, managerApiRoutes } from '../routes'

const CURRENT_USER_ID = import.meta.env.VITE_CURRENT_USER_ID ?? '4'
const MANAGER_DASHBOARD_USER_ID = import.meta.env.VITE_MANAGER_USER_ID ?? '3'
const PENDING_MANAGER_STATUS = 'Pending Manager'

async function requestExpense(path, options = {}) {
  const { headers, userId = CURRENT_USER_ID, ...requestOptions } = options
  const isFormData = requestOptions.body instanceof FormData
  const response = await fetch(path, {
    ...requestOptions,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'X-User-Id': String(userId),
      ...headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    const errorBody = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {}
    const detail = Array.isArray(errorBody.detail)
      ? errorBody.detail[0]?.msg
      : errorBody.detail
    const error = new Error(
      errorBody.error ??
        errorBody.message ??
        detail ??
        `Request failed with ${response.status}`,
    )
    error.status = response.status
    throw error
  }

  if (!contentType.includes('application/json')) {
    const error = new Error('Expense API did not return JSON.')
    error.code = 'NON_JSON_RESPONSE'
    throw error
  }

  return response.json()
}

export async function fetchExpenseRequests(userId = CURRENT_USER_ID) {
  const expenses = await requestExpense(expenseApiRoutes.list, { userId })
  return (expenses ?? []).map(toExpenseViewModel)
}

export async function fetchManagerPendingRequests(userId = MANAGER_DASHBOARD_USER_ID) {
  const params = new URLSearchParams({
    page: '1',
    page_size: '20',
    sort: 'created_at',
    order: 'desc',
  })
  const response = await requestExpense(`${managerApiRoutes.pendingRequests}?${params}`, {
    userId,
  })
  return normalizeManagerPendingRequests(response.requests ?? [])
}

export async function fetchManagerPendingRequestsSummary(userId = MANAGER_DASHBOARD_USER_ID) {
  const response = await requestExpense(managerApiRoutes.pendingRequestsSummary, {
    userId,
  })

  return {
    pendingCount: Number(response.pending_count ?? response.pendingCount ?? 0),
    totalAmount: Number(response.total_amount ?? response.totalAmount ?? 0),
    currency: response.currency ?? 'USD',
  }
}

export async function fetchExpenseRequest(expenseId, userId = CURRENT_USER_ID) {
  const expense = await requestExpense(expenseApiRoutes.detail(expenseId), { userId })
  return toExpenseViewModel(expense)
}

export async function createExpenseRequest(payload) {
  const expense = await requestExpense(expenseApiRoutes.list, {
    method: 'POST',
    body: JSON.stringify(toExpenseApiPayload(payload, { includeStatus: true })),
  })
  return toExpenseViewModel(expense)
}

export async function updateExpenseRequest(expenseId, payload) {
  const expense = await requestExpense(expenseApiRoutes.detail(expenseId), {
    method: 'PUT',
    body: JSON.stringify(toExpenseApiPayload(payload)),
  })
  return toExpenseViewModel(expense)
}

export async function cancelExpenseRequest(expenseId) {
  const expense = await requestExpense(expenseApiRoutes.cancel(expenseId), {
    method: 'PATCH',
  })
  return toExpenseViewModel(expense)
}

export async function duplicateExpenseRequest(expenseId) {
  const expense = await requestExpense(expenseApiRoutes.duplicate(expenseId), {
    method: 'POST',
  })
  return toExpenseViewModel(expense)
}

function toExpenseViewModel(expense) {
  const lineItems = (expense.line_items ?? []).map((lineItem) => ({
    id: String(lineItem.id),
    date: lineItem.expense_date,
    itemName: lineItem.item_service_name,
    purpose: lineItem.purpose_note,
    amount: Number(lineItem.amount),
  }))
  const totalAmount = Number(expense.total_amount ?? 0)
  const submittedOn = toDateOnly(expense.created_at) ?? expense.start_date
  const category = expense.category_name ?? `Category #${expense.category_id}`
  const processor =
    expense.current_processor_name ??
    (expense.current_processor_id
      ? `User #${expense.current_processor_id}`
      : processorNameForStatus(expense.status))

  return {
    id: String(expense.id),
    employee: expense.employee_name ?? `Employee #${expense.employee_id}`,
    employeeId: expense.employee_id,
    ownerId: expense.employee_id,
    submittedOn,
    submittedDate: submittedOn,
    category,
    categoryId: expense.category_id,
    tripStart: expense.start_date,
    tripEnd: expense.end_date,
    tripDateFrom: expense.start_date,
    tripDateTo: expense.end_date,
    amount: totalAmount,
    description: summarizeLineItems(lineItems, expense.rejection_reason),
    status: expense.status,
    processor,
    isLocked: Boolean(expense.is_locked),
    attachments: [],
    lineItems,
    timeline: [
      {
        label: expense.status === 'Draft' ? 'Draft created' : 'Submitted',
        date: submittedOn,
      },
    ],
  }
}

function processorNameForStatus(status) {
  if (status === 'Pending Manager') return 'Manager'
  if (status === 'Pending Finance' || status === 'Finance Approved' || status === 'Paid') {
    return 'Finance'
  }
  return 'Employee'
}

function summarizeLineItems(lineItems, rejectionReason) {
  if (rejectionReason) return `Rejected: ${rejectionReason}`
  if (!lineItems.length) return 'No line items'

  const [firstItem] = lineItems
  if (lineItems.length === 1) return firstItem.itemName
  return `${firstItem.itemName} + ${lineItems.length - 1} more`
}

function toDateOnly(value) {
  return value?.slice(0, 10)
}

function normalizeManagerPendingRequests(requests) {
  return requests
    .map(toManagerPendingRequestViewModel)
    .filter((request) => request.status === PENDING_MANAGER_STATUS)
    .sort((firstRequest, secondRequest) =>
      secondRequest.createdDate.localeCompare(firstRequest.createdDate),
    )
}

function toManagerPendingRequestViewModel(request) {
  return {
    id: String(request.id),
    employeeName:
      request.employee_name ??
      request.employeeName ??
      request.employee ??
      `Employee #${request.employee_id ?? request.employeeId ?? 'Unknown'}`,
    employeeId: request.employee_id ?? request.employeeId,
    currentProcessorId: request.current_processor_id ?? request.currentProcessorId,
    requestType:
      request.request_type ??
      request.requestType ??
      request.category_name ??
      request.category ??
      `Category #${request.category_id ?? request.categoryId ?? 'Unknown'}`,
    amount: Number(request.total_amount ?? request.totalAmount ?? request.amount ?? 0),
    createdDate:
      toDateOnly(request.created_at ?? request.createdDate ?? request.submittedOn) ??
      request.start_date ??
      '',
    status: request.status,
    currency: request.currency ?? 'USD',
  }
}

function toExpenseApiPayload(expense, options = {}) {
  const payload = {
    category_id: Number(expense.categoryId),
    start_date: expense.tripStart,
    end_date: expense.tripEnd,
    line_items: expense.lineItems.map((lineItem) => ({
      expense_date: lineItem.date,
      item_service_name: lineItem.itemName,
      purpose_note: lineItem.purpose,
      amount: lineItem.amount,
    })),
  }

  if (options.includeStatus) {
    payload.status = expense.status
  }

  return payload
}
