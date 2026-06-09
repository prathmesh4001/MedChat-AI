// ─── MedChat AI — Backend API Client ──────────────────────
// All communication with the Express backend goes through this file.
// JWT token is stored in localStorage under 'medchat-token'.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Token helpers ────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('medchat-token');
}
export function setToken(token) {
  localStorage.setItem('medchat-token', token);
}
export function clearToken() {
  localStorage.removeItem('medchat-token');
}

// ─── Base fetch with auth header ──────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────

export async function apiSignup(email, password, fullName = '') {
  const data = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  });
  if (data.token) setToken(data.token);
  return data; // { token, user }
}

export async function apiLogin(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setToken(data.token);
  return data; // { token, user }
}

export async function apiMe() {
  return apiFetch('/api/auth/me'); // { id, email, fullName }
}

// ─── Chat Sessions ────────────────────────────────────────

export async function apiCreateSession(section, title = '') {
  return apiFetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ section, title }),
  });
}

export async function apiListSessions(section = null) {
  const query = section ? `?section=${section}` : '';
  return apiFetch(`/api/sessions${query}`);
}

export async function apiDeleteSession(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

// ─── Messages ─────────────────────────────────────────────

export async function apiSaveMessage(sessionId, role, content, imageUrl = null, metadata = {}) {
  return apiFetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ sessionId, role, content, imageUrl, metadata }),
  });
}

export async function apiGetMessages(sessionId) {
  return apiFetch(`/api/messages/${sessionId}`);
}

// ─── Documents ────────────────────────────────────────────

export async function apiUploadDocument(fileName, fileType, fullText) {
  return apiFetch('/api/documents', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileType, fullText, charCount: fullText.length }),
  });
}

export async function apiListDocuments() {
  return apiFetch('/api/documents');
}

export async function apiGetDocumentsContext() {
  const data = await apiFetch('/api/documents/context');
  return data.context || '';
}

export async function apiDeleteDocument(fileName) {
  return apiFetch(`/api/documents/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
}

// ─── Backend configured check ─────────────────────────────
export function isBackendConfigured() {
  return !!BASE_URL;
}
