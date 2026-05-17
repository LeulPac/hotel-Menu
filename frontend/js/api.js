/* api.js – Generic fetch wrapper with optional JWT header */

const BASE = '';  // same origin – backend serves frontend

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });

  if (res.status === 401) {
    // Token expired – redirect to login if on admin page, BUT not if we are already on the login page
    if (window.location.pathname.includes('/admin/') && !window.location.pathname.includes('login.html')) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login.html';
    }
    throw new Error('Invalid credentials or unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const body = contentType.includes('application/json') ? await res.json() : { error: res.statusText };
    throw new Error(body.error || 'Request failed');
  }

  if (contentType.includes('application/json')) return res.json();
  return res;  // For PDF/blob responses
}

window.api = {
  get:    (path)         => apiFetch(path, { method: 'GET' }),
  post:   (path, data)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(data) }),
  put:    (path, data)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(data) }),
  patch:  (path, data)   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
  postForm: (path, form) => {
    const token = localStorage.getItem('adminToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(BASE + path, { method: 'POST', headers, body: form }).then(async r => {
      if (!r.ok) { const b = await r.json(); throw new Error(b.error || 'Failed'); }
      return r.json();
    });
  },
  putForm: (path, form) => {
    const token = localStorage.getItem('adminToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(BASE + path, { method: 'PUT', headers, body: form }).then(async r => {
      if (!r.ok) { const b = await r.json(); throw new Error(b.error || 'Failed'); }
      return r.json();
    });
  },
};
