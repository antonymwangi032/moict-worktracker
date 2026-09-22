import fs from 'fs';
import path from 'path';
import { q } from '../config/db.js';

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');

const DOC_SELECT = `
  d.id, d.title, d.description,
  d.file_name      AS "fileName",
  d.storage_path   AS "storagePath",
  d.file_type      AS "fileType",
  d.file_size      AS "fileSize",
  d.shared_with    AS "sharedWith",
  d.uploaded_by    AS "uploadedBy",
  d.uploaded_by_name AS "uploadedByName",
  d.uploaded_at    AS "uploadedAt",
  COALESCE(
    (SELECT json_agg(ds.user_id) FROM document_shares ds WHERE ds.document_id = d.id),
    '[]'::json
  ) AS "selectedUsers"
`;

export async function list(req, res) {
  const isAdmin = req.user.role === 'admin';
  const sql = isAdmin
    ? `SELECT ${DOC_SELECT} FROM documents d ORDER BY d.uploaded_at DESC`
    : `SELECT ${DOC_SELECT} FROM documents d
       WHERE d.shared_with='all'
          OR EXISTS (
            SELECT 1 FROM document_shares ds
            WHERE ds.document_id = d.id AND ds.user_id = $1
          )
       ORDER BY d.uploaded_at DESC`;

  const params = isAdmin ? [] : [req.user.id];
  const { rows } = await q(sql, params);
  res.json(rows);
}

export async function create(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { title, description = '', shareAll = '0' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  // userIds[] may come as a single string or array
  let userIds = req.body['userIds[]'] || req.body.userIds || [];
  if (!Array.isArray(userIds)) userIds = [userIds];

  const relPath = path
    .relative(UPLOAD_ROOT, req.file.path)
    .replace(/\\/g, '/');

  const { rows } = await q(
    `INSERT INTO documents
       (title, description, file_name, storage_path, file_type, file_size,
        shared_with, uploaded_by, uploaded_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      title, description,
      req.file.originalname, relPath,
      req.file.mimetype, req.file.size,
      shareAll === '1' || shareAll === true ? 'all' : 'selected',
      req.user.id, req.user.name
    ]
  );

  const docId = rows[0].id;

  if (shareAll !== '1' && shareAll !== true && userIds.length > 0) {
    const inserts = userIds.map(uid =>
      q('INSERT INTO document_shares (document_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [docId, uid])
    );
    await Promise.all(inserts);
  }

  const { rows: full } = await q(
    `SELECT ${DOC_SELECT} FROM documents d WHERE d.id=$1`,
    [docId]
  );
  res.status(201).json(full[0]);
}

export async function remove(req, res) {
  const { rows } = await q(
    'SELECT storage_path AS "storagePath" FROM documents WHERE id=$1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Document not found' });

  // Best-effort delete from disk
  try {
    const full = path.resolve(UPLOAD_ROOT, rows[0].storagePath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.warn('Failed to delete file from disk:', e.message);
  }

  await q('DELETE FROM documents WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}

export async function responses(req, res) {
  const { rows } = await q(
    `SELECT id,
            doc_id              AS "docId",
            user_id             AS "userId",
            user_name           AS "userName",
            text,
            file_storage_path   AS "fileStoragePath",
            file_name           AS "fileName",
            file_type           AS "fileType",
            file_size           AS "fileSize",
            created_at          AS "timestamp"
     FROM doc_responses
     WHERE doc_id=$1
     ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json(rows);
}

export async function addResponse(req, res) {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Response text required' });

  let fileRel = null, fileName = null, fileType = null, fileSize = null;
  if (req.file) {
    fileRel = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
    fileName = req.file.originalname;
    fileType = req.file.mimetype;
    fileSize = req.file.size;
  }

  const { rows } = await q(
    `INSERT INTO doc_responses
       (doc_id, user_id, user_name, text, file_storage_path, file_name, file_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id,
               doc_id              AS "docId",
               user_id             AS "userId",
               user_name           AS "userName",
               text,
               file_storage_path   AS "fileStoragePath",
               file_name           AS "fileName",
               file_type           AS "fileType",
               file_size           AS "fileSize",
               created_at          AS "timestamp"`,
    [
      req.params.id, req.user.id, req.user.name, text,
      fileRel, fileName, fileType, fileSize
    ]
  );
  res.status(201).json(rows[0]);
}