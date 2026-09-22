import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export default function ResetPasswordPage() {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token') || '';
        setToken(t);
        if (!t) setError('Missing reset token. Please use the link from your email.');
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 8) return setError('Password must be at least 8 characters.');
        if (password !== confirm) return setError('Passwords do not match.');

        setSubmitting(true);
        try {
            await authService.resetPassword(token, password);
            setSuccess('✅ Password set successfully! Redirecting to login…');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } catch (err) {
            setError('❌ ' + (err.message || 'Reset failed'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="logo"><i className="fas fa-key" /></div>
                <h1>Set Your <span>Password</span></h1>
                <div className="subtitle">MoICT WorkTracker</div>

                {!token ? (
                    <div className="error">{error}</div>
                ) : (
                    <form onSubmit={handleSubmit} autoComplete="off">
                        <div className="input-group">
                            <i className="fas fa-lock" />
                            <input
                                type="password"
                                placeholder="New password (min 8 chars)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <i className="fas fa-lock" />
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        {error && <div className="error">{error}</div>}
                        {success && <div className="success">{success}</div>}

                        <button type="submit" className="btn-login" disabled={submitting}>
                            <i className="fas fa-save" /> {submitting ? 'Saving…' : 'Set Password'}
                        </button>
                    </form>
                )}

                <div className="divider" />
                <a href="/" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none' }}>
                    ← Back to Login
                </a>
            </div>
        </div>
    );
}