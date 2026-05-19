export const expenseRoutes = {
  list: '/expenses',
  detail: (requestId = ':requestId') => `/expenses/${requestId}`,
  edit: (requestId = ':requestId') => `/expenses/${requestId}/edit`,
  duplicate: (requestId = ':requestId') => `/expenses/${requestId}/duplicate`,
}

export const legacyRequestRoutes = {
  detail: (requestId = ':requestId') => `/requests/${requestId}`,
  edit: (requestId = ':requestId') => `/requests/${requestId}/edit`,
  duplicate: (requestId = ':requestId') => `/requests/${requestId}/duplicate`,
}

export const expenseApiRoutes = {
  list: '/api/expenses',
  detail: (expenseId) => `/api/expenses/${expenseId}`,
  cancel: (expenseId) => `/api/expenses/${expenseId}/cancel`,
  duplicate: (expenseId) => `/api/expenses/${expenseId}/duplicate`,
}
