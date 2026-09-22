import { q } from '../config/db.js';

export async function listByWork(req, res) {
  const { workId } = req.query;
  if (!workId) return res.status(400).json({ error: 'workId is required' });

  const { rows } = await q(
    `SELECT id,
            work_id       AS "workId",
            author_id     AS "authorId",
            author_name   AS "authorName",
            text, type,
            is_admin      AS "isAdmin",
            created_at    AS "timestamp"
     FROM comments
     WHERE work_id=$1
     ORDER BY created_at ASC`,
    [workId]
  );
  res.json(rows);
}

export async function create(req, res) {
  const { workId, text, type } = req.body;
  if (!workId || !text) return res.status(400).json({ error: 'workId and text required' });

  const isAdmin = req.user.role === 'admin';
  const authorName = isAdmin ? 'MoICT Admin' : req.user.name;

  const { rows } = await q(
    `INSERT INTO comments (work_id, author_id, author_name, text, type, is_admin)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id,
               work_id      AS "workId",
               author_id    AS "authorId",
               author_name  AS "authorName",
               text, type,
               is_admin     AS "isAdmin",
               created_at   AS "timestamp"`,
    [workId, req.user.id, authorName, text, type || 'comment', isAdmin]
  );
  res.status(201).json(rows[0]);
}