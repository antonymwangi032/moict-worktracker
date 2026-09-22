import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ResetPasswordModal from './ResetPasswordModal';

export default function LoginCard() {
  const { login } = useAuth();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await login(email.trim(), password.trim(), role);
      setSuccess('✅ Login successful! Loading your data…');
    } catch (err) {
      setError('❌ ' + (err.message || 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          <div className="logo"><i className="fas fa-robot" /></div>
          <h1>MoICT <span>WorkTracker</span></h1>
          <div className="subtitle">
            Ministry of Information, Communications &amp; the Digital Economy
          </div>
          <div className="motto">
            <i className="fas fa-check-circle" style={{ color: '#2563eb' }} /> All Work Matters · Nothing will be lost
          </div>

          <div className="login-role-selector">
            <button
              type="button"
              className={`login-role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => setRole('admin')}
            >
              <i className="fas fa-user-shield" /> Admin
            </button>
            <button
              type="button"
              className={`login-role-btn ${role === 'user' ? 'active' : ''}`}
              onClick={() => setRole('user')}
            >
              <i className="fas fa-user" /> User
            </button>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <i className="fas fa-envelope" />
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <i className="fas fa-lock" />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className={`login-role-badge ${role}`}>
              {role === 'admin' ? 'Admin Login' : 'User Login'}
            </div>
            <div className="error">{error}</div>
            <div className="success">{success}</div>

            <button type="submit" className="btn-login" disabled={submitting}>
              <i className="fas fa-arrow-right-to-bracket" />{' '}
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <button className="forgot-link" type="button" onClick={() => setShowReset(true)}>
            <i className="fas fa-key" /> Forgot password?
          </button>
          <div className="divider" />
          <div className="footer-note">🔐 Only registered emails can login</div>
        </div>
      </div>

      {showReset && <ResetPasswordModal onClose={() => setShowReset(false)} />}
    </>
  );
}