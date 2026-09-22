import { computeStatus, formatDateDisplay } from '../../utils/dateUtils';

export default function WorkTable({
  works, isAdmin, currentUser, comments,
  filter, setFilter, search, setSearch, onClear, onAction
}) {
  const withLiveStatus = works.map(w => ({ ...w, liveStatus: computeStatus(w) }));

  const filtered = withLiveStatus
    .filter(w => {
      if (!isAdmin && w.assignedTo !== currentUser?.id) return false;
      if (filter && filter !== 'all' && w.liveStatus !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hit =
          (w.ref || '').toLowerCase().includes(s) ||
          (w.title || '').toLowerCase().includes(s) ||
          (w.assignedName || '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.liveStatus === 'Urgent' && b.liveStatus !== 'Urgent') return -1;
      if (b.liveStatus === 'Urgent' && a.liveStatus !== 'Urgent') return 1;
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      return 0;
    });

  return (
    <div className="card-table">
      <div className="table-header">
        <h2>
          <i className="fas fa-list-ul" style={{ color: '#2563eb' }} /> Work Items{' '}
          <span className="filter-badge">
            {filter && filter !== 'all' ? filter : 'All'}
          </span>
        </h2>
        <div className="search-box">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{ minWidth: 170 }}
          />
          <select
            value={filter === 'all' ? '' : filter}
            onChange={e => setFilter(e.target.value || 'all')}
          >
            <option value="">All</option>
            <option value="Overdue">Overdue</option>
            <option value="Due Today">Due Today</option>
            <option value="Due Tomorrow">Due Tomorrow</option>
            <option value="Urgent">Urgent</option>
            <option value="Approaching Deadline">Approaching</option>
            <option value="Submitted">Submitted</option>
            <option value="In Review">In Review</option>
            <option value="Returned">Returned</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
          <button className="btn-secondary" onClick={onClear}>
            <i className="fas fa-times" /> Clear
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Work</th>
              <th>Assigned</th>
              <th>Mobile</th>
              <th>Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="no-work-message">
                    <i className={`fas ${isAdmin ? 'fa-tasks' : 'fa-inbox'}`} />
                    <h3>{isAdmin ? 'No Tasks Found' : 'No Work Assigned'}</h3>
                    <p>
                      {isAdmin
                        ? 'No tasks match your current filter.'
                        : "You don't have any tasks assigned to you at the moment."}
                    </p>
                    {!isAdmin && (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8 }}>
                        Check back later or contact your administrator.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : filtered.map(w => {
              const statusClass = (w.liveStatus || '').toLowerCase().replace(/ /g, '');
              const workComments = comments.filter(c => c.workId === w.id);

              const rowClass = w.liveStatus === 'Urgent'
                ? 'urgent-row'
                : (!isAdmin && w.assignedTo === currentUser?.id ? 'assigned-to-me' : '');

              let titleDisplay = w.title || '';
              if (w.liveStatus === 'Urgent') titleDisplay = `🚨 ${titleDisplay}`;
              if (w.returned)                titleDisplay = `↩️ ${titleDisplay}`;
              if (w.resubmitted)             titleDisplay = `📤 ${titleDisplay}`;

              return (
                <tr key={w.id} className={rowClass}>
                  <td><strong>{w.ref || 'N/A'}</strong></td>

                  <td>
                    {titleDisplay}
                    {(w.documentPath || w.documentData) && (
                      <i
                        className="fas fa-paperclip"
                        style={{ color: '#8b5cf6', fontSize: '0.7rem', marginLeft: 4 }}
                        title="Document attached"
                      />
                    )}
                    {workComments.length > 0 && (
                      <span
                        style={{
                          background: '#8b5cf6', color: 'white', borderRadius: '50%',
                          padding: '0 6px', fontSize: '0.6rem', fontWeight: 700,
                          marginLeft: 4
                        }}
                      >
                        {workComments.length}
                      </span>
                    )}
                    {w.returned && <span className="resubmit-badge">↩️ Returned</span>}
                  </td>

                  <td>{w.assignedName || ''}</td>
                  <td>{w.mobile || ''}</td>
                  <td>{formatDateDisplay(w.dueDate)}</td>
                  <td>
                    <span className={`status-badge ${statusClass}`}>{w.liveStatus}</span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <i
                      className="fas fa-eye action-icon"
                      onClick={() => onAction('view', w)}
                      title="View Details & Comments"
                    />

                    {isAdmin && !w.completed && (w.submitted || w.resubmitted) && (
                      <i
                        className="fas fa-check-circle action-icon approve"
                        onClick={() => onAction('approve', w)}
                        title="Approve Submission"
                      />
                    )}
                    {isAdmin && !w.completed && !w.submitted && !w.resubmitted && (
                      <i
                        className="fas fa-edit action-icon"
                        onClick={() => onAction('edit', w)}
                        title="Edit"
                      />
                    )}
                    {isAdmin && (
                      <i
                        className="fas fa-trash action-icon"
                        style={{ color: '#b91c1c' }}
                        onClick={() => onAction('delete', w)}
                        title="Delete"
                      />
                    )}

                    {(w.documentPath || w.documentData) && (
                      <>
                        <i
                          className="fas fa-eye action-icon"
                          style={{ color: '#2563eb' }}
                          onClick={() => onAction('viewDoc', w)}
                          title="View Document"
                        />
                        <i
                          className="fas fa-download action-icon"
                          style={{ color: '#8b5cf6' }}
                          onClick={() => onAction('downloadDoc', w)}
                          title="Download Document"
                        />
                      </>
                    )}

                    {!isAdmin && w.assignedTo === currentUser?.id && (
                      <>
                        {w.returned && (
                          <i
                            className="fas fa-undo action-icon resubmit"
                            style={{ color: '#f59e0b' }}
                            onClick={() => onAction('resubmit', w)}
                            title="Resubmit Work"
                          />
                        )}
                        {!w.completed && !w.submitted && !w.rejected && !w.returned && !w.resubmitted && (
                          <i
                            className="fas fa-paper-plane action-icon"
                            style={{ color: '#2563eb' }}
                            onClick={() => onAction('submit', w)}
                            title="Submit Work"
                          />
                        )}
                        {w.submitted && !w.completed && !w.rejected && !w.returned && (
                          <span className="submission-status">⏳ Pending Review</span>
                        )}
                        {w.rejected && (
                          <span className="submission-status" style={{ color: '#dc2626' }}>
                            ❌ Rejected
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b', textAlign: 'right' }}>
        {filtered.length === 0
          ? (isAdmin ? 'No tasks found' : 'No tasks assigned')
          : `Showing ${filtered.length} of ${works.length} items`}
      </div>
    </div>
  );
}