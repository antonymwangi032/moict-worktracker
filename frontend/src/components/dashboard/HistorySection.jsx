import { formatDateDisplay } from '../../utils/dateUtils';

export default function HistorySection({ works, userId, onViewDoc }) {
  const history = works.filter(
    w => w.assignedTo === userId &&
      (w.completed || w.submitted || w.rejected || w.returned || w.resubmitted)
  );

  return (
    <div className="history-section">
      <h3><i className="fas fa-history" /> Your Work History</h3>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
          <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: 10, display: 'block' }} />
          <p>No work history yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Ref</th><th>Title</th><th>Due</th><th>Status</th>
                <th>Updated</th><th>Document</th>
              </tr>
            </thead>
            <tbody>
              {history.map(w => {
                const updated = w.completionDate || w.submissionDate || w.updatedAt || w.assignedDate;
                return (
                  <tr key={w.id}>
                    <td><strong>{w.ref}</strong></td>
                    <td>{w.title}</td>
                    <td>{formatDateDisplay(w.dueDate)}</td>
                    <td>
                      <span className={`status-badge ${(w.status || '').toLowerCase().replace(/ /g, '')}`}>
                        {w.status}
                      </span>
                    </td>
                    <td>{updated ? formatDateDisplay(updated) : '-'}</td>
                    <td>
                      {(w.documentPath || w.documentData) ? (
                        <span className="document-link" onClick={() => onViewDoc(w)}>
                          <i className="fas fa-file-pdf" /> {w.documentName || 'Document'}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}