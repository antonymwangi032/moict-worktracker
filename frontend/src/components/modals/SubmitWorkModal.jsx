import { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function SubmitWorkModal({ work, isResubmit, onClose }) {
    const { setWorkState, attachWorkFile, addNotification, addComment } = useData();
    const { showToast } = useToast();
    const [details, setDetails] = useState('');
    const [remarks, setRemarks] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef();

    async function submit(e) {
        e.preventDefault();
        if (!details.trim()) return showToast('⚠️ Please provide submission details', 'error');
        setBusy(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const action = isResubmit ? 'resubmit' : 'submit';

            await setWorkState(work.id, {
                action,
                submissionDetails: details,
                submissionRemarks: remarks,
                dates: isResubmit ? { resubmitted: today } : { submission: today }
            });

            if (file) await attachWorkFile(work.id, file);

            addNotification(
                isResubmit ? `📤 Work Resubmitted: ${work.ref}` : `📤 Work Submitted: ${work.ref}`,
                `"${work.title}" ${isResubmit ? 'resubmitted' : 'submitted'}`,
                isResubmit ? 'resubmit' : 'submission',
                work.id
            );

            addComment({ workId: work.id, text: details, type: action }).catch(() => { });

            showToast(isResubmit ? '📤 Resubmitted!' : '✅ Submitted!', 'success');
            onClose();
        } catch (err) {
            showToast('❌ ' + (err.message || 'Submit failed'), 'error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>
                    <span>{isResubmit ? '↩️ Resubmit Work' : '📤 Submit Work'}</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div style={{ marginBottom: 12 }}>
                    <p><strong>Ref:</strong> {work.ref}</p>
                    <p><strong>Title:</strong> {work.title}</p>
                    <p><strong>Assigned To:</strong> {work.assignedName}</p>
                    {isResubmit && work.returnReason && (
                        <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, marginTop: 8, borderLeft: '4px solid #f59e0b' }}>
                            <strong>↩️ Returned for revision</strong>
                            <p style={{ marginTop: 4, fontSize: '0.9rem', color: '#92400e' }}>{work.returnReason}</p>
                        </div>
                    )}
                </div>

                <form onSubmit={submit}>
                    <div className="form-group">
                        <label>Submission Details *</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} style={{ minHeight: 100 }} required />
                    </div>

                    <div className="form-group">
                        <label>Attach Document (Optional)</label>
                        <div className="file-upload-area" onClick={() => fileRef.current?.click()}>
                            <i className="fas fa-cloud-upload-alt" />
                            <p>Drag &amp; drop or click to select</p>
                            {file && <div className="file-name show">📎 {file.name}</div>}
                            <input
                                ref={fileRef} type="file" style={{ display: 'none' }}
                                onChange={e => e.target.files[0] && setFile(e.target.files[0])}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Additional Notes</label>
                        <input value={remarks} onChange={e => setRemarks(e.target.value)} />
                    </div>

                    <button type="submit" className="btn-success" disabled={busy}>
                        <i className="fas fa-paper-plane" /> {busy ? 'Sending…' : (isResubmit ? 'Resubmit Work' : 'Submit Work')}
                    </button>
                </form>
            </div>
        </div>
    );
}