import { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateDisplay, formatDateTime } from '../../utils/dateUtils';
import { documentsService } from '../../services/documentsService';

const ACTION_BADGES = {
    approve: '<span class="action-badge approved">✅ Approved</span>',
    reject: '<span class="action-badge rejected">❌ Rejected</span>',
    advice: '<span class="action-badge advice">💡 Advice</span>',
    feedback: '<span class="action-badge feedback">📝 Feedback</span>',
    comment: '<span class="action-badge comment">💬 Comment</span>',
    return: '<span class="action-badge returned">↩️ Returned</span>',
    resubmit: '<span class="action-badge resubmitted">📤 Resubmitted</span>'
};

export default function WorkDetailModal({ work, onClose }) {
    const { isAdmin } = useAuth();
    const { comments, loadCommentsForWork, addComment, setWorkState, addNotification } = useData();
    const { showToast } = useToast();
    const [text, setText] = useState('');

    useEffect(() => {
        loadCommentsForWork(work.id).catch(() => { });
    }, [work.id, loadCommentsForWork]);

    const thread = comments
        .filter(c => c.workId === work.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    async function send(type) {
        const t = text.trim();
        if (!t) return showToast('⚠️ Please write a message', 'error');
        try {
            const actionMap = {
                comment: null, approve: 'approve', reject: 'reject',
                return: 'return', advice: null, feedback: null, resubmit: 'resubmit'
            };
            const action = actionMap[type];
            if (action) {
                await setWorkState(work.id, { action });
                addNotification(
                    `Work ${type}: ${work.ref}`,
                    `"${work.title}" was ${type}ed`,
                    type === 'approve' ? 'approval' : type,
                    work.id
                );
            }
            await addComment({ workId: work.id, text: t, type });
            showToast('✅ Sent', 'success');
            setText('');
            if (type === 'approve' || type === 'reject' || type === 'return') {
                setTimeout(onClose, 1200);
            }
        } catch (e) {
            showToast('❌ ' + e.message, 'error');
        }
    }

    const docUrl = work.documentPath ? documentsService.fileUrl(work.documentPath) : null;

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>
                    <span>{work.ref} - {work.title}</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8fafc', padding: 16, borderRadius: 12 }}>
                    <div><strong>Ref:</strong> {work.ref}</div>
                    <div>
                        <strong>Status:</strong>{' '}
                        <span className={`status-badge ${(work.status || '').toLowerCase().replace(/ /g, '')}`}>
                            {work.status}
                        </span>
                    </div>
                    <div><strong>Assigned To:</strong> {work.assignedName}</div>
                    <div><strong>Mobile:</strong> {work.mobile || '-'}</div>
                    <div><strong>Due Date:</strong> {formatDateDisplay(work.dueDate)}</div>
                    <div><strong>Priority:</strong> {work.priority || 'Normal'}</div>
                    <div style={{ gridColumn: '1/3' }}><strong>📄 Description:</strong></div>
                    <div style={{ gridColumn: '1/3' }}>
                        <div className="work-description">
                            <div className="desc-text">{work.description || 'No description'}</div>
                        </div>
                    </div>
                    {work.remarks && <div style={{ gridColumn: '1/3' }}><strong>📌 Remarks:</strong> {work.remarks}</div>}
                    {work.submissionDetails && (
                        <div style={{ gridColumn: '1/3' }}>
                            <strong>📤 Submission Details:</strong>
                            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                {work.submissionDetails}
                            </div>
                        </div>
                    )}
                    {work.returnReason && (
                        <div style={{ gridColumn: '1/3', background: '#fef3c7', padding: 10, borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                            <strong>↩️ Return Reason:</strong> {work.returnReason}
                        </div>
                    )}
                    {docUrl && (
                        <div style={{ gridColumn: '1/3' }}>
                            <strong>📎 Document:</strong>{' '}
                            <a className="document-link" href={docUrl} target="_blank" rel="noreferrer">
                                <i className="fas fa-file-pdf" /> {work.documentName || 'Download'}
                            </a>
                        </div>
                    )}
                </div>

                <div className="comments-section">
                    <h4><i className="fas fa-comments" style={{ color: '#8b5cf6' }} /> Conversation ({thread.length})</h4>
                    <div className="comment-thread">
                        {thread.length === 0 ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                                No comments yet. Start the conversation below.
                            </p>
                        ) : thread.map(c => {
                            const cls = c.isAdmin ? 'admin-comment' : 'user-comment';
                            const author = c.isAdmin ? `${c.authorName} 👑` : c.authorName;
                            const tag = c.isAdmin ? '<span class="admin-tag">Admin</span>' : '<span class="user-tag">User</span>';
                            const badge = ACTION_BADGES[c.type] || ACTION_BADGES.comment;
                            return (
                                <div key={c.id} className={`comment-item ${cls}`}>
                                    <div className="comment-header">
                                        <span className="comment-author" dangerouslySetInnerHTML={{ __html: `${author} ${tag} ${badge}` }} />
                                        <span className="comment-date">{formatDateTime(c.timestamp)}</span>
                                    </div>
                                    <div className="comment-text">{c.text}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="comment-input-area">
                        <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write your message here..." />
                        <div className="input-actions">
                            <button className="btn-send" onClick={() => send('comment')}><i className="fas fa-comment" /> Send</button>
                            {isAdmin && (
                                <>
                                    <button className="btn-approve" onClick={() => send('approve')}><i className="fas fa-check" /> Approve</button>
                                    <button className="btn-reject" onClick={() => send('reject')}><i className="fas fa-times" /> Reject</button>
                                    <button className="btn-advise" onClick={() => send('advice')}><i className="fas fa-lightbulb" /> Advise</button>
                                    <button className="btn-feedback" onClick={() => send('feedback')}><i className="fas fa-comment-dots" /> Feedback</button>
                                    <button className="btn-return" onClick={() => send('return')}><i className="fas fa-undo" /> Return</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}