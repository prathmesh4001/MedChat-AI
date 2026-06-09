import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

/* ── Shared input wrapper — defined outside to avoid re-mount on every keystroke ── */
function InputGroup({ icon, children, dark }) {
  return (
    <div className="auth-input-group" style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: dark ? 'rgba(255,255,255,0.04)' : 'var(--surface-container)',
      border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--outline-variant)'}`,
      borderRadius: '16px', padding: '0 16px', transition: 'all 0.3s ease',
    }}>
      <span style={{ color: 'var(--outline)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'transparent', border: 'none', outline: 'none', width: '100%',
  padding: '14px 0', fontSize: '0.9rem', color: 'var(--on-surface)',
  fontFamily: 'Inter, sans-serif',
};

export default function AuthPage({ theme }) {
  const dark = theme === 'dark';
  const { t } = useLanguage();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
        navigate('/', { replace: true });
      } else if (tab === 'signup') {
        await signUp(email, password, fullName);
        setSuccess(t('account_created'));
        setTab('signin');
      } else if (tab === 'reset') {
        await resetPassword(email);
        setSuccess(t('reset_sent'));
        setTab('signin');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: dark ? '#0b0f1a' : '#f6f8fb' }}>
      {/* ═══════ Left: Branding Panel ═══════ */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #064e45 100%)' }}>
        {/* Animated ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(122,215,198,0.07) 0%, transparent 65%)', animationDuration: '6s' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(0,97,86,0.1) 0%, transparent 65%)', animationDuration: '8s' }} />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Brand Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', width: '52px', height: '52px', boxShadow: '0 8px 24px rgba(122,215,198,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white font-display tracking-tight">MedChat AI</h1>
              <span className="text-xs font-semibold tracking-wide" style={{ color: '#7ad7c6' }}>{t('clinical_platform')}</span>
            </div>
          </div>
        </div>

        {/* Feature cards with glassmorphism */}
        <div className="relative z-10 space-y-5">
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, title: t('multi_modal'), desc: t('multi_modal_desc'), gradient: 'linear-gradient(135deg, rgba(122,215,198,0.2), rgba(0,97,86,0.15))' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: t('rag_insights'), desc: t('rag_desc'), gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: t('secure_private'), desc: t('secure_desc'), gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl backdrop-blur-sm animate-fadeIn"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: `${i * 0.15}s` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: f.gradient, color: '#7ad7c6' }}>{f.icon}</div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">{f.title}</h3>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="relative z-10 flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          {t('auth_disclaimer')}
        </div>
      </div>

      {/* ═══════ Right: Auth Form ═══════ */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[420px] animate-fadeIn">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', boxShadow: '0 6px 20px rgba(122,215,198,0.2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold font-display" style={{ color: 'var(--on-surface)' }}>MedChat AI</h1>
          </div>

          {/* ── Tab Switcher ── */}
          {tab !== 'reset' && (
            <div className="flex rounded-2xl p-1.5 mb-8"
              style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#edf0f4', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'transparent'}` }}>
              {['signin', 'signup'].map(tabKey => (
                <button key={tabKey} onClick={() => { setTab(tabKey); setError(''); setSuccess(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold font-display transition-all duration-300"
                  style={{
                    background: tab === tabKey ? (dark ? 'rgba(122,215,198,0.12)' : '#ffffff') : 'transparent',
                    color: tab === tabKey ? 'var(--primary)' : 'var(--outline)',
                    boxShadow: tab === tabKey ? (dark ? '0 2px 12px rgba(122,215,198,0.1)' : '0 2px 10px rgba(0,0,0,0.06)') : 'none',
                  }}>
                  {tabKey === 'signin' ? t('sign_in') : t('sign_up')}
                </button>
              ))}
            </div>
          )}

          {/* ── Heading ── */}
          <div className="mb-7">
            <h2 className="text-[1.65rem] font-extrabold font-display tracking-tight" style={{ color: 'var(--on-surface)' }}>
              {tab === 'signin' ? t('welcome_back') : tab === 'signup' ? t('create_account') : t('reset_password')}
            </h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--outline)' }}>
              {tab === 'signin' ? t('sign_in_desc') : tab === 'signup' ? t('sign_up_desc') : t('reset_desc')}
            </p>
          </div>

          {/* ── Error / Success ── */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 animate-fadeIn"
              style={{ background: dark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 animate-fadeIn"
              style={{ background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', color: '#10b981', border: '1px solid rgba(16,185,129,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* ═══ Form ═══ */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (signup only) */}
            {tab === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2.5 font-display" style={{ color: 'var(--outline)' }}>{t('full_name')}</label>
                <InputGroup dark={dark} icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Dr. John Doe" style={inputStyle} />
                </InputGroup>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2.5 font-display" style={{ color: 'var(--outline)' }}>{t('email_address')}</label>
              <InputGroup dark={dark} icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              }>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email" required style={inputStyle} />
              </InputGroup>
            </div>

            {/* Password */}
            {tab !== 'reset' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2.5 font-display" style={{ color: 'var(--outline)' }}>{t('password')}</label>
                <InputGroup dark={dark} icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" required minLength={6} style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-60 shrink-0 cursor-pointer"
                    style={{ color: 'var(--outline)' }}>
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </InputGroup>
              </div>
            )}

            {/* Forgot password */}
            {tab === 'signin' && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => { setTab('reset'); setError(''); setSuccess(''); }}
                  className="text-xs font-semibold transition-all hover:opacity-70 cursor-pointer" style={{ color: 'var(--primary)' }}>
                  {t('forgot_password')}
                </button>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold font-display text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 cursor-pointer mt-2"
              style={{
                background: 'linear-gradient(135deg, #4fd1c5 0%, #2c9f8f 50%, #006156 100%)',
                boxShadow: '0 6px 24px rgba(122,215,198,0.25), 0 2px 6px rgba(0,0,0,0.08)',
              }}>
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {tab === 'signin' ? t('sign_in') : tab === 'signup' ? t('create_account') : t('send_reset_link')}
            </button>
          </form>

          {/* Reset back link */}
          {tab === 'reset' && (
            <button onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}
              className="w-full mt-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer" style={{ color: 'var(--outline)' }}>
              {t('back_signin')}
            </button>
          )}

          {/* Bottom toggle */}
          <p className="text-center text-xs mt-7" style={{ color: 'var(--outline)' }}>
            {tab === 'signin' ? t('no_account') + ' ' : t('have_account') + ' '}
            <button onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
              className="font-bold transition-colors hover:opacity-70 cursor-pointer" style={{ color: 'var(--primary)' }}>
              {tab === 'signin' ? t('sign_up') : t('sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
