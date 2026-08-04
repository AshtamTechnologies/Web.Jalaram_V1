import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Trash2, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle, X
} from 'lucide-react';
import { apiService } from '../api/api';

const formatTimestamp = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const getNotificationType = (title = '', message = '') => {
  const text = (title + ' ' + message).toLowerCase();
  if (text.includes('error') || text.includes('failed') || text.includes('danger')) return 'danger';
  if (text.includes('warn') || text.includes('due') || text.includes('pending')) return 'warning';
  if (text.includes('create') || text.includes('success') || text.includes('added')) return 'success';
  return 'info';
};

export default function Notification({ handleTabChange }) {
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const notifRef = useRef(null);

  // Sync notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('jalaram_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Click outside listener to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications from API on load and periodically
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const res = await apiService.getNotificationsByUser(userId);
        const list = Array.isArray(res) ? res : res?.data ?? res?.$values ?? [];
        const normalized = list.map(n => ({
          id: n.notificationId ?? n.NotificationId ?? String(Math.random()),
          title: n.title ?? n.Title ?? 'Notification',
          message: n.message ?? n.Message ?? '',
          timestamp: formatTimestamp(n.createdDate ?? n.CreatedDate),
          type: getNotificationType(n.title ?? n.Title, n.message ?? n.Message),
          read: n.isRead ?? n.IsRead ?? false,
        }));
        setNotifications(normalized);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen for 'new-notification' events dispatched dynamically in the app
  useEffect(() => {
    const handleNewNotification = (e) => {
      console.log('new-notification event received in Notification component:', e);
      const detail = e.detail || {};
      const title = detail.title || e.title;
      const message = detail.message || e.message || '';
      const type = detail.type || e.type || 'info';
      const actionTab = detail.actionTab || e.actionTab || null;

      if (title) {
        const newNotif = {
          id: Date.now().toString(),
          title,
          message,
          timestamp: 'Just now',
          type,
          read: false,
          actionTab
        };

        setNotifications((prev) => [newNotif, ...prev]);

        // Trigger visible toast notification
        setToasts((prev) => [...prev, newNotif]);
        setTimeout(() => {
          dismissToast(newNotif.id);
        }, 4000);
      } else {
        console.warn('new-notification event received, but missing title property.', e);
      }
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={15} />;
      case 'warning':
        return <AlertTriangle size={15} />;
      case 'danger':
        return <XCircle size={15} />;
      case 'info':
      default:
        return <Info size={15} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Topbar Notification Icon & Dropdown */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          className={`notif-btn ${notifOpen ? 'active' : ''}`}
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notif-badge">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <span className="notif-title">Notifications</span>
              {unreadCount > 0 && (
                <button className="notif-mark-all-btn" onClick={markAllAsRead}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="notif-body">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={32} className="notif-empty-icon" />
                  <div className="notif-empty-title">All caught up!</div>
                  <div className="notif-empty-desc">No new notifications.</div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.read ? 'read' : 'unread'} notif-type-${n.type}`}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.actionTab) {
                        handleTabChange(n.actionTab);
                        setNotifOpen(false);
                      }
                    }}
                  >
                    <div className="notif-item-left">
                      <span className="notif-indicator" />
                      <div className="notif-icon-wrap">
                        {getNotifIcon(n.type)}
                      </div>
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-message">{n.message}</div>
                      <div className="notif-item-time">{n.timestamp}</div>
                    </div>
                    <button
                      className="notif-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      title="Delete notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notif-footer">
                <button className="notif-clear-btn" onClick={clearAll}>
                  <Trash2 size={13} /> Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Toast Notifications Container */}
      {createPortal(
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast-card toast-type-${t.type}`}
              onClick={() => {
                markAsRead(t.id);
                if (t.actionTab) {
                  handleTabChange(t.actionTab);
                }
                dismissToast(t.id);
              }}
            >
              <div className="toast-icon-wrap">
                {getNotifIcon(t.type)}
              </div>
              <div className="toast-content">
                <div className="toast-title">{t.title}</div>
                <div className="toast-message">{t.message}</div>
              </div>
              <button
                className="toast-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(t.id);
                }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
