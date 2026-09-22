import { useCallback, useEffect, useState } from 'react';
import { usersService } from '../../services/usersService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PRIMARY_ADMIN_EMAIL } from '../../utils/constants';

export default function UserModal({ onClose }) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user' });
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);

  const isPrimary = (me?.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  const reload = useCallback(async () => {
    try { setUsers(await usersService.list()); }
    catch (e) { showToast('❌ ' + e.message, 'error'); }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const iv = setInterval(() => { reload(); }, 30000);
    return () => clearInterval(iv);
  }, [reload]);

  const admins = users.filter(u => u.role === 'admin');
  const regular = users.filter(u => u.role === 'user');

  async function addUser() {
    if (!form.name || !form.email || !form.phone) {
      return showToast('⚠️ Please fill in name, email, and phone', 'error');
    }
    if (!/^\d+$/.test(form.phone)) {
      return showToast('⚠️ Phone must contain only digits', 'error');
    }
    setAdding(true);
    try {
      const res = await usersService.create(form);
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setResult({
        html: (
          <>
            <strong>{form.name}</strong> ({form.email}) added as <strong>{form.role}</strong>.<br />
            {res.emailSent
              ? <>📧 <b>Set-password email sent</b> to {form.email}.<br /></>
              : <>⚠️ <b>Email could not be sent</b> — share the temp password manually.<br /></>}
            🔑 Temporary password: <code>{res.tempPassword}</code><br />
            Added at <strong>{now}</strong>.
          </>
        )
      });
      setForm({ name: '', email: '', phone: '', role: 'user' });
      reload();
      showToast('✅ User created', 'success');
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function promote(u) {
    if (!confirm('Promote this user to Admin?')) return;
    try {
      await usersService.updateRole(u.id, 'admin');
      await reload();
      showToast(`✅ ${u.name} promoted to Admin`, 'success');
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  }

  async function demote(u) {
    if (!isPrimary) return showToast('⚠️ Only the Primary Admin can demote other admins', 'error');
    if (!confirm(`Demote ${u.name} to regular user?`)) return;
    try {
      await usersService.updateRole(u.id, 'user');
      await reload();
      showToast(`✅ ${u.name} demoted to User`, 'success');
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  }

  async function remove(u) {
    if (u.email.toLowerCase() === me.email.toLowerCase()) {
      return showToast('⚠️ Cannot delete yourself', 'error');
    }
    if (u.role === 'admin' && !isPrimary) {
      return showToast('⚠️ Only the Primary Admin can delete other admins', 'error');
    }
    if (!confirm(`Delete ${u.name} (${u.email})? This also removes their assigned work.`)) return;
    try {
      await usersService.remove(u.id);
      await reload();
      showToast('✅ User deleted successfully', 'success');
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
  }

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>
          <span>User &amp; Admin Management</span>
          <button className="close" onClick={onClose}>&times;</button>
        </h3>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontWeight: 500, fontSize: '0.9rem', color: '#475569' }}>Add New User</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.name} placeholder="John Doe"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} placeholder="user@example.com"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input value={form.phone} placeholder="0712345678"
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn-success-sm" onClick={addUser} disabled={adding}>
            <i className="fas fa-user-plus" /> {adding ? 'Adding…' : 'Add User'}
          </button>
        </div>

        {result && (
          <div style={{
            marginTop: 12, padding: '12px 16px',
            background: '#dcfce7', borderRadius: 12,
            fontSize: '0.85rem', color: '#166534',
            borderLeft: '4px solid #16a34a', position: 'relative'
          }}>
            <i className="fas fa-check-circle" /> {result.html}
            <button
              onClick={() => setResult(null)}
              style={{
                position: 'absolute', top: 8, right: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#166534', fontSize: '1rem'
              }}
            >&times;</button>
          </div>
        )}

        <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />

        <div className="admin-list-container">
          <h4><i className="fas fa-user-shield" style={{ color: '#7c3aed' }} /> Administrators</h4>
          {admins.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 8 }}>
              No admins
            </div>
          ) : admins.map(a => {
            const isPrimaryRow = (a.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
            return (
              <div key={a.id} className="admin-item">
                <div>
                  <span className="admin-name">{a.name} {isPrimaryRow ? '👑' : ''}</span>{' '}
                  <span className="admin-email">{a.email}</span>
                  {isPrimaryRow && (
                    <span style={{
                      fontSize: '0.6rem', background: '#fef3c7', color: '#92400e',
                      padding: '1px 8px', borderRadius: 10, marginLeft: 6
                    }}>Primary</span>
                  )}
                </div>
                <div className="admin-actions">
                  {!isPrimaryRow && (
                    <>
                      <button className="btn-demote" onClick={() => demote(a)}>Demote to User</button>
                      <button className="btn-remove-admin" onClick={() => remove(a)}>Remove</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />

        <div>
          <h4 style={{ fontWeight: 500, fontSize: '0.9rem', color: '#475569', marginBottom: 8 }}>
            <i className="fas fa-users" style={{ color: '#2563eb' }} /> Regular Users
          </h4>
          <div className="user-list">
            {regular.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 8 }}>
                No regular users
              </div>
            ) : regular.map(u => (
              <div key={u.id} className="user-item">
                <div>
                  <strong>{u.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 4px' }}>{u.email}</span>
                  {u.phone && <span style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 4px' }}>📱 {u.phone}</span>}
                  <span className="role-badge user">user</span>
                </div>
                <div>
                  <button className="btn-promote" onClick={() => promote(u)}>Promote to Admin</button>
                  <button className="btn-danger" style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={() => remove(u)}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}