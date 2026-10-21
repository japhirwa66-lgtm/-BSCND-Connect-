// Production: VITE_API_URL = the backend address (with or without a trailing /api). Development: Vite proxies /api.
const RAW_API = (import.meta.env.VITE_API_URL || '').trim();
const BASE = RAW_API ? `${RAW_API.replace(/\/+$/, '').replace(/\/api$/, '')}/api` : '/api';

export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = extra.fieldErrors || null;
    this.code = extra.code || null;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the server. Check your internet connection and try again.');
  }
  let data = null;
  if (res.status !== 204) {
    try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  }
  if (!res.ok && data === null && res.status === 404 && BASE === '/api' && import.meta.env.PROD) {
    throw new ApiError(404, 'The app cannot reach its server. Set VITE_API_URL to your backend address and redeploy.');
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Something went wrong. Please try again.', data || {});
  return data;
}

const k = encodeURIComponent;

export const api = {
  createForm: (form) => request('/forms', { method: 'POST', body: form }),
  getManaged: (key, signal) => request(`/manage/${k(key)}`, { signal }),
  updateForm: (key, form) => request(`/manage/${k(key)}`, { method: 'PUT', body: form }),
  setStatus: (key, isOpen) => request(`/manage/${k(key)}/status`, { method: 'PATCH', body: { isOpen } }),
  deleteForm: (key) => request(`/manage/${k(key)}`, { method: 'DELETE' }),
  listResponses: (key, page, signal) => request(`/manage/${k(key)}/responses?page=${page}&limit=20`, { signal }),
  deleteResponse: (key, id) => request(`/manage/${k(key)}/responses/${k(id)}`, { method: 'DELETE' }),
  clearResponses: (key) => request(`/manage/${k(key)}/responses`, { method: 'DELETE' }),
  getSummary: (key, signal) => request(`/manage/${k(key)}/summary`, { signal }),
  exportUrl: (key) => `${BASE}/manage/${k(key)}/export.csv`,
  getResults: (slug, signal) => request(`/public/${k(slug)}/results`, { signal }),
  fileUrl: (token, width) => `${BASE}/files/${k(token)}${width ? `?w=${width}` : ''}`,
  /** Upload one photo (raw body) with progress. Resolves with the file token. */
  uploadPhoto(slug, blob, name, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/public/${k(slug)}/uploads`);
      xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(String(name || 'photo').slice(0, 100)));
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        let d = null;
        try { d = JSON.parse(xhr.responseText); } catch { /* not json */ }
        if (xhr.status >= 200 && xhr.status < 300 && d?.token) resolve(d.token);
        else reject(new ApiError(xhr.status, d?.error || (xhr.status === 413 ? 'This photo is too large (max 4 MB).' : 'Upload failed. Please try again.'), d || {}));
      };
      xhr.onerror = () => reject(new ApiError(0, 'Network error while uploading. Check your connection and try again.'));
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', () => xhr.abort());
      xhr.send(blob);
    });
  },
  getPublic: (slug, signal) => request(`/public/${k(slug)}`, { signal }),
  submit: (slug, answers, hp) => request(`/public/${k(slug)}/responses`, { method: 'POST', body: { answers, _hp: hp } }),
};
