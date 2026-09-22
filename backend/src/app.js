import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import worksRoutes from './routes/works.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure upload dirs exist
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');
['works', 'library', 'responses'].forEach(sub => {
  fs.mkdirSync(path.join(uploadRoot, sub), { recursive: true });
});

// Serve uploaded files
app.use('/uploads', express.static(uploadRoot));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);

app.use(errorHandler);