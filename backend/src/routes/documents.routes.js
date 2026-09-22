import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as ctrl from '../controllers/documents.controller.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const r = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads', 'library');
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

const respStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads', 'responses');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const respUpload = multer({
  storage: respStorage,
  limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 20) * 1024 * 1024 }
});

r.use(auth);

r.get('/', ctrl.list);
r.post('/', requireAdmin, upload.single('file'), ctrl.create);
r.delete('/:id', requireAdmin, ctrl.remove);
r.get('/:id/responses', ctrl.responses);
r.post('/:id/responses', respUpload.single('file'), ctrl.addResponse);

export default r;