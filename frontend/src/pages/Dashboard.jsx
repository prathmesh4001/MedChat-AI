import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SECTIONS } from '../config';
import InputArea from '../components/InputArea';
import Message from '../components/Message';
import Toast from '../components/Toast';
import { callAPIStream } from '../lib/api';
import { shouldSearchWeb, searchWeb } from '../lib/search';
import { useLanguage } from '../contexts/LanguageContext';

const sectionMeta = {
  general: { icon: '🏥', gradient: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-500', link: 'Access Dashboard', path: '/general', desc: 'Symptom analysis and clinical history evaluation.' },
  research: { icon: '🌐', gradient: 'from-teal-500/10 to-teal-500/5', text: 'text-teal-500', link: 'Search WHO & PubMed', path: '/research', desc: 'Search latest medical research.' },
  xray: { icon: '📷', gradient: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-500', link: 'Upload Scan', path: '/xray', desc: 'Automated fracture and pathology detection.' },
  mri: { icon: '🔬', gradient: 'from-violet-500/10 to-violet-500/5', text: 'text-violet-500', link: 'View Results', path: '/mri', desc: 'High-resolution soft tissue analysis.' },
  ct: { icon: '🧬', gradient: 'from-cyan-500/10 to-cyan-500/5', text: 'text-cyan-500', link: 'Process Scan', path: '/ct', desc: '3D reconstructed diagnostics imaging.' },
};

const prompts = [
  'Summarize differential diagnosis for persistent cough',
  'What imaging modality for abdominal pain?',
  'Latest guidelines for chest X-ray interpretation',
  'Explain MRI vs CT for brain analysis',
];

export default function Dashboard({ theme }) {
  const nav = useNavigate();
  const dark = theme === 'dark';
  const { t, langMeta } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const chatRef = useRef(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; });
  }, []);
  useEffect(scrollDown, [messages, loading, streamingText, scrollDown]);

  const sendMessage = async (text) => {
    if (!text.trim() && !image) return;
    const userMsg = { role: 'user', text: text.trim(), image: image?.base64 || null, timestamp: new Date().toISOString() };
    const img = image;
    setMessages(p => [...p, userMsg]);
    setImage(null); setLoading(true); setStreamingText('');
    let webSources = [];
    let searchedWith = [];
    try {
      // Direct general query, no web search for Dashboard preview
      let webSearchContext = '';
      const reply = await callAPIStream(text.trim(), img, 'general', messages, (partial) => { setStreamingText(partial); scrollDown(); }, '', langMeta.name, webSearchContext);
      setMessages(p => [...p, { role: 'assistant', text: reply, timestamp: new Date().toISOString(), webSources, searchedWith }]);
      setStreamingText('');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(p => [...p, { role: 'assistant', text: `**Error**: ${err.message}`, timestamp: new Date().toISOString() }]);
      setStreamingText('');
    } finally { setLoading(false); }
  };


  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div ref={chatRef} className="flex-1 overflow-y-auto scroll-smooth" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 ? (
          <div className="animate-fadeIn">
            {/* Hero */}
            <div className="hero-banner px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-14 mx-3 sm:mx-4 mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 backdrop-blur-md"
                  style={{ background: 'rgba(122,215,198,0.08)', color: '#7ad7c6', border: '1px solid rgba(122,215,198,0.12)' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t('clinical_intelligence')}
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight font-display">{t('welcome_title')}</h1>
                <p className="text-sm md:text-base text-slate-300/90 leading-relaxed mb-6 max-w-lg">
                  {t('welcome_desc')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => nav('/general')} className="dash-btn-primary font-display">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {t('start_consultation')}
                  </button>
                  <button onClick={() => nav('/research')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-md"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {t('medical_research') || 'Medical Research'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 px-3 sm:px-4 mt-4 sm:mt-5">
              {Object.entries(SECTIONS).map(([key, s]) => {
                const m = sectionMeta[key];
                return (
                  <button key={key} onClick={() => nav(m.path)} className="feature-card group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-gradient-to-br ${m.gradient}`}>{m.icon}</div>
                    <h3 className="text-sm font-bold mb-1.5 font-display" style={{ color: 'var(--on-surface)' }}>{t({general:'general_medical',research:'medical_research',xray:'xray_analysis',mri:'mri_scan',ct:'ct_scan'}[key])}</h3>
                    <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--on-surface-variant)' }}>{t({general:'symptom_analysis',research:'research_desc',xray:'fracture_detection',mri:'soft_tissue',ct:'3d_diagnostics'}[key])}</p>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${m.text}`}>
                      {t({general:'access_dashboard',research:'search_medical_data',xray:'upload_scan',mri:'view_results',ct:'process_scan'}[key])} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Suggested Prompts */}
            <div className="px-3 sm:px-4 mt-4 sm:mt-6 mb-3 sm:mb-4">
              <h3 className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.15em] mb-2 sm:mb-3 px-1" style={{ color: 'var(--outline)' }}>{t('suggested_prompts')}</h3>
              <div className="flex flex-wrap gap-2">
                {[t('prompt_cough'), t('prompt_imaging'), t('prompt_xray'), t('prompt_mri_ct')].map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)} className="prompt-pill">{p}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6 flex flex-col gap-5">
              {messages.map((msg, i) => <Message key={i} msg={msg} theme={theme} onCopy={() => setToast({ show: true, message: t('copied') })} />)}
            {loading && streamingText && <Message msg={{ role: 'assistant', text: streamingText }} theme={theme} onCopy={() => {}} />}
            {loading && !streamingText && (
              <div className="flex gap-3 max-w-[800px] w-full mx-auto">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>AI</div>
                <div className="px-5 py-4 rounded-2xl flex items-center gap-2" style={{ background: 'var(--surface-container)' }}>
                  {[0,.15,.3].map((d,i) => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: `${d}s` }}/>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--outline)' }}>
          {t('ai_disclaimer_bottom')}
        </div>
      )}

      <InputArea theme={theme} section="general" image={image} setImage={setImage} onSend={sendMessage} loading={loading} />
      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: '' })} theme={theme} />
    </div>
  );
}
