import { q } from '../config/db.js';

const SELECT_COLS = `
  id, ref, title, description,
  received_date       AS "receivedDate",
  assigned_date       AS "assignedDate",
  assigned_to         AS "assignedTo",
  assigned_name       AS "assignedName",
  mobile, 
  due_date            AS "dueDate",
  priority, remarks, status,
  completed, submitted, rejected, returned, resubmitted,
  in_review           AS "inReview",
  submission_details  AS "submissionDetails",
  submission_remarks  AS "submissionRemarks",
  return_reason       AS "returnReason",
  document_path       AS "documentPath",
  document_name       AS "documentName",
  document_type       AS "documentType",
  document_size       AS "documentSize",
  reminder_sent_date  AS "reminderSentDate",
  completion_date     AS "completionDate",
  rejected_date       AS "rejectedDate",
  returned_date       AS "returnedDate",
  resubmitted_date    AS "resubmittedDate",
  submission_date     AS "submissionDate",
  updated_at          AS "updatedAt",
  created_at          AS "createdAt"
`;

export async function list(req, res) {
  const isAdmin = req.user.role === 'admin';
  const sql = isAdmin
    ? `SELECT ${SELECT_COLS} FROM works ORDER BY created_at DESC`
    : `SELECT ${SELECT_COLS} FROM works WHERE assigned_to=$1 ORDER BY created_at DESC`;
  const params = isAdmin ? [] : [req.user.id];
  const { rows } = await q(sql, params);
  res.json(rows);
}

export async function getOne(req, res) {
  const { rows } = await q(`SELECT ${SELECT_COLS} FROM works WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Work not found' });

  // Non-admins may only view their own work
  if (req.user.role !== 'admin' && rows[0].assignedTo !== req.user.id) {
    return res.status(403).json({ error: 'Not your work' });
  }
  res.json(rows[0]);
}

export async function create(req, res) {
  const b = req.body;

  // Generate ref: MoICT-<year>-<seq>
  const year = b.assignedDate ? new Date(b.assignedDate).getFullYear() : new Date().getFullYear();
  const { rows: maxRows } = await q(`SELECT COALESCE(MAX(id), 100) + 1 AS next FROM works`);
  const seq = String(maxRows[0].next).padStart(4, '0');
  const ref = b.ref || `MoICT-${year}-${seq}`;

  const { rows } = await q(
    `INSERT INTO works
      (ref, title, description, received_date, assigned_date,
       assigned_to, assigned_name, mobile, due_date, priority, remarks, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${SELECT_COLS}`,
    [
      ref, b.title, b.description || null,
      b.receivedDate || null, b.assignedDate || null,
      b.assignedTo || null, b.assignedName || null, b.mobile || null,
      b.dueDate || null, b.priority || 'Normal', b.remarks || null,
      b.status || 'Pending'
    ]
  );

  const work = rows[0];

  // ── Send assignment email to the user ──────────────────────────
  try {
    const { rows: urows } = await q(
      'SELECT email, name FROM users WHERE id=$1',
      [work.assignedTo]
    );
    const assignee = urows[0];
    if (assignee && assignee.email) {
      const adminName = req.user?.name || 'MoICT Administrator';
      const daysLeft = daysUntil(work.dueDate);
      const { sendMail } = await import('../utils/mailer.js');
      await sendMail({
        to: assignee.email,
        subject: `📋 New Work Assigned: ${work.ref} — ${work.title}`,
        text: buildAssignmentText(work, adminName, daysLeft),
        html: buildAssignmentHtml(work, adminName, daysLeft)
      });
      console.log(`📧 Assignment email sent to ${assignee.email} for ${work.ref}`);
    }
  } catch (e) {
    console.error('📧 Assignment email failed:', e.message);
  }

  res.status(201).json(work);
}

// ── Email helpers ────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function dueText(daysLeft) {
  if (daysLeft === null) return 'Not set';
  if (daysLeft < 0) return `Overdue by ${Math.abs(daysLeft)} day(s)`;
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `In ${daysLeft} days`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildAssignmentText(w, adminName, daysLeft) {
  return (
    `Dear ${w.assignedName || 'Team Member'},\n\n` +
    `A new work has been assigned to you on MoICT WorkTracker.\n\n` +
    `  Reference:      ${w.ref}\n` +
    `  Title:          ${w.title}\n` +
    `  Priority:       ${w.priority || 'Normal'}\n` +
    `  Date Assigned:  ${fmtDate(w.assignedDate)}\n` +
    `  Due Date:       ${fmtDate(w.dueDate)}  (${dueText(daysLeft)})\n` +
    `  Assigned by:    ${adminName}\n\n` +
    (w.description ? `Description:\n${w.description}\n\n` : '') +
    (w.remarks ? `Remarks: ${w.remarks}\n\n` : '') +
    `Please log in to MoICT WorkTracker to view the full details.\n\n` +
    `— MoICT WorkTracker\n` +
    `Ministry of Information, Communications & the Digital Economy`
  );
}

function buildAssignmentHtml(w, adminName, daysLeft) {
  const priority = (w.priority || 'Normal').toLowerCase();
  const badge = priority === 'high'
    ? 'background:#fee2e2;color:#dc2626;'
    : priority === 'low'
      ? 'background:#f1f5f9;color:#475569;'
      : 'background:#dbeafe;color:#1e3a8a;';

  const dueColor = daysLeft !== null && daysLeft < 0 ? '#dc2626'
    : daysLeft !== null && daysLeft <= 1 ? '#f59e0b'
      : '#1e293b';

  const row = (label, val, color) =>
    `<tr><td style="padding:8px 14px;color:#64748b;">${label}</td>` +
    `<td style="padding:8px 14px;font-weight:600;${color ? 'color:' + color + ';' : ''}">${val}</td></tr>`;

  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;">` +
    `<p>Dear <b>${w.assignedName || 'Team Member'}</b>,</p>` +
    `<p>A new work has been assigned to you on <b>MoICT WorkTracker</b>.</p>` +
    `<table style="margin:16px 0;border-collapse:collapse;background:#f8fafc;border-radius:8px;width:100%;">` +
    row('Reference', w.ref) +
    row('Title', w.title) +
    row('Priority', `<span style="padding:2px 10px;border-radius:12px;font-size:12px;${badge}">${w.priority || 'Normal'}</span>`) +
    row('Date Assigned', fmtDate(w.assignedDate)) +
    row('Due Date', `${fmtDate(w.dueDate)} &nbsp;<span style="color:${dueColor};">(${dueText(daysLeft)})</span>`) +
    row('Assigned by', adminName) +
    `</table>` +
    (w.description
      ? `<p style="margin:16px 0 4px;"><b>Description:</b></p>` +
      `<div style="background:#f8fafc;border-left:4px solid #2563eb;padding:12px 16px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(w.description)}</div>`
      : '') +
    (w.remarks
      ? `<p style="margin:16px 0 4px;"><b>Remarks:</b></p>` +
      `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(w.remarks)}</div>`
      : '') +
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />` +
    `<p style="color:#94a3b8;font-size:11px;">MoICT WorkTracker · Ministry of Information, Communications &amp; the Digital Economy</p>` +
    `</div>`
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ── Deadline Reminder email ─────────────────────────────────────
export async function sendDeadlineReminders(req, res) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { rows } = await q(
    `SELECT ${SELECT_COLS} FROM works
     WHERE due_date = $1
       AND completed = FALSE
       AND rejected  = FALSE
       AND returned  = FALSE
       AND (reminder_sent_date IS NULL OR reminder_sent_date <> CURRENT_DATE)`,
    [tomorrowStr]
  );

  let sent = 0;
  for (const w of rows) {
    try {
      const { rows: urows } = await q('SELECT email, name FROM users WHERE id=$1', [w.assignedTo]);
      const assignee = urows[0];
      if (!assignee || !assignee.email) continue;

      const { sendMail } = await import('../utils/mailer.js');
      const mail = await sendMail({
        to: assignee.email,
        subject: `⏰ Reminder: "${w.title}" is due tomorrow`,
        text: buildReminderText(w),
        html: buildReminderHtml(w)
      });
      if (mail.ok) {
        await q('UPDATE works SET reminder_sent_date=CURRENT_DATE WHERE id=$1', [w.id]);
        sent++;
        console.log(`📧 Reminder sent to ${assignee.email} for ${w.ref}`);
      }
    } catch (e) {
      console.error(`📧 Reminder failed for ${w.ref}:`, e.message);
    }
  }

  res.json({ ok: true, sent, checked: rows.length });
}

function buildReminderText(w) {
  return (
    `Dear ${w.assignedName || 'Team Member'},\n\n` +
    `Friendly reminder: the following work is due tomorrow.\n\n` +
    `  Reference:  ${w.ref}\n` +
    `  Title:      ${w.title}\n` +
    `  Priority:   ${w.priority || 'Normal'}\n` +
    `  Due:        Tomorrow (${fmtDate(w.dueDate)})\n\n` +
    `Please log in to MoICT WorkTracker and submit it on time.\n\n` +
    `— MoICT WorkTracker`
  );
}

function buildReminderHtml(w) {
  const priority = (w.priority || 'Normal').toLowerCase();
  const badge = priority === 'high'
    ? 'background:#fee2e2;color:#dc2626;'
    : priority === 'low'
      ? 'background:#f1f5f9;color:#475569;'
      : 'background:#dbeafe;color:#1e3a8a;';

  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;">` +
    `<p>Dear <b>${w.assignedName || 'Team Member'}</b>,</p>` +
    `<p>Friendly reminder — the following work is <b style="color:#f59e0b;">due tomorrow</b>:</p>` +
    `<table style="margin:16px 0;border-collapse:collapse;background:#fffbeb;border-radius:8px;width:100%;">` +
    `<tr><td style="padding:8px 14px;color:#64748b;">Reference</td><td style="padding:8px 14px;font-weight:600;">${w.ref}</td></tr>` +
    `<tr><td style="padding:8px 14px;color:#64748b;">Title</td><td style="padding:8px 14px;font-weight:600;">${w.title}</td></tr>` +
    `<tr><td style="padding:8px 14px;color:#64748b;">Priority</td><td style="padding:8px 14px;"><span style="padding:2px 10px;border-radius:12px;font-size:12px;${badge}">${w.priority || 'Normal'}</span></td></tr>` +
    `<tr><td style="padding:8px 14px;color:#64748b;">Due</td><td style="padding:8px 14px;font-weight:700;color:#f59e0b;">Tomorrow (${fmtDate(w.dueDate)})</td></tr>` +
    `</table>` +
    `<p>Please log in to MoICT WorkTracker and submit it on time.</p>` +
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />` +
    `<p style="color:#94a3b8;font-size:11px;">MoICT WorkTracker · Ministry of Information, Communications &amp; the Digital Economy</p>` +
    `</div>`
  );
}

export async function update(req, res) {
  const b = req.body;
  const { rows } = await q(
    `UPDATE works SET
       title=$1, description=$2, received_date=$3, assigned_date=$4,
       assigned_to=$5, assigned_name=$6, mobile=$7, due_date=$8,
       priority=$9, remarks=$10, status=$11, updated_at=NOW()
     WHERE id=$12
     RETURNING ${SELECT_COLS}`,
    [
      b.title, b.description || null,
      b.receivedDate || null, b.assignedDate || null,
      b.assignedTo || null, b.assignedName || null, b.mobile || null,
      b.dueDate || null, b.priority || 'Normal', b.remarks || null,
      b.status || 'Pending', req.params.id
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Work not found' });
  res.json(rows[0]);
}

export async function remove(req, res) {
  await q('DELETE FROM works WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}

// Called for submit / resubmit / approve / reject / return
export async function setState(req, res) {
  const b = req.body;
  const { rows: existing } = await q(`SELECT ${SELECT_COLS} FROM works WHERE id=$1`, [req.params.id]);
  const w = existing[0];
  if (!w) return res.status(404).json({ error: 'Work not found' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = w.assignedTo === req.user.id;

  const action = b.action; // 'submit' | 'resubmit' | 'approve' | 'reject' | 'return' | 'advise' | 'feedback'

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  // Build the update
  const patch = {};
  const d = b.dates || {};

  if (action === 'submit') {
    if (!isOwner) return res.status(403).json({ error: 'Only the assignee can submit' });
    Object.assign(patch, {
      submitted: true, submitted_by: req.user.id,
      submission_details: b.submissionDetails || null,
      submission_remarks: b.submissionRemarks || null,
      submission_date: d.submission || new Date().toISOString().slice(0, 10),
      status: 'Submitted', in_review: true,
      rejected: false, returned: false, resubmitted: false
    });
  } else if (action === 'resubmit') {
    if (!isOwner) return res.status(403).json({ error: 'Only the assignee can resubmit' });
    Object.assign(patch, {
      submitted: true, resubmitted: true,
      resubmitted_date: d.resubmitted || new Date().toISOString().slice(0, 10),
      returned: false, rejected: false,
      status: 'Resubmitted', in_review: true,
      submission_details: b.submissionDetails || null,
      submission_remarks: b.submissionRemarks || null,
      submitted_by: req.user.id
    });
  } else if (action === 'approve') {
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    Object.assign(patch, {
      completed: true,
      completion_date: d.completion || new Date().toISOString().slice(0, 10),
      status: 'Completed', in_review: false,
      rejected: false, returned: false, resubmitted: false
    });
  } else if (action === 'reject') {
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    Object.assign(patch, {
      rejected: true,
      rejected_date: d.rejected || new Date().toISOString().slice(0, 10),
      status: 'Rejected', in_review: false,
      completed: false, submitted: false, resubmitted: false
    });
  } else if (action === 'return') {
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    Object.assign(patch, {
      returned: true,
      returned_date: d.returned || new Date().toISOString().slice(0, 10),
      status: 'Returned', in_review: false,
      completed: false, submitted: false, resubmitted: false,
      return_reason: b.returnReason || null
    });
  } else {
    return res.status(400).json({ error: 'Unknown action' });
  }

  // Build update query dynamically
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
  const values = keys.map(k => patch[k]);
  values.push(req.params.id);

  const { rows } = await q(
    `UPDATE works SET ${sets}, updated_at=NOW() WHERE id=$${values.length}
     RETURNING ${SELECT_COLS}`,
    values
  );

  res.json(rows[0]);
}