import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as ctrl from '../controllers/works.controller.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { q } from '../config/db.js';

const r = Router();

// Storage for work submission files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads', 'works');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 20) * 1024 * 1024 }
});

r.use(auth);

r.get('/', ctrl.list);
r.get('/:id', ctrl.getOne);
r.post('/', requireAdmin, ctrl.create);
r.patch('/:id', requireAdmin, ctrl.update);
r.delete('/:id', requireAdmin, ctrl.remove);
r.post('/:id/state', ctrl.setState);

// Cron-triggered endpoint — sends reminder emails for work due tomorrow
r.post('/cron/send-reminders', ctrl.sendDeadlineReminders);

// Attach submission file
r.post('/:id/file', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const rel = path.relative(process.env.UPLOAD_DIR || 'src/uploads', req.file.path).replace(/\\/g, '/');
  const { rows } = await q(
    `UPDATE works SET
       document_path=$1, document_name=$2, document_type=$3, document_size=$4,
       updated_at=NOW()
     WHERE id=$5
     RETURNING id, ref, document_path AS "documentPath", document_name AS "documentName",
               document_type AS "documentType", document_size AS "documentSize"`,
    [rel, req.file.originalname, req.file.mimetype, req.file.size, req.params.id]
  );
  res.json(rows[0]);
});

export default r;