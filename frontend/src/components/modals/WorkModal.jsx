import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { usersService } from '../../services/usersService';
import { computeStatus, todayStr, formatDateDisplay } from '../../utils/dateUtils';
import { validateDates } from '../../utils/validators';

const EMPTY = {
    title: '', description: '', receivedDate: '', assignedDate: '',
    assignedTo: '', mobile: '', dueDate: '', priority: 'Normal', remarks: ''
};

export default function WorkModal({ work, onClose }) {
    const { createWork, updateWork, addNotification, emailConfig } = useData();
    const { showToast } = useToast();
    const [form, setForm] = useState(EMPTY);
    const [users, setUsers] = useState([]);
    const [errors, setErrors] = useState({ title: false, person: false, due: false });
    const [saving, setSaving] = useState(false);

    const today = todayStr();

    useEffect(() => {
        usersService.regular().then(setUsers).catch(() => setUsers([]));
        if (work) {
            setForm({
                title: work.title || '', description: work.description || '',
                receivedDate: work.receivedDate || '', assignedDate: work.assignedDate || '',
                assignedTo: work.assignedTo || '', mobile: work.mobile || '',
                dueDate: work.dueDate || '', priority: work.priority || 'Normal',
                remarks: work.remarks || ''
            });
        } else {
            setForm(EMPTY);
        }
    }, [work]);

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

    function handleAssignee(id) {
        const u = usersService.getUserById(users, id);
        setForm(f => ({ ...f, assignedTo: id, mobile: u?.phone || '' }));
    }

    const urgency = useMemo(() => {
        if (!form.dueDate) return null;
        const now = new Date(today);
        const due = new Date(form.dueDate);
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return { cls: 'urgent', text: '⚠️ This task is <strong>OVERDUE</strong>!' };
        }
        if (diffDays <= 3) {
            return {
                cls: 'urgent',
                text: `⚠️ This task will be marked as <strong>URGENT</strong> (due in ${diffDays} day${diffDays > 1 ? 's' : ''})`
            };
        }
        return { cls: 'normal', text: `This task is due in ${diffDays} days - not urgent` };
    }, [form.dueDate, today]);

    async function submit(e) {
        e.preventDefault();

        const dateErr = validateDates({
            received: form.receivedDate, assigned: form.assignedDate, due: form.dueDate
        });
        if (dateErr) return showToast('⚠️ ' + dateErr, 'error');

        const next = {
            title: !form.title.trim(),
            person: !form.assignedTo,
            due: !form.dueDate
        };
        setErrors(next);
        if (next.title || next.person || next.due) {
            return showToast('⚠️ Please fix the errors in the form', 'error');
        }

        const assignedUser = usersService.getUserById(users, form.assignedTo);
        if (!assignedUser) return showToast('❌ Please select a valid user', 'error');

        setSaving(true);
        try {
            if (work) {
                const status = computeStatus({ ...work, ...form });
                const updated = await updateWork(work.id, {
                    ...form,
                    assignedName: assignedUser.name,
                    mobile: assignedUser.phone || form.mobile,
                    assignedDate: form.assignedDate || form.receivedDate || todayStr(),
                    status
                });
                if (status === 'Urgent') {
                    showToast(`🚨 URGENT: "${updated.title}" is due in 3 days or less!`, 'error');
                } else {
                    showToast('✅ Work updated!', 'success');
                }
            } else {
                const payload = {
                    ...form,
                    assignedName: assignedUser.name,
                    mobile: assignedUser.phone || form.mobile,
                    assignedDate: form.assignedDate || form.receivedDate || todayStr(),
                    status: computeStatus(form)
                };
                const created = await createWork(payload);

                addNotification(
                    `📋 New Work Assigned: ${created.ref}`,
                    `"${created.title}" assigned to ${assignedUser.name}`,
                    'submission',
                    created.id
                );

                sendEmail(
                    emailConfig,
                    assignedUser.email,
                    `📋 New Work Assigned: ${created.ref}`,
                    `Dear ${assignedUser.name},\n\nA new work has been assigned to you:\n\nTitle: ${created.title}\nRef: ${created.ref}\nDate Assigned: ${formatDateDisplay(created.assignedDate)}\nDue Date: ${formatDateDisplay(created.dueDate)}\nPriority: ${created.priority}\n\nPlease check the system for full details.\n\nBest regards,\nMoICT Admin Team`,
                    created.ref
                ).catch(() => { });

                if (created.status === 'Urgent') {
                    showToast(`🚨 URGENT: "${created.title}" is due in 3 days or less! Email notification sent.`, 'error');
                } else {
                    showToast(`✅ Work assigned to ${assignedUser.name}! Email notification sent.`, 'success');
                }
            }
            onClose();
        } catch (err) {
            showToast('❌ ' + (err.message || 'Save failed'), 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h3>
                    <span>{work ? 'Edit Work' : 'Assign New Work'}</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <form onSubmit={submit} noValidate>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. Submit Report"
                        />
                        {errors.title && <div className="field-error show">Please enter a title</div>}
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            style={{ minHeight: 100 }}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Date Received</label>
                            <input
                                type="date" max={today}
                                value={form.receivedDate}
                                onChange={e => set('receivedDate', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date Assigned</label>
                            <input
                                type="date" max={today}
                                value={form.assignedDate}
                                onChange={e => set('assignedDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Assign To *</label>
                            <select value={form.assignedTo} onChange={e => handleAssignee(e.target.value)}>
                                <option value="">Select User</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                            {errors.person && <div className="field-error show">Please select a user</div>}
                        </div>
                        <div className="form-group">
                            <label>Mobile</label>
                            <input value={form.mobile} readOnly placeholder="Auto-filled from user" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Due Date *</label>
                            <input
                                type="date" min={today}
                                value={form.dueDate}
                                onChange={e => set('dueDate', e.target.value)}
                            />
                            {errors.due && <div className="field-error show">Please select a due date</div>}
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                                <option>Normal</option><option>High</option><option>Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Remarks</label>
                        <input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any notes" />
                    </div>

                    {urgency && (
                        <div className={`urgency-indicator show ${urgency.cls}`}>
                            <i className="fas fa-info-circle" />{' '}
                            <span dangerouslySetInnerHTML={{ __html: urgency.text }} />
                        </div>
                    )}

                    <button type="submit" className="btn-success" disabled={saving}>
                        <i className="fas fa-save" /> {saving ? 'Saving…' : 'Assign Work'}
                    </button>
                </form>

                <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#475569' }}>
                    <i className="fas fa-envelope" style={{ color: '#2563eb' }} /> User will receive email notification
                </div>
            </div>
        </div>
    );
}