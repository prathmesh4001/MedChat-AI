import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import ScanAnalysis from './pages/ScanAnalysis';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import PatientHistory from './pages/PatientHistory';

// Inner shell — needs useNavigate, so must be inside BrowserRouter
function AppShell({ theme, toggleTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { id, section, title }
  const navigate = useNavigate();

  const handleLoadSession = (session) => {
    setActiveSession(session);
    // Navigate to the correct section
    const paths = { general: '/general', research: '/research', xray: '/xray', mri: '/mri', ct: '/ct' };
    if (paths[session.section]) navigate(paths[session.section]);
  };

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>
      <div className="relative z-10 flex h-screen">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          toggleTheme={toggleTheme}
          onLoadSession={handleLoadSession}
        />

        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} theme={theme} toggleTheme={toggleTheme} />
          <main className="flex-1 flex flex-col min-h-0">
            <Routes>
              <Route path="/" element={<Dashboard theme={theme} />} />
              <Route path="/general" element={<ChatPage sectionKey="general" theme={theme} activeSession={activeSession} onSessionConsumed={() => setActiveSession(null)} />} />
              <Route path="/research" element={<ChatPage sectionKey="research" theme={theme} activeSession={activeSession} onSessionConsumed={() => setActiveSession(null)} />} />
              <Route path="/xray" element={<ScanAnalysis sectionKey="xray" theme={theme} activeSession={activeSession} onSessionConsumed={() => setActiveSession(null)} />} />
              <Route path="/mri" element={<ScanAnalysis sectionKey="mri" theme={theme} activeSession={activeSession} onSessionConsumed={() => setActiveSession(null)} />} />
              <Route path="/ct" element={<ScanAnalysis sectionKey="ct" theme={theme} activeSession={activeSession} onSessionConsumed={() => setActiveSession(null)} />} />
              <Route path="/history" element={<PatientHistory theme={theme} onLoadSession={handleLoadSession} />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('medchat-theme') || 'dark');

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('medchat-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth page — no sidebar/topbar */}
            <Route path="/auth" element={<AuthPage theme={theme} />} />

            {/* Protected app shell */}
            <Route path="*" element={
              <ProtectedRoute>
                <AppShell theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
