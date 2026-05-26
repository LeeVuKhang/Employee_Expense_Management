import { notificationApiRoutes } from '../routes'
import { clearAuthStorage, getAuthToken } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function requestNotifications(path, options = {}) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    clearAuthStorage()
    window.location.href = '/login'
    return null
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail ?? errorBody.message ?? 'Failed to load notifications.')
  }

  return response.json()
}

export async function fetchNotifications() {
  const notifications = await requestNotifications(notificationApiRoutes.list)
  return (notifications ?? []).map(toNotificationViewModel)
}

export async function markNotificationRead(notificationId) {
  const notification = await requestNotifications(notificationApiRoutes.markRead(notificationId), {
    method: 'PATCH',
  })
  return toNotificationViewModel(notification)
}

export async function markAllNotificationsRead() {
  const notifications = await requestNotifications(notificationApiRoutes.markAllRead, {
    method: 'PATCH',
  })
  return (notifications ?? []).map(toNotificationViewModel)
}

function toNotificationViewModel(notification) {
  return {
    id: String(notification.id),
    employeeId: notification.employeeId ?? notification.employee_id,
    requestId: notification.requestId ?? notification.request_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.isRead ?? notification.is_read),
    createdAt: notification.createdAt ?? notification.created_at,
  }
}
