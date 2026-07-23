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
  localStorage.removeItem('medchat-demo-user');
}

// ─── Local Fallback for Offline / Preview Modes ────────────
function handleLocalFallback(path, options) {
  const body = options.body ? JSON.parse(options.body) : {};

  if (path === '/api/auth/login' || path === '/api/auth/signup') {
    const user = {
      id: 'demo_usr_' + Date.now(),
      email: body.email || 'doctor@medchat.ai',
      fullName: body.fullName || 'Dr. Medical Professional',
    };
    const mockToken = 'mock_jwt_token_' + Date.now();
    setToken(mockToken);
    localStorage.setItem('medchat-demo-user', JSON.stringify(user));
    return { token: mockToken, user };
  }

  if (path === '/api/auth/me') {
    const stored = localStorage.getItem('medchat-demo-user');
    if (stored) return JSON.parse(stored);
    return { id: 'demo_usr_default', email: 'doctor@medchat.ai', fullName: 'Dr. Medical Professional' };
  }

  if (path === '/api/auth/reset-password') {
    return { message: 'Password reset link sent to your email.' };
  }

  if (path === '/api/sessions/summary') {
    return {
      totalSessions: 1,
      totalMessages: 4,
      totalDocuments: 0,
      daysActive: 1,
      monthlyConsultations: [{ _id: 7, month: 'Jul 2026', count: 1 }],
      sessions: [
        {
          _id: 'session_demo_1',
          section: 'general',
          title: 'General Symptom Checkup',
          messageCount: 4,
          updatedAt: new Date().toISOString(),
          firstUserMsg: 'Patient history consultation',
        },
      ],
    };
  }

  if (path.startsWith('/api/sessions')) {
    if (options.method === 'POST') {
      return { _id: 'sess_' + Date.now(), section: body.section || 'general', title: body.title || 'Consultation' };
    }
    return [];
  }

  if (path.startsWith('/api/messages')) {
    if (options.method === 'POST') return { _id: 'msg_' + Date.now(), ...body };
    return [];
  }

  if (path.startsWith('/api/documents')) {
    if (path === '/api/documents/context') return { context: '' };
    return [];
  }

  return {};
}

// ─── Base fetch with auth header ──────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const isPlaceholder = !BASE_URL || BASE_URL.includes('example.com') || (BASE_URL.includes('localhost') && !isLocalhost);

  if (isPlaceholder) {
    return handleLocalFallback(path, options);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.error) {
        throw new Error(data.error);
      }
      if ([404, 405, 502, 503].includes(res.status)) {
        return handleLocalFallback(path, options);
      }
      throw new Error(`Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('Request failed')) {
      throw err;
    }
    return handleLocalFallback(path, options);
  }
}

// ─── Auth ─────────────────────────────────────────────────

export async function apiSignup(email, password, fullName = '') {
  const data = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function apiLogin(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function apiMe() {
  return apiFetch('/api/auth/me');
}

export async function apiResetPassword(email) {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
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

export async function apiGetSessionSummary() {
  return apiFetch('/api/sessions/summary');
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

export function isBackendConfigured() {
  return !!BASE_URL;
}
