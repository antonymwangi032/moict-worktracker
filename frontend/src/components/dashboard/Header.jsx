import NotificationBell from './NotificationBell';

export default function Header({
  user, isAdmin, counts,
  onUrgent, onAnalytics, onManageUsers, onNewWork, onUploadDoc, onLogout,
  notifications, onMarkAllRead
}) {
  return (
    <div className="header">
      <h1><i className="fab fa-whatsapp" /> MoICT WorkTracker</h1>

      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px 20px',
          background: '#f8fafc', padding: '8px 20px', borderRadius: 40
        }}
      >
        <span><i className="far fa-clock" /> Total: <span>{counts.total}</span></span>
        <span><i className="fas fa-exclamation-triangle" /> Overdue: <span>{counts.overdue}</span></span>
        <span><i className="fas fa-calendar-day" /> Today: <span>{counts.today}</span></span>
        <span>
          <i className="fas fa-exclamation-circle" style={{ color: '#dc2626' }} /> Urgent:{' '}
          <span>{counts.urgent}</span>
        </span>
        <span>
          <i className="fas fa-comments" style={{ color: '#8b5cf6' }} /> Comments:{' '}
          <span>{counts.comments}</span>
        </span>
      </div>

      <div className="header-actions">
        <span className={isAdmin ? 'admin-badge' : 'user-badge'}>
          <i className={`fas ${isAdmin ? 'fa-user-shield' : 'fa-user'}`} />{' '}
          {user?.name} {isAdmin ? '(Admin)' : ''}
        </span>

        {isAdmin && (
          <>
            <button className="btn-urgent-action" onClick={onUrgent}>
              <i className="fas fa-exclamation-triangle" /> Urgent ({counts.urgent})
            </button>
            <button className="btn-analytics" onClick={onAnalytics}>
              <i className="fas fa-chart-pie" /> Team Analytics
            </button>
            <button className="btn-secondary" onClick={onManageUsers}>
              <i className="fas fa-users-cog" /> Manage Users
            </button>
            <button className="btn-primary" onClick={onNewWork}>
              <i className="fas fa-plus-circle" /> New Work
            </button>
            <button className="btn-upload-doc" onClick={onUploadDoc}>
              <i className="fas fa-cloud-upload-alt" /> Upload Document
            </button>
            <NotificationBell
              notifications={notifications}
              onMarkAllRead={onMarkAllRead}
            />
          </>
        )}

        <button className="btn-secondary" onClick={onLogout}>
          <i className="fas fa-sign-out-alt" /> Logout
        </button>
      </div>
    </div>
  );
}