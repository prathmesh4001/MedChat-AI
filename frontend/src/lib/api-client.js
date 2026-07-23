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

// ─── Local DB Helpers for Offline / Preview Modes ─────────
function getRegisteredUsers() {
  try { return JSON.parse(localStorage.getItem('medchat-users-db') || '[]'); } catch { return []; }
}
function saveRegisteredUsers(users) {
  localStorage.setItem('medchat-users-db', JSON.stringify(users));
}

function getLocalSessions() {
  try { return JSON.parse(localStorage.getItem('medchat-sessions-db') || '[]'); } catch { return []; }
}
function saveLocalSessions(sessions) {
  localStorage.setItem('medchat-sessions-db', JSON.stringify(sessions));
}

function getLocalMessages() {
  try { return JSON.parse(localStorage.getItem('medchat-messages-db') || '[]'); } catch { return []; }
}
function saveLocalMessages(msgs) {
  localStorage.setItem('medchat-messages-db', JSON.stringify(msgs));
}

// ─── Local Fallback for Offline / Preview Modes ────────────
function handleLocalFallback(path, options) {
  const body = options.body ? JSON.parse(options.body) : {};

  if (path === '/api/auth/signup') {
    const users = getRegisteredUsers();
    const cleanEmail = (body.email || '').toLowerCase().trim();
    const existing = users.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      email: cleanEmail,
      password: body.password,
      fullName: body.fullName || 'Dr. Medical Professional',
    };
    users.push(newUser);
    saveRegisteredUsers(users);

    const mockToken = 'mock_jwt_' + Date.now();
    setToken(mockToken);
    localStorage.setItem('medchat-demo-user', JSON.stringify({ id: newUser.id, email: newUser.email, fullName: newUser.fullName }));
    return { token: mockToken, user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName } };
  }

  if (path === '/api/auth/login') {
    const users = getRegisteredUsers();
    const cleanEmail = (body.email || '').toLowerCase().trim();
    const found = users.find(u => u.email === cleanEmail && u.password === body.password);
    if (!found) {
      clearToken();
      throw new Error('Invalid email or password');
    }
    const mockToken = 'mock_jwt_' + Date.now();
    setToken(mockToken);
    localStorage.setItem('medchat-demo-user', JSON.stringify({ id: found.id, email: found.email, fullName: found.fullName }));
    return { token: mockToken, user: { id: found.id, email: found.email, fullName: found.fullName } };
  }

  if (path === '/api/auth/me') {
    const stored = localStorage.getItem('medchat-demo-user');
    if (stored) return JSON.parse(stored);
    clearToken();
    throw new Error('Not logged in');
  }

  if (path === '/api/auth/reset-password') {
    const users = getRegisteredUsers();
    const cleanEmail = (body.email || '').toLowerCase().trim();
    const foundIndex = users.findIndex(u => u.email === cleanEmail);
    if (foundIndex === -1) {
      throw new Error('No account found with this email address');
    }
    if (body.newPassword) {
      users[foundIndex].password = body.newPassword;
      saveRegisteredUsers(users);
      return { message: 'Password updated successfully! Please sign in with your new password.' };
    }
    return { message: 'Password reset link sent to your email.' };
  }

  if (path === '/api/sessions/summary') {
    const sessions = getLocalSessions();
    const messages = getLocalMessages();

    // Map sessions to summary format
    const formattedSessions = sessions.map(s => {
      const sessMsgs = messages.filter(m => m.sessionId === s.id || m.sessionId === s._id);
      const firstUserMsg = sessMsgs.find(m => m.role === 'user')?.content || 'Consultation session';
      return {
        _id: s.id || s._id,
        id: s.id || s._id,
        section: s.section,
        title: s.title,
        messageCount: sessMsgs.length || s.messageCount || 1,
        updatedAt: s.updatedAt || new Date().toISOString(),
        firstUserMsg,
      };
    });

    return {
      totalSessions: formattedSessions.length,
      totalMessages: messages.length,
      totalDocuments: 0,
      daysActive: formattedSessions.length ? 1 : 0,
      monthlyConsultations: [{ _id: new Date().getMonth() + 1, month: 'Current Month', count: formattedSessions.length }],
      sessions: formattedSessions,
    };
  }

  if (path === '/api/sessions' && options.method === 'POST') {
    const sessions = getLocalSessions();
    const newSess = {
      _id: 'sess_' + Date.now(),
      id: 'sess_' + Date.now(),
      section: body.section || 'general',
      title: body.title || 'Consultation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    sessions.unshift(newSess);
    saveLocalSessions(sessions);
    return newSess;
  }

  if (path.startsWith('/api/sessions')) {
    if (options.method === 'DELETE') {
      const sessId = path.split('/')[3];
      const sessions = getLocalSessions().filter(s => s.id !== sessId && s._id !== sessId);
      saveLocalSessions(sessions);
      return { message: 'Session deleted' };
    }
    const sessions = getLocalSessions();
    if (path.includes('?section=')) {
      const sec = path.split('?section=')[1];
      return sessions.filter(s => s.section === sec);
    }
    return sessions;
  }

  if (path === '/api/messages' && options.method === 'POST') {
    const msgs = getLocalMessages();
    const newMsg = {
      _id: 'msg_' + Date.now(),
      id: 'msg_' + Date.now(),
      sessionId: body.sessionId,
      role: body.role,
      content: body.content,
      imageUrl: body.imageUrl || null,
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
    };
    msgs.push(newMsg);
    saveLocalMessages(msgs);

    // Update session messageCount and updatedAt
    const sessions = getLocalSessions();
    const idx = sessions.findIndex(s => s.id === body.sessionId || s._id === body.sessionId);
    if (idx !== -1) {
      sessions[idx].messageCount = (sessions[idx].messageCount || 0) + 1;
      sessions[idx].updatedAt = new Date().toISOString();
      saveLocalSessions(sessions);
    }
    return newMsg;
  }

  if (path.startsWith('/api/messages/')) {
    const sessId = path.split('/api/messages/')[1];
    const msgs = getLocalMessages();
    return msgs.filter(m => m.sessionId === sessId);
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
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) setToken(data.token);
    return data;
  } catch (err) {
    clearToken();
    throw err;
  }
}

export async function apiMe() {
  return apiFetch('/api/auth/me');
}

export async function apiResetPassword(email, newPassword = '') {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
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
