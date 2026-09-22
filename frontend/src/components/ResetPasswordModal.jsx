import { useState } from 'react';
import { authService } from '../services/authService';

export default function ResetPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  async function sendReset() {
    const e = email.trim().toLowerCase();
    setError(''); setSuccess('');
    if (!e) return setError('Please enter your email');

    setSending(true);
    try {
      await authService.forgotPassword(e);
      setSuccess(`✅ Reset link sent to ${e}. Check your inbox (valid 15 minutes).`);
      setTimeout(onClose, 4000);
    } catch (err) {
      setError('❌ ' + (err.message || 'Failed to send'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="reset-modal active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="reset-card">
        <h3><i className="fas fa-key" style={{ color: '#2563eb' }} /> Reset Password</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Enter your email to receive a password reset link
        </p>
        <div className="input-group">
          <i className="fas fa-envelope" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="reset-error">{error}</div>
        <div className="reset-success">{success}</div>
        <button className="btn-reset" onClick={sendReset} disabled={sending}>
          <i className="fas fa-paper-plane" /> {sending ? 'Sending…' : 'Send Reset Link'}
        </button>
        <button className="close-reset" onClick={onClose}>
          <i className="fas fa-times" /> Cancel
        </button>
      </div>
    </div>
  );
}