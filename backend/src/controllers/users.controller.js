import { q } from '../config/db.js';
import { hash } from '../utils/hash.js';

export async function list(req, res) {
  const { rows } = await q(
    `SELECT id, name, email, phone, role, is_primary AS "isPrimary", created_at AS "createdAt"
     FROM users ORDER BY role DESC, name ASC`
  );
  res.json(rows);
}

export async function regular(req, res) {
  const { rows } = await q(
    `SELECT id, name, email, phone, role
     FROM users
     WHERE role='user' AND is_primary=FALSE
     ORDER BY name ASC`
  );
  res.json(rows);
}

export async function create(req, res) {
  const { name, email, phone, role = 'user', password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const exists = await q('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)', [email]);
  if (exists.rowCount) return res.status(409).json({ error: 'Email already registered' });

  const tempPassword = password || (Math.random().toString(36).slice(2, 10) + 'Aa1!');
  const password_hash = await hash(tempPassword);

  const { rows } = await q(
    `INSERT INTO users (name, email, phone, role, password_hash, must_change_password)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, name, email, phone, role, is_primary AS "isPrimary"`,
    [name, email, phone || null, role, password_hash]
  );

  const created = rows[0];

  // Generate a set-password token and email the link
  let emailSent = false;
  try {
    const crypto = await import('crypto');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await q(
      `INSERT INTO password_resets (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, created.id, expiresAt]
    );

    const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password?token=${token}`;
    console.log(`🔑 Set-password link for ${email}: ${resetUrl}`);

    const creator = req.user?.name || 'MoICT Administrator';
    const { sendMail } = await import('../utils/mailer.js');
    const mail = await sendMail({
      to: email,
      subject: `Welcome ${name} — Set Your MoICT WorkTracker Password`,
      text:
        `Dear ${name},\n\n` +
        `An account has been created for you on MoICT WorkTracker by ${creator}.\n\n` +
        `Your login email: ${email}\n\n` +
        `To activate your account, please set your password using this link (valid 24 hours):\n${resetUrl}\n\n` +
        `If you did not expect this email or have any questions, please contact ${creator} directly.\n\n` +
        `— MoICT WorkTracker\n` +
        `Ministry of Information, Communications & the Digital Economy`,
      html:
        `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto;">` +
        `<p>Dear <b>${name}</b>,</p>` +
        `<p>An account has been created for you on <b>MoICT WorkTracker</b> by <b>${creator}</b>.</p>` +
        `<table style="margin:16px 0;border-collapse:collapse;background:#f8fafc;border-radius:8px;">` +
        `<tr><td style="padding:8px 14px;color:#64748b;">Login email:</td><td style="padding:8px 14px;font-weight:600;">${email}</td></tr>` +
        `<tr><td style="padding:8px 14px;color:#64748b;">Valid for:</td><td style="padding:8px 14px;font-weight:600;">24 hours</td></tr>` +
        `</table>` +
        `<p>To activate your account, please set your password using the button below:</p>` +
        `<p style="text-align:center;margin:24px 0;">` +
        `<a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Set Your Password</a>` +
        `</p>` +
        `<p style="color:#64748b;font-size:12px;">If the button doesn't work, copy this link into your browser:</p>` +
        `<p style="color:#2563eb;font-size:12px;word-break:break-all;">${resetUrl}</p>` +
        `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />` +
        `<p style="color:#64748b;font-size:12px;">If you did not expect this email, please contact <b>${creator}</b> directly.</p>` +
        `<p style="color:#94a3b8;font-size:11px;margin-top:16px;">MoICT WorkTracker · Ministry of Information, Communications &amp; the Digital Economy</p>` +
        `</div>`
    });
    emailSent = mail.ok;
  } catch (e) {
    console.error('📧 Failed to send set-password email:', e.message);
  }

  res.status(201).json({ user: created, tempPassword, emailSent });
}

export async function updateRole(req, res) {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const { rows: target } = await q(
    'SELECT id, role, is_primary AS "isPrimary" FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found' });
  if (target[0].isPrimary) return res.status(400).json({ error: 'Primary admin cannot be modified' });
  if (target[0].id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

  // Only primary admin can demote other admins
  if (target[0].role === 'admin' && role === 'user') {
    const { rows: me } = await q('SELECT is_primary AS "isPrimary" FROM users WHERE id=$1', [req.user.id]);
    if (!me[0]?.isPrimary) {
      return res.status(403).json({ error: 'Only the Primary Admin can demote other admins' });
    }
  }

  const { rows } = await q(
    `UPDATE users SET role=$1 WHERE id=$2
     RETURNING id, name, email, phone, role, is_primary AS "isPrimary"`,
    [role, req.params.id]
  );
  res.json(rows[0]);
}

export async function remove(req, res) {
  const { rows: target } = await q(
    'SELECT id, is_primary AS "isPrimary" FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found' });
  if (target[0].isPrimary) return res.status(400).json({ error: 'Primary admin cannot be deleted' });
  if (target[0].id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  // Unassign their works
  await q(
    `UPDATE works SET assigned_to=NULL, assigned_name='(unassigned)'
     WHERE assigned_to=$1`,
    [req.params.id]
  );

  await q('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}

export async function resetUserPassword(req, res) {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const { rows: target } = await q(
    'SELECT id, is_primary AS "isPrimary" FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found' });
  if (target[0].isPrimary) return res.status(400).json({ error: 'Primary admin password cannot be reset here' });

  const password_hash = await hash(newPassword);
  await q('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, req.params.id]);

  res.json({ ok: true });
}