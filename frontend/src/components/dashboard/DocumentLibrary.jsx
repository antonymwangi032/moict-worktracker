import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function DocumentLibrary({ onView, onDownload, onRespond, onDelete }) {
  const { user, isAdmin } = useAuth();
  const { documents, docResponses } = useData();

  const visible = isAdmin
    ? documents
    : documents.filter(
        d =>
          d.sharedWith === 'all' ||
          (d.selectedUsers || []).includes(user?.id)
      );

  return (
    <div className="document-library">
      <h4>
        <i className="fas fa-folder-open" style={{ color: '#8b5cf6' }} /> Document Library{' '}
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>
          ({visible.length} documents)
        </span>
      </h4>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
          <i className="fas fa-file-alt" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
          <p>No documents available.</p>
        </div>
      ) : visible.map(doc => {
        const resps = docResponses.filter(r => r.docId === doc.id);
        return (
          <div key={doc.id} className="doc-item">
            <div className="doc-info">
              <span className="doc-icon"><i className="fas fa-file" /></span>
              <div className="doc-details">
                <div className="doc-name">{doc.title}</div>
                {doc.description && <div className="doc-desc">{doc.description}</div>}
                <div className="doc-meta">
                  {doc.fileName} • Uploaded by {doc.uploadedByName || doc.uploadedBy}
                  {resps.length > 0 && (
                    <span className="doc-response-badge">
                      💬 {resps.length} response{resps.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="doc-actions">
              <button className="btn-view-doc" onClick={() => onView(doc)}>
                <i className="fas fa-eye" /> View
              </button>
              <button className="btn-download-doc" onClick={() => onDownload(doc)}>
                <i className="fas fa-download" /> Download
              </button>
              {!isAdmin && (
                <button className="btn-respond-doc" onClick={() => onRespond(doc)}>
                  <i className="fas fa-reply" /> Respond
                </button>
              )}
              {isAdmin && (
                <button className="btn-delete-doc" onClick={() => onDelete(doc)}>
                  <i className="fas fa-trash" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}