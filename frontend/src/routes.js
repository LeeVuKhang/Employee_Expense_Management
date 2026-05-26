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
  attachmentDownload: (expenseId, attachmentId) =>
    `/api/expenses/${expenseId}/attachments/${attachmentId}/download-url`,
}

export const managerApiRoutes = {
  pendingRequests: '/api/manager/expense-requests/pending',
  pendingRequestsSummary: '/api/manager/expense-requests/pending/summary',
  requestDetail: (expenseId) => `/api/manager/requests/${expenseId}`,
  requestStatus: (expenseId) => `/api/manager/requests/${expenseId}/status`,
}

export const notificationApiRoutes = {
  list: '/api/notifications',
  markRead: (notificationId) => `/api/notifications/${notificationId}/read`,
  markAllRead: '/api/notifications/read-all',
}
