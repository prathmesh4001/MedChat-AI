import { createContext, useContext, useState, useEffect } from 'react';
import { apiSignup, apiLogin, apiMe, clearToken, getToken } from '../lib/api-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from stored JWT
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe()
      .then((userData) => setUser(userData))
      .catch(() => clearToken()) // Token expired / invalid → clear it
      .finally(() => setLoading(false));
  }, []);

  // ─── Sign Up ───────────────────────────────────────────
  const signUp = async (email, password, fullName = '') => {
    const { user: userData } = await apiSignup(email, password, fullName);
    setUser(userData);
    return userData;
  };

  // ─── Sign In ───────────────────────────────────────────
  const signIn = async (email, password) => {
    const { user: userData } = await apiLogin(email, password);
    setUser(userData);
    return userData;
  };

  // ─── Sign Out ──────────────────────────────────────────
  const signOut = async () => {
    clearToken();
    setUser(null);
  };

  // resetPassword and signInWithGoogle are removed (not supported in JWT auth).
  // Add your own email-based reset flow here if needed.
  const resetPassword = async () => {
    throw new Error('Password reset is not yet available in this version.');
  };

  const value = { user, loading, signUp, signIn, signOut, resetPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
