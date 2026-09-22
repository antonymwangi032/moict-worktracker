import { verify } from '../utils/jwt.js';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = verify(token); // { id, email, role, name }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}