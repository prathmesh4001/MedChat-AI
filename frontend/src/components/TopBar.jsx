import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function TopBar({ onMenuClick, theme, toggleTheme }) {
  const dark = theme === 'dark';
  const { user, signOut } = useAuth();
  const { t, lang, setLang, languages } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef(null);
  const langRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    try { await signOut(); } catch { /* handled by context */ }
  };

  const currentLang = languages.find(l => l.code === lang);

  return (
    <div className="flex items-center justify-between px-5 py-3 z-20 glass"
      style={{ background: dark ? 'rgba(19,27,46,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl md:hidden transition-colors hover:opacity-70">
          <span className="block w-4 h-[1.5px] rounded-full" style={{ background: 'var(--on-surface-variant)' }} />
          <span className="block w-4 h-[1.5px] rounded-full" style={{ background: 'var(--on-surface-variant)' }} />
          <span className="block w-4 h-[1.5px] rounded-full" style={{ background: 'var(--on-surface-variant)' }} />
        </button>
        <h1 className="text-base font-extrabold tracking-tight font-display" style={{ color: 'var(--primary)' }}>MedChat AI</h1>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder={t('search_diagnostics')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: dark ? 'rgba(255,255,255,0.04)' : 'var(--surface-container)',
              color: 'var(--on-surface)',
              border: 'none',
              boxShadow: `inset 0 0 0 1px ${dark ? 'rgba(63,73,73,0.25)' : 'rgba(203,213,225,0.5)'}`,
            }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:opacity-80"
            style={{ background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.04)', color: 'var(--primary)' }}
            title={t('select_language')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="hidden sm:inline">{currentLang?.nativeName || 'English'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 top-11 w-56 rounded-2xl overflow-hidden animate-fadeIn z-50 max-h-[360px] overflow-y-auto"
              style={{
                background: dark ? 'var(--surface-container)' : '#ffffff',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>{t('select_language')}</span>
              </div>
              <div className="p-1.5">
                {languages.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:opacity-80"
                    style={{
                      background: lang === l.code ? (dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.05)') : 'transparent',
                    }}>
                    <span className="text-sm font-medium" style={{ color: lang === l.code ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                      {l.nativeName}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--outline)' }}>{l.name}</span>
                    {lang === l.code && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:opacity-70"
          style={{ color: 'var(--on-surface-variant)' }} title={dark ? t('light_mode') : t('dark_mode')}>
          {dark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>

        {/* User Profile */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-display transition-all duration-200 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', color: 'white' }}>
            {userInitial}
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl overflow-hidden animate-fadeIn z-50"
              style={{
                background: dark ? 'var(--surface-container)' : '#ffffff',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
              {/* User Info */}
              <div className="px-4 py-4" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-display text-white"
                    style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold font-display truncate" style={{ color: 'var(--on-surface)' }}>{userName}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--outline)' }}>{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:opacity-80"
                  style={{ color: '#ef4444' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="text-sm font-semibold">{t('sign_out')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
