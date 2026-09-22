import { Router } from 'express';
import * as ctrl from '../controllers/users.controller.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const r = Router();

r.use(auth);

r.get('/', requireAdmin, ctrl.list);
r.get('/regular', ctrl.regular);
r.post('/', requireAdmin, ctrl.create);
r.patch('/:id/role', requireAdmin, ctrl.updateRole);
r.delete('/:id', requireAdmin, ctrl.remove);
r.post('/:id/reset-password', requireAdmin, ctrl.resetUserPassword);

export default r;