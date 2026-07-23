import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white animate-glow"
            style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
              <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <div className="w-8 h-8 border-2 border-t-[var(--primary)] rounded-full animate-spin"
            style={{ borderColor: 'var(--outline-variant)', borderTopColor: 'var(--primary)' }} />
          <span className="text-sm font-semibold font-display" style={{ color: 'var(--outline)' }}>Loading MedChat AI...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
