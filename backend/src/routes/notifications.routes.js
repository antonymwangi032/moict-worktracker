import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const r = Router();
r.use(auth);
r.get('/', ctrl.list);
r.patch('/read-all', ctrl.markAllRead);
r.post('/', requireAdmin, ctrl.create);
r.delete('/:id', requireAdmin, ctrl.remove);

export default r;