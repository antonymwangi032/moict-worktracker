import { documentsService } from '../../services/documentsService';

export default function DocumentModal({ work, onClose }) {
    const url = work.documentPath ? documentsService.fileUrl(work.documentPath) : null;
    const type = work.documentType || '';

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 800 }}>
                <h3>
                    <span>Document: {work.documentName || 'Attached File'}</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div style={{ textAlign: 'center', padding: 20 }}>
                    {!url ? (
                        <p style={{ color: '#94a3b8' }}>No document attached.</p>
                    ) : type.startsWith('image/') ? (
                        <img src={url} alt={work.documentName} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
                    ) : type === 'application/pdf' ? (
                        <iframe src={url} title={work.documentName} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />
                    ) : (
                        <div style={{ padding: 40, background: '#f8fafc', borderRadius: 12 }}>
                            <i className="fas fa-file" style={{ fontSize: '4rem', color: '#2563eb', display: 'block', marginBottom: 16 }} />
                            <p style={{ fontWeight: 600 }}>{work.documentName}</p>
                            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>File type: {type || 'Unknown'}</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {url && (
                        <a className="btn-primary" href={url} download={work.documentName}>
                            <i className="fas fa-download" /> Download
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}