import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

/* ── Custom Inline SVGs & Visual Assets ── */

const HumanWireframeSVG = () => (
  <svg viewBox="0 0 300 400" className="absolute right-[-15%] top-[18%] w-[300px] h-[400px] opacity-10 pointer-events-none select-none text-teal-400" stroke="currentColor" fill="none" strokeWidth="1">
    {/* Head Contour */}
    <ellipse cx="150" cy="100" rx="35" ry="45" />
    
    {/* Neck */}
    <path d="M140 144v20h20v-20" />
    
    {/* Torso & Shoulders */}
    <path d="M80 195c20-20 45-28 70-28s50 8 70 28l15 65h-170z" />
    
    {/* Spinal Cord / Skeleton line */}
    <line x1="150" y1="145" x2="150" y2="380" strokeWidth="1.5" strokeDasharray="3 3" />
    
    {/* Lungs/Rib cages outlines */}
    <path d="M110 220c15-5 30-10 40-10s25 5 40 10" />
    <path d="M105 250c20-8 35-12 45-12s25 4 45 12" />
    <path d="M108 280c18-6 32-10 42-10s24 4 42 10" />
    <path d="M115 310c15-4 25-8 35-8s20 4 35 8" />
    
    {/* Brain neural node connections */}
    <circle cx="150" cy="100" r="4" className="fill-teal-400/80" />
    <circle cx="150" cy="75" r="2" className="fill-teal-400" />
    <circle cx="130" cy="95" r="1.5" className="fill-teal-400" />
    <circle cx="170" cy="95" r="1.5" className="fill-teal-400" />
    <circle cx="140" cy="115" r="2" className="fill-teal-400" />
    <circle cx="160" cy="115" r="2" className="fill-teal-400" />
    
    {/* Brain link lines */}
    <path d="M150 75l-20 20M150 75l20 20M130 95l10 20M170 95l-10 20M140 115h20" opacity="0.4" />
    
    {/* Heart node */}
    <circle cx="135" cy="220" r="6" className="fill-emerald-400 animate-pulse" />
    <circle cx="135" cy="220" r="2.5" className="fill-emerald-200" />
    
    {/* Connection lines from brain to body nodes */}
    <path d="M150 144l-15 76M150 144l45 46" strokeDasharray="2 2" opacity="0.3" />
    
    {/* Key node highlights */}
    <circle cx="80" cy="195" r="2" className="fill-teal-400" />
    <circle cx="220" cy="195" r="2" className="fill-teal-400" />
  </svg>
);

const BrainScanCard = () => (
  <div className="absolute right-[8%] top-[25%] w-[125px] h-[125px] rounded-2xl border border-teal-500/15 bg-slate-950/70 p-2.5 backdrop-blur-md flex flex-col justify-between shadow-2xl animate-float-slow select-none pointer-events-none">
    <div className="flex justify-between items-center text-[7px] text-teal-400/60 font-mono tracking-wider">
      <span>MRI BRAIN_S</span>
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
    </div>
    <div className="flex-1 flex items-center justify-center py-1">
      <svg viewBox="0 0 100 100" className="w-16 h-16 text-teal-400/80 stroke-current" fill="none" strokeWidth="1.5">
        <path d="M50 20 C35 20, 22 30, 22 50 C22 65, 32 75, 45 78 C48 79, 50 80, 50 82" />
        <path d="M50 20 C65 20, 78 30, 78 50 C78 65, 68 75, 55 78 C52 79, 50 80, 50 82" />
        <path d="M32 45 C36 40, 42 42, 45 48 M28 55 C34 55, 38 60, 42 58" opacity="0.6" strokeWidth="1.2" />
        <path d="M68 45 C64 40, 58 42, 55 48 M72 55 C66 55, 62 60, 58 58" opacity="0.6" strokeWidth="1.2" />
        <path d="M50 32 C46 36, 46 44, 50 52 C54 44, 54 36, 50 32" opacity="0.4" strokeWidth="1" />
        <path d="M15 15h8v-8h-8zm0 70h8v8h-8zm70 0h-8v8h8zm0-70h-8v-8h8z" strokeWidth="0.5" opacity="0.3" />
      </svg>
    </div>
    <div className="text-[7px] text-teal-400/40 font-mono text-center">
      SYS_ACTIVE: 98.4%
    </div>
  </div>
);

const ChestScanCard = () => (
  <div className="absolute right-[22%] top-[52%] w-[120px] h-[120px] rounded-2xl border border-teal-500/15 bg-slate-950/70 p-2.5 backdrop-blur-md flex flex-col justify-between shadow-2xl animate-float-medium select-none pointer-events-none">
    <div className="flex justify-between items-center text-[7px] text-teal-400/60 font-mono tracking-wider">
      <span>XRAY CHEST_L</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
    </div>
    <div className="flex-1 flex items-center justify-center py-1">
      <svg viewBox="0 0 100 100" className="w-14 h-14 text-teal-400/70 stroke-current" fill="none" strokeWidth="1.5">
        <line x1="50" y1="20" x2="50" y2="80" strokeWidth="2" strokeDasharray="2 3" opacity="0.5" />
        <path d="M44 25 C30 25, 24 35, 24 55 C24 70, 34 75, 44 75" />
        <path d="M44 35 C32 35, 28 45, 28 55 C28 65, 33 68, 44 68" opacity="0.5" strokeWidth="1.2" />
        <path d="M56 25 C70 25, 76 35, 76 55 C76 70, 66 75, 56 75" />
        <path d="M56 35 C68 35, 72 45, 72 55 C72 65, 67 68, 56 68" opacity="0.5" strokeWidth="1.2" />
        <path d="M44 50 C44 58, 50 63, 48 68 C46 63, 44 58, 44 50" fill="currentColor" opacity="0.1" stroke="none" />
        <line x1="15" y1="46" x2="85" y2="46" stroke="#10b981" strokeWidth="0.8" className="animate-scan-line" />
      </svg>
    </div>
    <div className="text-[7px] text-teal-400/40 font-mono text-center">
      SCAN_COMPLETE
    </div>
  </div>
);

const ECGWaveSVG = () => (
  <svg viewBox="0 0 800 100" className="absolute bottom-0 left-0 w-full h-[60px] opacity-15 pointer-events-none text-teal-500 select-none">
    <path
      d="M0,50 L200,50 L210,40 L220,60 L230,50 L250,50 L260,10 L275,90 L290,40 L300,55 L310,50 L450,50 L460,40 L470,60 L480,50 L500,50 L510,10 L525,90 L540,40 L550,55 L560,50 L800,50"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-ecg-pulse"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

/* ── Shared input wrapper ── */
function InputGroup({ icon, hasError, children }) {
  return (
    <div className="auth-input-group flex items-center gap-3 px-4.5 rounded-2xl transition-all duration-300 animate-fadeIn"
      style={{
        background: '#ffffff',
        border: hasError ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
        boxShadow: hasError ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
      }}>
      <span className={`flex-shrink-0 flex transition-colors duration-300 ${hasError ? 'text-red-400' : 'text-slate-400'}`}>
        {icon}
      </span>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  width: '100%',
  padding: '13px 0',
  fontSize: '0.875rem',
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
  const [rememberMe, setRememberMe] = useState(true);

  // Field validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const validateField = (name, value, currentTab = tab) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address';
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
    }
    if (name === 'fullName' && currentTab === 'signup') {
      if (!value.trim()) return 'Full name is required';
    }
    return '';
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const val = field === 'email' ? email : field === 'password' ? password : fullName;
    const err = validateField(field, val);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'fullName') setFullName(value);

    if (touched[field]) {
      const err = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
    setFieldErrors({});
    setTouched({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    // Validate all fields for current tab
    const errors = {};
    const newTouched = {};

    errors.email = validateField('email', email);
    newTouched.email = true;

    errors.password = validateField('password', password);
    newTouched.password = true;

    if (tab === 'signup') {
      errors.fullName = validateField('fullName', fullName);
      newTouched.fullName = true;
    }

    setTouched(newTouched);
    setFieldErrors(errors);

    // If any inline validation errors exist, stop submission
    if (Object.values(errors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
        navigate('/', { replace: true });
      } else if (tab === 'signup') {
        await signUp(email, password, fullName);
        setSuccess(t('account_created'));
        switchTab('signin');
      } else if (tab === 'reset') {
        const data = await resetPassword(email, password);
        setSuccess(data?.message || 'Password updated successfully!');
        switchTab('signin');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError(''); setSuccess(''); setLoading(true);
    const mockEmail = 'doctor.google@medchat.ai';
    const mockName = 'Dr. Google Assistant';
    const mockPassword = 'GoogleOAuthMockPassword123!';
    try {
      // Automatically register the mock Google account if it doesn't exist
      try {
        await signUp(mockEmail, mockPassword, mockName);
      } catch (e) {
        // Silent catch: account already registered, continue to sign-in
      }
      await signIn(mockEmail, mockPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Google login simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#03141e]">
      
      {/* Style block for animations */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(-1deg); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-14px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(20px); opacity: 0; }
        }
        @keyframes ecgPulse {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: floatMedium 5s ease-in-out infinite;
        }
        .animate-scan-line {
          animation: scanLine 2.8s linear infinite;
        }
        .animate-ecg-pulse {
          stroke-dasharray: 1000;
          animation: ecgPulse 20s linear infinite;
        }

        /* Override browser autofill style to match theme */
        .dark input:-webkit-autofill,
        .dark input:-webkit-autofill:hover, 
        .dark input:-webkit-autofill:focus, 
        .dark input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0b1329 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .light input:-webkit-autofill,
        .light input:-webkit-autofill:hover, 
        .light input:-webkit-autofill:focus, 
        .light input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* ═══════ Left: Branding Panel ═══════ */}
      <div className="hidden lg:flex w-[48%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #03141e 0%, #052627 100%)' }}>
        
        {/* Ambient visuals */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          />
          
          {/* Ambient Glows */}
          <div className="absolute top-[15%] right-[-5%] w-[380px] h-[380px] rounded-full bg-[#00bfa5]/10 filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-15%] left-[-5%] w-[550px] h-[550px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0, 121, 107, 0.1) 0%, transparent 70%)' }} />

          {/* Human wireframe backdrop (scaled & positioned right) */}
          <HumanWireframeSVG />

          {/* Floating scan cards */}
          <BrainScanCard />
          <ChestScanCard />

          {/* ECG heart rate line */}
          <ECGWaveSVG />
        </div>

        {/* Brand Logo */}
        <div className="relative z-10 mb-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #00796B 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
              }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5.5 h-5.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 7v6M9 10h6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white font-display tracking-tight leading-none">MedChat <span className="text-[#00bfa5]">AI</span></h1>
              <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#00bfa5' }}>
                {t('clinical_platform')}
              </span>
            </div>
          </div>
        </div>

        {/* Branding Hero & Feature Cards */}
        <div className="relative z-10 my-auto max-w-[460px]">
          {/* Hero Section */}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight leading-[1.18] mb-6">
            AI Healthcare <br />
            <span className="text-[#00bfa5]">Made Smarter</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Analyze symptoms, medical reports, and diagnostic scans using advanced AI.
          </p>

          {/* 3 Feature Cards */}
          <div className="space-y-4 mb-8">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M4.8 2.3A.3.3 0 0 0 4.5 2.6V8a5 5 0 0 0 5 5 5 5 0 0 0 5-5V2.6a.3.3 0 0 0-.3-.3h-1.4a.3.3 0 0 0-.3.3V8a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2.6a.3.3 0 0 0-.3-.3H4.8z" />
                    <path d="M9.5 13v3a4 4 0 0 0 4 4h1a4 4 0 0 0 4-4v-1" />
                    <circle cx="18.5" cy="12" r="1.5" />
                  </svg>
                ),
                title: '🩺 AI Symptom Assessment',
                desc: 'Interactive symptom analysis with guided questions.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                ),
                title: '📄 Medical Report Analysis',
                desc: 'Understand prescriptions and lab reports instantly.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M8 17h8" />
                    <path d="M10 14v3" />
                    <path d="M14 14v3" />
                  </svg>
                ),
                title: '🩻 Scan Analysis',
                desc: 'AI-powered X-Ray, MRI & CT interpretation.',
              },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00bfa5]/40 hover:bg-white/[0.06] shadow-lg shadow-black/20 group">
                <div className="w-10 h-10 rounded-full bg-[#00bfa5]/15 flex items-center justify-center shrink-0 text-[#00bfa5] transition-transform duration-300 group-hover:scale-105">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display leading-tight">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-normal mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* ═══════ Right: Auth Form ═══════ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #03141e 0%, #052627 100%)' }}>
        
        {/* Mobile/Tablet brand logo (visible only on smaller screens) */}
        <div className="lg:hidden flex items-center gap-3.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #00796B 100%)',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.2)'
            }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 7v6M9 10h6" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold font-display text-white">MedChat <span className="text-[#00bfa5]">AI</span></h1>
        </div>

        {/* Redesigned Card Container */}
        <div className="w-full max-w-[460px] rounded-[24px] p-8 sm:p-10 transition-all duration-300 bg-white text-slate-800 shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-slate-100">
          
          {/* ── Form Header ── */}
          <div className="mb-7">
            <h2 className="text-2xl font-extrabold font-display tracking-tight text-[#02161f]">
              {tab === 'signin' ? t('welcome_back') : tab === 'signup' ? t('create_account') : t('reset_password')}
            </h2>
            <p className="text-sm mt-2 text-slate-500">
              {tab === 'signin' ? t('sign_in_desc') : tab === 'signup' ? t('sign_up_desc') : t('reset_desc')}
            </p>
          </div>

          {/* ── Error / Success Banners ── */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 animate-fadeIn"
              style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 animate-fadeIn"
              style={{ background: 'rgba(16,185,129,0.06)', color: '#10b981', border: '1px solid rgba(16,185,129,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* ── Auth Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Full Name Input (signup tab only) */}
            {tab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-display text-slate-600">
                  {t('full_name')}
                </label>
                <InputGroup hasError={touched.fullName && Boolean(fieldErrors.fullName)} icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }>
                  <input type="text" value={fullName} onChange={e => handleChange('fullName', e.target.value)} onBlur={() => handleBlur('fullName')}
                    placeholder="Dr. John Doe" style={{ ...inputStyle, color: '#0f172a' }} />
                </InputGroup>
                {touched.fullName && fieldErrors.fullName && (
                  <p className="text-[11px] font-semibold text-red-500 mt-1 pl-1 flex items-center gap-1 animate-fadeIn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-display text-slate-600">
                {t('email_address')}
              </label>
              <InputGroup hasError={touched.email && Boolean(fieldErrors.email)} icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }>
                <input type="email" value={email} onChange={e => handleChange('email', e.target.value)} onBlur={() => handleBlur('email')}
                  placeholder="name@example.com" autoComplete="off" style={{ ...inputStyle, color: '#0f172a' }} />
              </InputGroup>
              {touched.email && fieldErrors.email && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 pl-1 flex items-center gap-1 animate-fadeIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-display text-slate-600">
                {tab === 'reset' ? 'NEW PASSWORD' : t('password')}
              </label>
              <InputGroup hasError={touched.password && Boolean(fieldErrors.password)} icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => handleChange('password', e.target.value)} onBlur={() => handleBlur('password')}
                  placeholder={tab === 'reset' ? 'Enter new password' : 'Enter your password'} autoComplete="new-password" style={{ ...inputStyle, color: '#0f172a' }} />
                
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-60 shrink-0 cursor-pointer text-slate-400">
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
              {touched.password && fieldErrors.password && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 pl-1 flex items-center gap-1 animate-fadeIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me and Forgot Password Container */}
            {tab === 'signin' && (
              <div className="flex items-center justify-between mt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4.5 h-4.5 rounded-md border transition-all flex items-center justify-center ${
                      rememberMe
                        ? 'bg-[#006064] border-[#006064] text-white shadow-sm'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {rememberMe && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span>Remember me</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => switchTab('reset')}
                  className="font-semibold transition-all hover:opacity-70 cursor-pointer text-teal-600"
                >
                  {t('forgot_password')}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={loading}
              className="w-full relative py-3.5 rounded-2xl text-sm font-bold font-display text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center cursor-pointer mt-4"
              style={{
                background: 'linear-gradient(135deg, #006064 0%, #004d40 100%)',
                boxShadow: '0 6px 20px rgba(0, 96, 100, 0.2)',
              }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{tab === 'signin' ? t('sign_in') : tab === 'signup' ? t('create_account') : t('send_reset_link')}</span>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </>
              )}
            </button>
          </form>

          {/* Reset password back to Login Link */}
          {tab === 'reset' && (
            <button onClick={() => switchTab('signin')}
              className="w-full mt-5 py-2.5 text-sm font-semibold transition-colors hover:text-slate-800 cursor-pointer text-slate-400">
              {t('back_signin')}
            </button>
          )}

          <p className="text-center text-xs mt-7 text-slate-500">
            {tab === 'signin' ? t('no_account') + ' ' : t('have_account') + ' '}
            <button onClick={() => switchTab(tab === 'signin' ? 'signup' : 'signin')}
              className="font-bold transition-colors hover:opacity-70 cursor-pointer text-teal-600"
              style={{ padding: '0 4px' }}>
              {tab === 'signin' ? t('sign_up') : t('sign_in')}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
