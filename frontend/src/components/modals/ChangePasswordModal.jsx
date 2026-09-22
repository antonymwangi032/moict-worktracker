import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';

export default function ChangePasswordModal({ onClose }) {
    const { showToast } = useToast();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setError('');

        if (!current || !next || !confirm) return setError('Please fill in all fields');
        if (next.length < 6) return setError('New password must be at least 6 characters');
        if (next !== confirm) return setError('New passwords do not match');
        if (next === current) return setError('New password must differ from the current one');

        setBusy(true);
        try {
            await authService.changePassword(current, next);
            showToast('✅ Password changed successfully', 'success');
            onClose();
        } catch (err) {
            setError('❌ ' + (err.message || 'Failed'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 460 }}>
                <h3>
                    <span><i className="fas fa-key" style={{ color: '#2563eb' }} /> Change Password</span>
                    <button className="close" onClick={onClose}>&times;</button>
                </h3>

                <form onSubmit={submit}>
                    <div className="form-group">
                        <label>Current Password *</label>
                        <input
                            type="password"
                            value={current}
                            onChange={e => setCurrent(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password *</label>
                        <input
                            type="password"
                            value={next}
                            onChange={e => setNext(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password *</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#dc2626', fontSize: '0.85rem',
                            marginBottom: 10, textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn-success" disabled={busy}>
                        <i className="fas fa-save" /> {busy ? 'Saving…' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}