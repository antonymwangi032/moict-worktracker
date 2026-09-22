import { q } from '../config/db.js';

export async function list(req, res) {
  const { rows } = await q(
    `SELECT id, title, description, type,
            work_id   AS "workId",
            read,
            created_at AS "timestamp"
     FROM notifications
     ORDER BY created_at DESC
     LIMIT 50`
  );
  res.json(rows);
}

export async function markAllRead(_req, res) {
  await q('UPDATE notifications SET read=TRUE WHERE read=FALSE');
  res.json({ ok: true });
}

export async function create(req, res) {
  const { title, description, type, workId } = req.body;
  const { rows } = await q(
    `INSERT INTO notifications (title, description, type, work_id)
     VALUES ($1,$2,$3,$4)
     RETURNING id, title, description, type,
               work_id   AS "workId",
               read,
               created_at AS "timestamp"`,
    [title || 'Notification', description || '', type || 'submission', workId || null]
  );
  res.status(201).json(rows[0]);
}

export async function remove(req, res) {
  await q('DELETE FROM notifications WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}