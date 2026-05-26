import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";

export default function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextNotifications = await fetchNotifications();
      setNotifications(nextNotifications);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0);
    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleDocumentClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isOpen]);

  async function handleNotificationClick(notification) {
    setUpdatingId(notification.id);

    try {
      if (!notification.isRead) {
        const updated = await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      }
      setIsOpen(false);
      navigate(`/requests/${notification.requestId}`);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkAllRead() {
    setUpdatingId("all");

    try {
      const updatedNotifications = await markAllNotificationsRead();
      setNotifications(updatedNotifications);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleDropdown() {
    setIsOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) {
        loadNotifications();
      }
      return nextOpen;
    });
  }

  return (
    <div className="notification-menu" ref={dropdownRef}>
      <button
        className={`notification-trigger${unreadCount > 0 ? " notification-trigger-unread" : ""}`}
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        onClick={toggleDropdown}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={updatingId === "all"}
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading && <div className="notification-state">Loading notifications...</div>}

          {!loading && error && (
            <div className="notification-state notification-error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="notification-state">No notifications yet.</div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  className={`notification-item${notification.isRead ? "" : " notification-item-unread"}`}
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  disabled={updatingId === notification.id}
                >
                  <span className="notification-item-title-row">
                    {!notification.isRead && (
                      <span className="notification-unread-dot" aria-hidden="true" />
                    )}
                    <span className="notification-item-title">
                      {notification.title}
                    </span>
                  </span>
                  <span className="notification-item-message">
                    {notification.message}
                  </span>
                  <span className="notification-item-time">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      className="notification-bell-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9.5 20a2.5 2.5 0 0 0 5 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function formatNotificationTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
