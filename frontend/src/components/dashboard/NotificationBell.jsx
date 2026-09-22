import { useState } from 'react';
import { formatDateTime } from '../../utils/dateUtils';

const LABELS = {
  submission: '📤 Submitted', approval: '✅ Approved', return: '↩️ Returned',
  reject: '❌ Rejected', resubmit: '📤 Resubmitted', feedback: '📝 Feedback',
  comment: '💬 Comment', document: '📄 Document'
};

export default function NotificationBell({ notifications, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-container">
      <div className="notification-bell" onClick={() => setOpen(o => !o)}>
        <i className="fas fa-bell bell-icon" />
        <span className="bell-label">Alerts</span>
        {unread > 0 && <span className="badge show">{unread}</span>}
      </div>

      {open && (
        <div className="notification-dropdown show">
          <div className="notification-header">
            <span>🔔 Notifications</span>
            <span className="mark-read" onClick={onMarkAllRead}>Mark all as read</span>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <i className="fas fa-check-circle" style={{ color: '#16a34a' }} />
                <p>All caught up! No new notifications.</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                <div className="notif-title">
                  <span className={`notif-badge ${n.type}`}>
                    {LABELS[n.type] || '📌 Update'}
                  </span>
                  {n.title}
                </div>
                <div className="notif-desc">{n.description}</div>
                <div className="notif-time">{formatDateTime(n.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}