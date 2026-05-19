import { expenseApiRoutes, managerApiRoutes } from '../routes'

const CURRENT_USER_ID = import.meta.env.VITE_CURRENT_USER_ID ?? '3'
const MANAGER_DASHBOARD_USER_ID = '3'
const PENDING_MANAGER_STATUS = 'Pending Manager'

async function requestExpense(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(CURRENT_USER_ID),
      ...options.headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    const errorBody = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {}
    const error = new Error(errorBody.detail ?? `Request failed with ${response.status}`)
    error.status = response.status
    throw error
  }

  if (!contentType.includes('application/json')) {
    const error = new Error('Pending requests API is not available yet.')
    error.code = 'NON_JSON_RESPONSE'
    throw error
  }

  return response.json()
}

export async function fetchManagerPendingRequests() {
  const params = new URLSearchParams({
    page: '1',
    page_size: '20',
    sort: 'created_at',
    order: 'desc',
  })
  const response = await requestExpense(`${managerApiRoutes.pendingRequests}?${params}`, {
    headers: { 'X-User-Id': MANAGER_DASHBOARD_USER_ID },
  })
  return normalizeManagerPendingRequests(response.requests ?? [])
}

export async function fetchManagerPendingRequestsSummary() {
  const response = await requestExpense(managerApiRoutes.pendingRequestsSummary, {
    headers: { 'X-User-Id': MANAGER_DASHBOARD_USER_ID },
  })

  return {
    pendingCount: Number(response.pending_count ?? response.pendingCount ?? 0),
    totalAmount: Number(response.total_amount ?? response.totalAmount ?? 0),
    currency: response.currency ?? 'USD',
  }
}

export async function fetchExpenseRequest(expenseId) {
  const expense = await requestExpense(expenseApiRoutes.detail(expenseId))
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
  return {
    id: String(expense.id),
    employee: expense.employee_name ?? `Employee #${expense.employee_id}`,
    employeeId: expense.employee_id,
    submittedOn: toDateOnly(expense.created_at) ?? expense.start_date,
    category: expense.category_name ?? `Category #${expense.category_id}`,
    categoryId: expense.category_id,
    tripStart: expense.start_date,
    tripEnd: expense.end_date,
    status: expense.status,
    processor:
      expense.current_processor_name ??
      (expense.current_processor_id ? `User #${expense.current_processor_id}` : 'Employee'),
    attachments: [],
    lineItems: expense.line_items.map((lineItem) => ({
      id: String(lineItem.id),
      date: lineItem.expense_date,
      itemName: lineItem.item_service_name,
      purpose: lineItem.purpose_note,
      amount: Number(lineItem.amount),
    })),
    timeline: [
      {
        label: expense.status === 'Draft' ? 'Draft created' : 'Submitted',
        date: toDateOnly(expense.created_at) ?? expense.start_date,
      },
    ],
  }
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
