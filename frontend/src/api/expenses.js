import { expenseApiRoutes } from '../routes'

const CURRENT_USER_ID = import.meta.env.VITE_CURRENT_USER_ID ?? '4'

async function requestExpense(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(CURRENT_USER_ID),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail ?? `Request failed with ${response.status}`)
  }

  return response.json()
}

export async function fetchExpenseRequest(expenseId) {
  const expense = await requestExpense(expenseApiRoutes.detail(expenseId))
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
