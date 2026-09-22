import { Router } from 'express';
import * as ctrl from '../controllers/comments.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();
r.use(auth);
r.get('/', ctrl.listByWork);
r.post('/', ctrl.create);

export default r;