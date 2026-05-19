import { expenseApiRoutes, managerApiRoutes } from '../routes'

const CURRENT_USER_ID = import.meta.env.VITE_CURRENT_USER_ID ?? '4'
const PENDING_MANAGER_STATUS = 'Pending Manager'
const FALLBACK_MANAGER_PENDING_REQUESTS = [
  {
    id: 1042,
    employee_id: 12,
    employee_name: 'Maya Tran',
    manager_id: 4,
    category_name: 'Travel',
    request_type: 'Travel',
    total_amount: 1280.75,
    status: PENDING_MANAGER_STATUS,
    current_processor_id: 4,
    created_at: '2026-05-18T09:20:00Z',
  },
  {
    id: 1041,
    employee_id: 15,
    employee_name: 'Daniel Park',
    manager_id: 4,
    category_name: 'Training',
    request_type: 'Training',
    total_amount: 420,
    status: PENDING_MANAGER_STATUS,
    current_processor_id: 4,
    created_at: '2026-05-17T14:10:00Z',
  },
  {
    id: 1039,
    employee_id: 18,
    employee_name: 'Linh Nguyen',
    manager_id: 4,
    category_name: 'Meals',
    request_type: 'Meals',
    total_amount: 96.4,
    status: PENDING_MANAGER_STATUS,
    current_processor_id: 4,
    created_at: '2026-05-16T11:35:00Z',
  },
  {
    id: 1038,
    employee_id: 21,
    employee_name: 'Out of Scope Employee',
    manager_id: 6,
    category_name: 'Accommodation',
    total_amount: 810,
    status: PENDING_MANAGER_STATUS,
    current_processor_id: 6,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 1037,
    employee_id: 12,
    employee_name: 'Maya Tran',
    manager_id: 4,
    category_name: 'Office Supplies',
    total_amount: 72.5,
    status: 'Draft',
    current_processor_id: null,
    created_at: '2026-05-14T10:00:00Z',
  },
]

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
  try {
    const response = await requestExpense(managerApiRoutes.pendingRequests)
    const requests = Array.isArray(response) ? response : response.requests
    return normalizeManagerPendingRequests(requests ?? [])
  } catch (error) {
    if (!canUseManagerPendingFallback(error)) {
      throw error
    }

    return normalizeManagerPendingRequests(FALLBACK_MANAGER_PENDING_REQUESTS)
  }
}

export async function fetchManagerPendingRequestsSummary() {
  const response = await requestExpense(managerApiRoutes.pendingRequestsSummary)

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
  const currentUserId = Number(CURRENT_USER_ID)

  return requests
    .map(toManagerPendingRequestViewModel)
    .filter((request) => request.status === PENDING_MANAGER_STATUS)
    .filter((request) => {
      if (request.managerId != null) {
        return Number(request.managerId) === currentUserId
      }

      if (request.currentProcessorId != null) {
        return Number(request.currentProcessorId) === currentUserId
      }

      return true
    })
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
    managerId: request.manager_id ?? request.managerId,
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

function canUseManagerPendingFallback(error) {
  return (
    error.status === 404 ||
    error.status === 405 ||
    error.code === 'NON_JSON_RESPONSE' ||
    error instanceof SyntaxError ||
    error instanceof TypeError
  )
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
