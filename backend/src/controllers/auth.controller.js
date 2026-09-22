import crypto from 'crypto';
import { q } from '../config/db.js';
import { hash, compare } from '../utils/hash.js';
import { sign } from '../utils/jwt.js';

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const { rows } = await q('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'This email is not registered. Contact the admin.' });
  if (!user.is_active) return res.status(401).json({ error: 'Your account is disabled. Contact the admin.' });

  const ok = await compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password' });

  const token = sign({ id: user.id, email: user.email, role: user.role, name: user.name });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPrimary: user.is_primary,
      mustChangePassword: user.must_change_password
    }
  });
}

export async function me(req, res) {
  const { rows } = await q(
    `SELECT id, name, email, phone, role, is_primary AS "isPrimary",
            must_change_password AS "mustChangePassword"
     FROM users WHERE id=$1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}

export async function register(req, res) {
  const { name, email, phone, role = 'user' } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const exists = await q('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)', [email]);
  if (exists.rowCount) return res.status(409).json({ error: 'Email already registered' });

  const tempPassword = crypto.randomUUID().slice(0, 10) + 'Aa1!';
  const password_hash = await hash(tempPassword);

  const { rows } = await q(
    `INSERT INTO users (name, email, phone, role, password_hash, must_change_password)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, name, email, phone, role, is_primary AS "isPrimary"`,
    [name, email, phone || null, role, password_hash]
  );

  res.status(201).json({ user: rows[0], tempPassword });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const { rows } = await q('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);

  // Always return success to avoid leaking which emails exist
  if (!rows[0]) return res.json({ ok: true });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await q(
    `INSERT INTO password_resets (token, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [token, rows[0].id, expiresAt]
  );

  const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password?token=${token}`;
  console.log(`🔑 Password reset link for ${email}: ${resetUrl}`);

  // Look up user's name for a personal greeting
  const { rows: nameRows } = await q('SELECT name FROM users WHERE id=$1', [rows[0].id]);
  const userName = nameRows[0]?.name || 'there';

  const { sendMail } = await import('../utils/mailer.js');
  const mail = await sendMail({
    to: email,
    subject: `Password Reset Requested for Your MoICT WorkTracker Account`,
    text:
      `Dear ${userName},\n\n` +
      `We received a request to reset the password for your MoICT WorkTracker account (${email}).\n\n` +
      `To set a new password, click this link (valid 15 minutes):\n${resetUrl}\n\n` +
      `If you did NOT request this, you can safely ignore this email — your password will not change.\n\n` +
      `— MoICT WorkTracker\n` +
      `Ministry of Information, Communications & the Digital Economy`,
    html:
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto;">` +
      `<p>Dear <b>${userName}</b>,</p>` +
      `<p>We received a request to reset the password for your <b>MoICT WorkTracker</b> account.</p>` +
      `<table style="margin:16px 0;border-collapse:collapse;background:#f8fafc;border-radius:8px;">` +
      `<tr><td style="padding:8px 14px;color:#64748b;">Account:</td><td style="padding:8px 14px;font-weight:600;">${email}</td></tr>` +
      `<tr><td style="padding:8px 14px;color:#64748b;">Link valid:</td><td style="padding:8px 14px;font-weight:600;">15 minutes</td></tr>` +
      `</table>` +
      `<p style="text-align:center;margin:24px 0;">` +
      `<a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Set New Password</a>` +
      `</p>` +
      `<p style="color:#64748b;font-size:12px;">If the button doesn't work, copy this link:</p>` +
      `<p style="color:#2563eb;font-size:12px;word-break:break-all;">${resetUrl}</p>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />` +
      `<p style="color:#64748b;font-size:12px;">If you did <b>not</b> request this, you can safely ignore this email — your password will not change.</p>` +
      `<p style="color:#94a3b8;font-size:11px;margin-top:16px;">MoICT WorkTracker · Ministry of Information, Communications &amp; the Digital Economy</p>` +
      `</div>`
  });

  res.json({ ok: true, resetUrl, emailSent: mail.ok });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  const { rows } = await q(
    `SELECT user_id FROM password_resets
     WHERE token=$1 AND used=FALSE AND expires_at > NOW()`,
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired token' });

  const password_hash = await hash(password);
  await q('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, rows[0].user_id]);
  await q('UPDATE password_resets SET used=TRUE WHERE token=$1', [token]);

  res.json({ ok: true });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const { rows } = await q('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  const ok = await compare(currentPassword, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  const password_hash = await hash(newPassword);
  await q(
    'UPDATE users SET password_hash=$1, must_change_password=TRUE WHERE id=$2',
    [password_hash, req.params.id]
  );

  res.json({ ok: true });
}