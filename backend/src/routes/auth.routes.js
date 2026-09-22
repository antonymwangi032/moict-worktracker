import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const r = Router();

r.post('/login', ctrl.login);
r.get('/me', auth, ctrl.me);
r.post('/register', auth, requireAdmin, ctrl.register);
r.post('/forgot-password', ctrl.forgotPassword);
r.post('/reset-password', ctrl.resetPassword);
r.post('/change-password', auth, ctrl.changePassword);

export default r;