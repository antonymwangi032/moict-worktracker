import { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function DocResponseModal({ doc, onClose }) {
    const { addDocResponse, addNotification } = useData();
    const { showToast } = useToast();
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef();

    async function submit() {
        if (!text.trim()) return showToast('⚠️ Please write a response', 'error');
        setBusy(true);
        try {
            await addDocResponse({ docId: doc.id, text, file });
            addNotification(
                `📄 Document Response: ${doc.title}`,
                `New response on "${doc.title}"`,
                'document',
                null
            );
            showToast('✅ Response submitted', 'success');
            onClose();
        } catch (e) {
            showToast('❌ ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 600 }}>
                <h3>
                    <span><i className="fas fa-reply" style={{ color: '#2563eb' }} /> Respond to Document</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    <p><strong>Document:</strong> {doc.title}</p>
                    {doc.description && <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{doc.description}</p>}
                </div>

                <div className="form-group">
                    <label>Your Response *</label>
                    <textarea value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 100 }} required />
                </div>

                <div className="form-group">
                    <label>Attach File (Optional)</label>
                    <div className="file-upload-area" onClick={() => fileRef.current?.click()}>
                        <i className="fas fa-cloud-upload-alt" />
                        <p>Click to select a file</p>
                        {file && <div className="file-name show">📎 {file.name}</div>}
                        <input
                            ref={fileRef} type="file" style={{ display: 'none' }}
                            onChange={e => e.target.files[0] && setFile(e.target.files[0])}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                        />
                    </div>
                </div>

                <button className="btn-success" onClick={submit} disabled={busy}>
                    <i className="fas fa-paper-plane" /> {busy ? 'Sending…' : 'Send Response'}
                </button>
            </div>
        </div>
    );
}