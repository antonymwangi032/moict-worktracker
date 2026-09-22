import { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { documentsService } from '../../services/documentsService';
import { formatDateTime } from '../../utils/dateUtils';

export default function ViewDocModal({ doc, onClose }) {
    const { loadResponsesFor } = useData();
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [textContent, setTextContent] = useState(null);

    const url = documentsService.fileUrl(doc.storagePath);
    const type = doc.fileType || '';

    useEffect(() => {
        (async () => {
            try {
                const list = await loadResponsesFor(doc.id);
                setResponses(list);
            } catch { }
            setLoading(false);
        })();
    }, [doc.id, loadResponsesFor]);

    // Fetch text content for .txt files
    useEffect(() => {
        if (type === 'text/plain' && url) {
            fetch(url)
                .then(r => r.text())
                .then(t => setTextContent(t))
                .catch(() => setTextContent('Unable to load file.'));
        }
    }, [type, url]);

    // Decide file category
    const isImage = type.startsWith('image/');
    const isPdf = type === 'application/pdf';
    const isText = type === 'text/plain';
    const isOffice =
        type.includes('word') ||
        type.includes('excel') ||
        type.includes('powerpoint') ||
        type.includes('officedocument') ||
        type.includes('msword') ||
        type.includes('vnd.ms-') ||
        type === 'application/msword';

    // Detect whether we're on localhost (Office viewer can't reach localhost)
    const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1');

    // Build Office viewer URL
    const officeViewerUrl = url
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
        : null;

    function renderPreview() {
        if (!url) return <div className="doc-text-preview"><div className="doc-placeholder"><i className="fas fa-exclamation-triangle" /><p>No file URL available.</p></div></div>;

        // 1) Images
        if (isImage) {
            return <img src={url} alt={doc.title} />;
        }

        // 2) PDF
        if (isPdf) {
            return <iframe src={url} title={doc.title} />;
        }

        // 3) Plain text
        if (isText) {
            return (
                <div className="doc-text-preview">
                    {textContent === null
                        ? <div className="doc-placeholder"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>
                        : <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0 }}>{textContent}</pre>
                    }
                </div>
            );
        }

        // 4) Word / Excel / PowerPoint
        if (isOffice) {
            // Microsoft's viewer can't reach localhost — show a friendly card instead
            if (isLocalhost) {
                return (
                    <div className="doc-text-preview">
                        <div className="doc-placeholder">
                            <i className="fas fa-file-powerpoint" style={{ color: '#dc2626' }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 8 }}>{doc.fileName}</p>
                            <p style={{ color: '#94a3b8', marginTop: 8, fontSize: '0.9rem' }}>
                                Preview will be available once the system is deployed.
                                <br />Click <b>Download</b> below to open the file now.
                            </p>
                        </div>
                    </div>
                );
            }
            // Production: real Office preview
            return <iframe src={officeViewerUrl} title={doc.title} />;
        }

        // 5) Fallback
        return (
            <div className="doc-text-preview">
                <div className="doc-placeholder">
                    <i className="fas fa-file" style={{ color: '#8b5cf6' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 8 }}>{doc.fileName}</p>
                    <p style={{ color: '#94a3b8', marginTop: 8 }}>
                        Preview not available for this file type.
                        <br />Click <b>Download</b> below to open it.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>
                    <span>{doc.title}</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div className="doc-viewer-container">
                    {renderPreview()}

                    {loading ? (
                        <p style={{ padding: 12, color: '#94a3b8' }}>Loading responses…</p>
                    ) : responses.length > 0 && (
                        <div className="doc-responses">
                            <h5><i className="fas fa-comments" /> Responses ({responses.length})</h5>
                            {responses.map(r => (
                                <div key={r.id} className="doc-response-item">
                                    <div className="resp-header">
                                        <span className="resp-author">{r.userName}</span>
                                        <span>{formatDateTime(r.timestamp)}</span>
                                    </div>
                                    <div className="resp-text">{r.text}</div>
                                    {r.fileStoragePath && (
                                        <div className="resp-file">
                                            <a className="document-link" href={documentsService.fileUrl(r.fileStoragePath)} target="_blank" rel="noreferrer">
                                                <i className="fas fa-paperclip" /> {r.fileName}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {url && (
                        <a className="btn-primary" href={url} download={doc.fileName}>
                            <i className="fas fa-download" /> Download
                        </a>
                    )}
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}