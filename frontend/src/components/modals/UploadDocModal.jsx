import { useEffect, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { usersService } from '../../services/usersService';

export default function UploadDocModal({ onClose }) {
    const { uploadDocument, addNotification } = useData();
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [shareAll, setShareAll] = useState(false);
    const [selected, setSelected] = useState([]);
    const [users, setUsers] = useState([]);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        usersService.regular().then(setUsers).catch(() => setUsers([]));
    }, []);

    function toggleUser(id) {
        setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    }

    function handleFile(f) {
        if (!f) return;
        if (f.size > 20 * 1024 * 1024) return showToast('❌ File exceeds 20MB', 'error');
        setFile(f);
    }

    async function submit() {
        if (!title.trim()) return showToast('⚠️ Please enter a title', 'error');
        if (!file) return showToast('⚠️ Please select a file', 'error');
        if (!shareAll && selected.length === 0) {
            return showToast('⚠️ Select at least one user or "Share with ALL"', 'error');
        }
        setBusy(true);
        try {
            await uploadDocument({
                title, description, file,
                shareAll,
                selectedUsers: shareAll ? [] : selected
            });
            (shareAll ? users : users.filter(u => selected.includes(u.id))).forEach(() => {
                addNotification(
                    `📄 New Document: ${title}`,
                    `"${title}" has been shared with you${shareAll ? ' (all users)' : ''}`,
                    'document'
                );
            });
            showToast('✅ Document uploaded', 'success');
            onClose();
        } catch (e) {
            showToast('❌ ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>
                    <span><i className="fas fa-cloud-upload-alt" style={{ color: '#8b5cf6' }} /> Upload Document</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div className="form-group">
                    <label>Document Title *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ICT Policy Document" />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: 80 }} />
                </div>

                <div className="form-group">
                    <label>Upload File *</label>
                    <div className="file-upload-area" onClick={() => fileRef.current?.click()}>
                        <i className="fas fa-cloud-upload-alt" />
                        <p>Drag &amp; drop a file here, or click to select</p>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PDF, Word, Excel, Images (Max 20MB)</p>
                        {file && <div className="file-name show">📎 {file.name}</div>}
                        <input
                            ref={fileRef} type="file" style={{ display: 'none' }}
                            onChange={e => handleFile(e.target.files[0])}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.ppt,.pptx"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Share With</label>
                    <div className="user-checkbox-list">
                        <div className="select-all-checkbox">
                            <input
                                type="checkbox" id="shareAll"
                                checked={shareAll}
                                onChange={e => setShareAll(e.target.checked)}
                            />
                            <label htmlFor="shareAll" style={{ color: '#7c3aed' }}>
                                <i className="fas fa-globe" /> Share with ALL Users
                            </label>
                        </div>
                        {users.map(u => (
                            <div key={u.id} className="user-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(u.id)}
                                    disabled={shareAll}
                                    onChange={() => toggleUser(u.id)}
                                />
                                <label>
                                    {u.name}
                                    <span className="user-email"> {u.email}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="btn-success" onClick={submit} disabled={busy}>
                    <i className="fas fa-upload" /> {busy ? 'Uploading…' : 'Upload & Share'}
                </button>
            </div>
        </div>
    );
}