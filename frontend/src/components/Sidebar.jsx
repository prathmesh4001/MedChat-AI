import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SECTIONS } from '../config';

const icons = {
  general:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" /></svg>,
  research: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  xray:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M8 17h8" /><path d="M10 14v3" /><path d="M14 14v3" /></svg>,
  mri:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /></svg>,
  ct:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="2" /></svg>,
};

const sectionNameKeys = { general: 'general_medical', research: 'medical_research', xray: 'xray_analysis', mri: 'mri_scan', ct: 'ct_scan' };
const sectionPaths    = { general: '/general', research: '/research', xray: '/xray', mri: '/mri', ct: '/ct' };

export default function Sidebar({ open, onClose, theme, toggleTheme }) {
  const location = useLocation();
  const dark = theme === 'dark';
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const isActive   = (path) => location.pathname === path;
  const userName   = user?.fullName || user?.email?.split('@')[0] || 'User';
  const userInitial = (user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const handleSignOut = async () => {
    try { await signOut(); } catch { /* handled */ }
  };

  return (
    <aside className={`
      w-[260px] min-w-[260px] h-screen flex flex-col z-30 transition-all duration-300
      max-md:fixed max-md:left-0 max-md:top-0 max-md:shadow-2xl
      ${open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
    `} style={{ background: dark ? '#131b2e' : '#ffffff' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg animate-glow"
          style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
          </svg>
        </div>
        <div>
          <h1 className="text-[0.95rem] font-extrabold leading-tight font-display" style={{ color: 'var(--on-surface)' }}>{t('diagnostics_hub')}</h1>
          <span className="text-[0.62rem] font-semibold tracking-wide" style={{ color: 'var(--primary)' }}>{t('ai_powered')}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto pt-1 space-y-0.5">

        {/* Dashboard */}
        <NavLink to="/" className="block mb-1" onClick={onClose}>
          <div className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 relative ${isActive('/') ? 'text-[var(--primary)]' : ''}`}
            style={isActive('/') ? { background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.06)' } : {}}>
            {isActive('/') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--primary)' }} />}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ background: isActive('/') ? (dark ? 'rgba(122,215,198,0.12)' : 'rgba(0,121,107,0.1)') : (dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'), color: isActive('/') ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </div>
            <span className="text-[0.82rem] font-semibold" style={{ color: isActive('/') ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{t('dashboard')}</span>
          </div>
        </NavLink>

        {/* Patient History */}
        <NavLink to="/history" className="block mb-1" onClick={onClose}>
          <div
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 relative ${isActive('/history') ? 'text-[var(--primary)]' : ''}`}
            style={isActive('/history') ? { background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.06)' } : {}}
          >
            {isActive('/history') && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--primary)' }} />
            )}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{
                background: isActive('/history')
                  ? (dark ? 'rgba(122,215,198,0.12)' : 'rgba(0,121,107,0.1)')
                  : (dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'),
                color: isActive('/history') ? 'var(--primary)' : 'var(--on-surface-variant)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span
              className="text-[0.82rem] font-semibold"
              style={{ color: isActive('/history') ? 'var(--primary)' : 'var(--on-surface-variant)' }}
            >
              Patient History
            </span>
          </div>
        </NavLink>

        {/* DIAGNOSTICS label */}
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] px-3 pb-2 pt-4" style={{ color: 'var(--outline)' }}>
          {t('diagnostics')}
        </div>

        {/* Section nav items — clean, no expandable history */}
        {Object.entries(SECTIONS).map(([key]) => {
          const path   = sectionPaths[key];
          const active = isActive(path);

          return (
            <NavLink key={key} to={path} className="block" onClick={onClose}>
              <div
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 relative"
                style={active ? { background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.06)' } : {}}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--primary)' }} />
                )}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: active ? (dark ? 'rgba(122,215,198,0.12)' : 'rgba(0,121,107,0.1)') : (dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'),
                    color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                  }}
                >
                  {icons[key]}
                </div>
                <span
                  className="text-[0.82rem] font-semibold"
                  style={{ color: active ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                >
                  {t(sectionNameKeys[key])}
                </span>
              </div>
            </NavLink>
          );
        })}

      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1.5">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 hover:opacity-80"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }}>
            {dark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </div>
          <span className="text-[0.82rem] font-semibold">{dark ? t('light_mode') : t('dark_mode')}</span>
        </button>

        {/* User info + sign out */}
        {user && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
            style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-display text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}
            >
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.78rem] font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{userName}</p>
              <p className="text-[0.62rem] truncate" style={{ color: 'var(--outline)' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--outline)' }}
              title={t('sign_out')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* CTA */}
        <NavLink
          to="/general"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-300 text-white hover:-translate-y-0.5 mt-1"
          style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', boxShadow: '0 4px 20px rgba(122,215,198,0.15)' }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('medchat-new-consultation'));
            if (onClose) onClose();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {t('start_consultation')}
        </NavLink>

        <div className="flex items-start gap-1.5 px-3 pt-2 text-[0.58rem] leading-relaxed" style={{ color: 'var(--outline)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {t('disclaimer')}
        </div>
      </div>
    </aside>
  );
}
