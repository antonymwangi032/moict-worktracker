const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const ORIGIN = BASE.replace(/\/api\/?$/, '');

function getToken() {
  const s = localStorage.getItem('moict_session');
  if (!s) return null;
  try { return JSON.parse(s).token; } catch { return null; }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined
  });

  // Read the body FIRST so we can surface the server's error message
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

  // 401 on a login/register/forgot endpoint = bad credentials, not expired session
  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/forgot-password');

  if (res.status === 401 && !isAuthEndpoint) {
    localStorage.removeItem('moict_session');
    sessionStorage.removeItem('moict_fresh_login');
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  delete: (p) => request(p, { method: 'DELETE' }),
  upload: (p, formData) => request(p, { method: 'POST', body: formData, isForm: true }),
  fileUrl: (relPath) => relPath ? `${ORIGIN}/uploads/${relPath}` : null
};