import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export default function AnalyticsModal({ onClose }) {
  const { works } = useData();
  const { isAdmin } = useAuth();

  const stats = useMemo(() => {
    const totalTasks = works.length;
    const completedTasks = works.filter(w => w.completed).length;
    const overdueTasks = works.filter(w => w.status === 'Overdue' && !w.completed).length;
    const urgentTasks = works.filter(w => w.status === 'Urgent' && !w.completed).length;
    const pendingTasks = works.filter(w => !w.completed && !w.rejected && !w.returned).length;
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const byUser = {};
    works.forEach(w => {
      const key = w.assignedTo || 'unassigned';
      if (!byUser[key]) {
        byUser[key] = {
          id: key,
          name: w.assignedName || 'Unassigned',
          total: 0, completed: 0, pending: 0, overdue: 0, urgent: 0
        };
      }
      const u = byUser[key];
      u.total++;
      if (w.completed) u.completed++;
      if (!w.completed && !w.rejected && !w.returned) u.pending++;
      if (w.status === 'Overdue' && !w.completed) u.overdue++;
      if (w.status === 'Urgent' && !w.completed) u.urgent++;
    });

    const userStats = Object.values(byUser).map(u => {
      const rate = u.total ? Math.round((u.completed / u.total) * 100) : 0;
      let statusClass, statusLabel;
      if (u.total === 0) {
        statusClass = 'idle';       statusLabel = '🟢 Available';
      } else if (u.overdue > 0) {
        statusClass = 'overloaded'; statusLabel = '🔴 Overdue';
      } else if (u.pending > 3) {
        statusClass = 'busy';       statusLabel = '🟡 Busy';
      } else if (u.pending === 0 && u.completed > 0) {
        statusClass = 'balanced';   statusLabel = '✅ All done - Available';
      } else if (rate > 70) {
        statusClass = 'balanced';   statusLabel = '✅ On Track';
      } else {
        statusClass = 'busy';       statusLabel = '🟡 Working';
      }
      return { ...u, rate, statusClass, statusLabel };
    });

    userStats.sort((a, b) => b.total - a.total);

    return {
      totalTasks, completedTasks, overdueTasks, urgentTasks, pendingTasks,
      completionRate, userStats
    };
  }, [works]);

  if (!isAdmin) {
    return (
      <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <h3>
            <span>Team Analytics</span>
            <button className="close" onClick={onClose}>&times;</button>
          </h3>
          <p>⚠️ Only admins can view team analytics.</p>
        </div>
      </div>
    );
  }

  const { userStats, totalTasks, completedTasks, overdueTasks, urgentTasks,
          pendingTasks, completionRate } = stats;

  const maxTasks = Math.max(...userStats.map(u => u.total), 1);

  const availableUsers = userStats.filter(
    us => us.total === 0 || (us.pending === 0 && us.completed > 0)
  );
  const overloadedUsers = userStats.filter(us => us.overdue > 0 || us.pending > 3);
  const topPerformers = userStats
    .filter(us => us.rate >= 70 && us.total > 0)
    .sort((a, b) => b.rate - a.rate);

  let insightMessage, insightType;
  if (overdueTasks > 0) {
    insightMessage = `⚠️ ${overdueTasks} overdue task(s) need immediate attention.`;
    insightType = 'danger';
  } else if (urgentTasks > 0) {
    insightMessage = `⚠️ ${urgentTasks} urgent task(s) require focus.`;
    insightType = 'warning';
  } else if (availableUsers.length > 0 && totalTasks > 0) {
    insightMessage = `💡 ${availableUsers.length} team member(s) are available for new tasks.`;
    insightType = 'info';
  } else if (completionRate > 80 && totalTasks > 5) {
    insightMessage = `🎉 Great team performance! ${completionRate}% completion rate. Keep up the excellent work!`;
    insightType = 'success';
  } else if (pendingTasks > 0 && completionRate < 50) {
    insightMessage = `📊 ${pendingTasks} pending tasks. Completion rate is ${completionRate}%. Team may need additional support.`;
    insightType = 'warning';
  } else {
    insightMessage = `📊 Team is working well. ${totalTasks} tasks, ${completionRate}% completed. Keep it up!`;
    insightType = 'info';
  }

  const insightColors = {
    success: '#16a34a', warning: '#f59e0b', danger: '#dc2626', info: '#2563eb'
  };

  return (
    <div className="modal-overlay analytics-modal active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 900 }}>
        <h3>
          <span><i className="fas fa-chart-pie" style={{ color: '#8b5cf6' }} /> Team Performance Dashboard</span>
          <button className="close" onClick={onClose}>&times;</button>
        </h3>

        <div className="analytics-summary">
          <div className="analytics-summary-item"><div className="num blue">{totalTasks}</div><div className="label">Total Tasks</div></div>
          <div className="analytics-summary-item"><div className="num green">{completedTasks}</div><div className="label">Completed</div></div>
          <div className="analytics-summary-item"><div className="num red">{overdueTasks}</div><div className="label">Overdue</div></div>
          <div className="analytics-summary-item"><div className="num yellow">{urgentTasks}</div><div className="label">⚠️ Urgent</div></div>
          <div className="analytics-summary-item"><div className="num purple">{completionRate}%</div><div className="label">Completion Rate</div></div>
          <div className="analytics-summary-item"><div className="num blue">{pendingTasks}</div><div className="label">Pending Tasks</div></div>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h4><i className="fas fa-users" style={{ color: '#2563eb' }} /> Workload &amp; Availability</h4>
            <div style={{ marginTop: 8 }}>
              {userStats.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No data</p>
              ) : userStats.map(us => {
                const pct = Math.max((us.total / maxTasks) * 100, 5);
                const level = pct < 30 ? 'low' : pct < 60 ? 'medium' : 'high';
                return (
                  <div key={us.id} className="workload-bar-item">
                    <span className="wl-name">{us.name}</span>
                    <div className="wl-track">
                      <div className={`wl-fill ${level}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="wl-count">{us.total}</span>
                    <span className={`wl-status ${us.statusClass}`}>{us.statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-card">
            <h4><i className="fas fa-trophy" style={{ color: '#f59e0b' }} /> Performance Metrics</h4>
            <div style={{ marginTop: 8 }}>
              {userStats.map(us => {
                const rateColor = us.rate >= 70 ? 'green' : us.rate >= 40 ? 'yellow' : 'red';
                return (
                  <div key={us.id}>
                    <div className="stat-row">
                      <span className="name">{us.name}</span>
                      <span className="value">
                        {us.completed}/{us.total} done
                        <span style={{
                          marginLeft: 8, fontWeight: 600,
                          color: us.rate >= 70 ? '#16a34a' : us.rate >= 40 ? '#f59e0b' : '#dc2626'
                        }}>
                          {us.rate}%
                        </span>
                        {us.overdue > 0 && <span className="badge-danger" style={{ marginLeft: 4 }}>{us.overdue} overdue</span>}
                        {us.urgent > 0 && <span className="badge-warning" style={{ marginLeft: 4 }}>{us.urgent} urgent</span>}
                        {us.total > 0 && us.pending === 0 && us.completed > 0 && (
                          <span className="badge-success" style={{ marginLeft: 4 }}>✅ Available</span>
                        )}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className={`fill ${rateColor}`} style={{ width: `${Math.max(us.rate, 5)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {availableUsers.length > 0 && (
            <div className="analytics-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <h4><i className="fas fa-check-circle" style={{ color: '#16a34a' }} /> Available Team Members</h4>
              <div style={{ marginTop: 8 }}>
                {availableUsers.map(us => (
                  <div key={us.id} className="stat-row">
                    <span className="name">{us.name}</span>
                    <span className="badge-success">
                      {us.total === 0 ? '🟢 No tasks - Available' : '✅ All tasks completed - Available'}
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                  💡 These team members can take on new work
                </div>
              </div>
            </div>
          )}

          {overloadedUsers.length > 0 && (
            <div className="analytics-card" style={{ borderLeft: '4px solid #dc2626' }}>
              <h4><i className="fas fa-exclamation-triangle" style={{ color: '#dc2626' }} /> Overloaded Team Members</h4>
              <div style={{ marginTop: 8 }}>
                {overloadedUsers.map(us => (
                  <div key={us.id} className="stat-row">
                    <span className="name">{us.name}</span>
                    <span className="badge-danger">
                      ⚠️ {us.pending} pending, {us.overdue} overdue
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                  💡 Consider redistributing work to balance the team
                </div>
              </div>
            </div>
          )}

          {topPerformers.length > 0 && (
            <div className="analytics-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <h4><i className="fas fa-star" style={{ color: '#8b5cf6' }} /> Top Performers</h4>
              <div style={{ marginTop: 8 }}>
                {topPerformers.slice(0, 3).map(us => (
                  <div key={us.id} className="stat-row">
                    <span className="name">{us.name}</span>
                    <span className="badge-success">🌟 {us.rate}% completion rate</span>
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                  🏆 These team members are consistently delivering on time
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 16, padding: 16,
          background: `${insightColors[insightType]}10`,
          borderRadius: 12,
          borderLeft: `4px solid ${insightColors[insightType]}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.5rem' }}>🧠</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>AI Insight:</span>
            <span style={{ color: '#475569' }}>{insightMessage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}