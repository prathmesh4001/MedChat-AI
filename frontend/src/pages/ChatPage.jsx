import { useState, useRef, useCallback, useEffect } from 'react';
import { SECTIONS } from '../config';
import InputArea from '../components/InputArea';
import Message from '../components/Message';
import SymptomChecker from '../components/SymptomChecker';
import Toast from '../components/Toast';
import DocumentUpload from '../components/DocumentUpload';
import { callAPIStream } from '../lib/api';
import { exportDiagnosis } from '../lib/export';
import { apiCreateSession, apiSaveMessage, apiGetMessages } from '../lib/api-client';
import { getUserDocumentsContext, listUserDocuments } from '../lib/rag';
import { shouldSearchWeb, searchWeb } from '../lib/search';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// Robust MCQ parser — handles raw JSON, markdown fenced, partial formats
function parseMCQ(text) {
  if (!text) return null;
  const cleaned = text.trim();

  const strategies = [
    () => JSON.parse(cleaned),
    () => { const m = cleaned.match(/```(?:mcq|json)?\s*([\s\S]*?)```/); return m ? JSON.parse(m[1].trim()) : null; },
    () => { const m = cleaned.match(/\{[\s\S]*?"question"\s*:\s*"[\s\S]*?\}/); return m ? JSON.parse(m[0]) : null; },
    () => { const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}'); if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)); return null; },
  ];

  for (const strategy of strategies) {
    try {
      const parsed = strategy();
      if (parsed && parsed.question && parsed.options && Array.isArray(parsed.options) && parsed.options.length >= 2) {
        return {
          thinking: parsed.thinking || 'Analyzing symptoms',
          question: parsed.question,
          options: parsed.options.slice(0, 4),
          step: parsed.step || 1,
          totalSteps: parsed.totalSteps || 4,
          retry: parsed.retry || false,
          feedback: parsed.feedback || '',
        };
      }
    } catch (e) { /* try next */ }
  }
  return null;
}

function looksLikeMCQ(text) {
  if (!text) return false;
  const t = text.trim();
  return (t.startsWith('{') && t.includes('"question"')) || (t.startsWith('```') && t.includes('question')) || (t.startsWith('{') && t.includes('"thinking"'));
}

export default function ChatPage({ sectionKey, theme, activeSession, onSessionConsumed }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [mcqData, setMcqData] = useState(null);
  const [mcqRetryInfo, setMcqRetryInfo] = useState(null); // { previousAnswers: [], attempts: 0 }
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [usedRAG, setUsedRAG] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [researchSources, setResearchSources] = useState({ searchapi: true, who: true, pubmed: true });
  const chatRef = useRef(null);
  const sessionIdRef = useRef(null);
  const sec = SECTIONS[sectionKey];
  const isResearch = sectionKey === 'research';

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');

  const confirmExport = () => {
    setShowExportModal(false);
    exportDiagnosis(messages, sectionKey === 'general' ? 'General Medical' : 'Medical Research', {
      name: patientName,
      age: patientAge,
      gender: patientGender,
      scanImage: null
    });
    setToast({ show: true, message: 'Report generated!' });
  };

  const handleExport = () => {
    if (!messages.length) return setToast({ show: true, message: 'No data' });
    setPatientName('');
    setPatientAge('');
    setPatientGender('Male');
    setShowExportModal(true);
  };
  const anySourceEnabled = researchSources.searchapi || researchSources.who || researchSources.pubmed;

  const toggleSource = (key) => {
    setResearchSources(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const dark = theme === 'dark';
  const { user } = useAuth();
  const { t, langMeta } = useLanguage();

  // Reset session when section changes
  useEffect(() => { sessionIdRef.current = null; setMessages([]); setMcqData(null); setMcqRetryInfo(null); }, [sectionKey]);

  // Load messages when a session is selected from sidebar
  useEffect(() => {
    if (!activeSession || activeSession.section !== sectionKey) return;
    const loadHistory = async () => {
      try {
        sessionIdRef.current = activeSession.id;
        setMessages([]); setMcqData(null); setMcqRetryInfo(null);
        const msgs = await apiGetMessages(activeSession.id);
        const loaded = msgs.map(m => ({
          role: m.role,
          text: m.content,
          rawText: m.content,
          timestamp: m.createdAt,
          isMcq: false,
          isMcqAnswer: m.metadata?.isMcqAnswer || false,
          usedRAG: m.metadata?.usedRAG || false,
          webSources: [],
          searchedWith: [],
        }));
        setMessages(loaded.filter(m => !m.isMcqAnswer));
      } catch (err) {
        console.warn('Failed to load session history:', err.message);
      } finally {
        if (onSessionConsumed) onSessionConsumed();
      }
    };
    loadHistory();
  }, [activeSession, sectionKey, onSessionConsumed]);

  // Check if user has uploaded documents
  useEffect(() => {
    if (user) {
      listUserDocuments(user.id).then(docs => setHasDocuments(docs.length > 0)).catch(() => {});
    }
  }, [user, showDocUpload]);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; });
  }, []);
  useEffect(scrollDown, [messages, loading, streamingText, mcqData, scrollDown]);

  // Save message to MongoDB via backend (fire-and-forget)
  const persistMessage = (role, content, meta = {}) => {
    if (!sessionIdRef.current) return;
    apiSaveMessage(sessionIdRef.current, role, content, null, meta).catch(() => {});
  };

  const sendMessage = async (text, isFromMCQ = false) => {
    if (!text.trim() && !image) return;

    // Create chat session on first message (requires user to be logged in)
    if (!sessionIdRef.current && user) {
      try {
        const session = await apiCreateSession(sectionKey, text.trim().slice(0, 80));
        if (session) sessionIdRef.current = session.id;
      } catch (err) {
        console.warn('Session creation failed:', err.message);
      }
    }

    const userMsg = { role: 'user', text: text.trim(), image: image?.base64 || null, timestamp: new Date().toISOString(), isMcqAnswer: isFromMCQ };
    const img = image;
    setMessages(p => [...p, userMsg]);
    setImage(null); setLoading(true); setStreamingText(''); setUsedRAG(false);
    let webSources = [];
    let searchedWith = [];
    let webImages = [];

    // Persist user message
    persistMessage('user', text.trim(), { isMcqAnswer: isFromMCQ });

    try {
      // Fetch full document context (direct injection — no chunking/embedding)
      // Skip for research section — research doesn't use uploaded reports
      let ragContext = '';
      if (!isResearch && user && hasDocuments) {
        try {
          ragContext = await getUserDocumentsContext(user.id);
          if (ragContext) setUsedRAG(true);
        } catch (ragErr) {
          console.error('Document context fetch failed:', ragErr);
        }
      }

      // Web search for latest medical info
      // Research section: ALWAYS search. General section: NO web search.
      let webSearchContext = '';
      const shouldSearch = isResearch;
      if (shouldSearch && anySourceEnabled) {
        try {
          const activeNames = [
            researchSources.searchapi && t('source_searchapi'),
            researchSources.who && t('source_who'),
            researchSources.pubmed && t('source_pubmed'),
          ].filter(Boolean).join(', ');
          setStreamingText(`*${t('searching_sources')}: ${activeNames}...*`);
          const webResults = await searchWeb(text.trim(), researchSources);
          if (webResults.context) {
            webSearchContext = webResults.context;
            webSources = webResults.sources;
            searchedWith = webResults.searchedWith;
            webImages = webResults.images || [];
          }
        } catch (searchErr) {
          console.error('Web search failed:', searchErr);
        }
        setStreamingText('');
      }

      const historyForAPI = messages.map(m => ({ role: m.role, text: m.rawText || m.text, image: m.image }));
      const reply = await callAPIStream(text.trim(), img, sectionKey, historyForAPI, (partial) => { setStreamingText(partial); scrollDown(); }, ragContext, langMeta.name, webSearchContext);

      const mcq = (isResearch || webSearchContext) ? null : parseMCQ(reply);
      if (mcq) {
        // Check if this is a retry response
        if (mcq.retry && mcqRetryInfo) {
          setMcqData(mcq);
          setMcqRetryInfo(prev => ({
            ...prev,
            attempts: (prev?.attempts || 0) + 1,
            feedback: mcq.feedback,
          }));
        } else {
          setMcqData(mcq);
          setMcqRetryInfo({ previousAnswers: [], attempts: 0, feedback: '' });
        }
        setMessages(p => [...p, {
          role: 'assistant', text: '', rawText: reply, isMcq: true, mcqData: mcq,
          timestamp: new Date().toISOString(), usedRAG: !!ragContext,
          webSources, searchedWith, webImages,
        }]);
        persistMessage('assistant', reply, { type: 'mcq', step: mcq.step });
      } else {
        setMcqData(null);
        setMcqRetryInfo(null);
        setMessages(p => [...p, {
          role: 'assistant', text: reply, rawText: reply,
          timestamp: new Date().toISOString(), usedRAG: !!ragContext,
          webSources, searchedWith, webImages,
        }]);
        persistMessage('assistant', reply, {
          type: reply.includes('Diagnostic Report') ? 'report' : 'chat',
          usedRAG: !!ragContext,
          webSources: webSources.length,
        });
      }
      setStreamingText('');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMcqData(null);
      setMcqRetryInfo(null);
      setMessages(p => [...p, { role: 'assistant', text: `**Error**: ${err.message}`, rawText: `Error: ${err.message}`, timestamp: new Date().toISOString() }]);
      setStreamingText('');
    } finally { setLoading(false); }
  };

  const handleMCQAnswer = (answer, isCustom = false) => {
    // Track the answer for retry purposes
    if (mcqRetryInfo) {
      setMcqRetryInfo(prev => ({
        ...prev,
        previousAnswers: [...(prev?.previousAnswers || []), answer],
      }));
    }
    setMcqData(null);
    const prefix = isCustom ? `My answer: ${answer}` : answer;
    sendMessage(prefix, true);
  };

  const clearChat = () => {
    setMessages([]); setMcqData(null); setMcqRetryInfo(null);
    sessionIdRef.current = null; window.speechSynthesis?.cancel();
  };


  // Only show non-MCQ messages
  const displayMessages = messages.filter(m => !m.isMcq && !m.isMcqAnswer);

  // Determine if streaming looks like MCQ (hide raw JSON)
  const isStreamingMCQ = looksLikeMCQ(streamingText);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0" style={{ background: dark ? '#131b2e' : '#ffffff' }}>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold font-display truncate" style={{ color: 'var(--on-surface)' }}>{t({general:'general_medical',research:'medical_research',xray:'xray_analysis',mri:'mri_scan',ct:'ct_scan'}[sectionKey])}</h2>
          <p className="text-[11px] sm:text-xs hidden sm:block" style={{ color: 'var(--outline)' }}>{t({general:'general_desc',research:'research_desc',xray:'xray_desc',mri:'mri_desc',ct:'ct_desc'}[sectionKey])}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {isResearch && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button onClick={() => toggleSource('who')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer border"
                style={{
                  background: researchSources.who ? (dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  color: researchSources.who ? '#34d399' : 'var(--outline)',
                  borderColor: researchSources.who ? 'rgba(16,185,129,0.3)' : 'var(--outline-variant)',
                  opacity: researchSources.who ? 1 : 0.5,
                }}>
                {researchSources.who && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {t('source_who')}
              </button>
              <button onClick={() => toggleSource('pubmed')}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer border"
                style={{
                  background: researchSources.pubmed ? (dark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)') : 'transparent',
                  color: researchSources.pubmed ? '#a78bfa' : 'var(--outline)',
                  borderColor: researchSources.pubmed ? 'rgba(139,92,246,0.3)' : 'var(--outline-variant)',
                  opacity: researchSources.pubmed ? 1 : 0.5,
                }}>
                {researchSources.pubmed && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                {t('source_pubmed')}
              </button>
            </div>
          )}

          {/* General section: Upload Reports Button */}
          {!isResearch && (
            <button onClick={() => setShowDocUpload(true)}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-1 sm:gap-1.5 relative"
              style={{ background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)', color: 'var(--primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span className="hidden sm:inline">{t('upload_reports')}</span>
              {hasDocuments && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse" />
              )}
            </button>
          )}

          {messages.length > 0 && (
            <button onClick={handleExport} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-1 sm:gap-1.5"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', color: '#ffffff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export</span>
            </button>
          )}
          <button onClick={clearChat} className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-70" style={{ color: 'var(--outline)' }}>{t('clear')}</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 scroll-smooth" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: isResearch ? (dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)') : (dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.06)'), color: isResearch ? '#34d399' : 'var(--primary)' }}>
              {isResearch ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              )}
            </div>
            <h3 className="text-lg font-bold mb-1 font-display" style={{ color: 'var(--on-surface)' }}>{sec.name}</h3>
            <p className="text-sm max-w-md mb-4" style={{ color: 'var(--outline)' }}>
              {isResearch ? t('research_empty_hint') : t('describe_symptoms')}
            </p>

            {/* Data source badges for research — reflect selected sources */}
            {isResearch && (
              <div className="flex items-center gap-2 mb-5 flex-wrap justify-center">
                {researchSources.who && <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>WHO</span>}
                {researchSources.pubmed && <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>PubMed</span>}
                {!anySourceEnabled && <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{t('no_source_selected')}</span>}
              </div>
            )}

            {/* RAG indicator — only for general */}
            {!isResearch && hasDocuments && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full mb-4 animate-fadeIn"
                style={{ background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.04)', color: 'var(--primary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-xs font-semibold">{t('reports_loaded')}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {isResearch
                ? [t('research_prompt_1'), t('research_prompt_2'), t('research_prompt_3'), t('research_prompt_4')].map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)} className="prompt-pill">{p}</button>
                  ))
                : [t('chat_prompt_1'), t('chat_prompt_2'), t('chat_prompt_3'), t('chat_prompt_4')].map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)} className="prompt-pill">{p}</button>
                  ))
              }
            </div>
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <Message key={i} msg={msg} theme={theme} onCopy={() => setToast({ show: true, message: t('copied') })} />
        ))}

        {/* MCQ UI */}
        {mcqData && !loading && (
          <SymptomChecker
            mcqData={mcqData}
            onAnswer={handleMCQAnswer}
            theme={theme}
            retryInfo={mcqRetryInfo}
          />
        )}

        {/* Loading indicator — HIDE if streaming looks like MCQ */}
        {loading && streamingText && !isStreamingMCQ && (
          <Message msg={{ role: 'assistant', text: streamingText }} theme={theme} onCopy={() => {}} />
        )}

        {/* Show "Preparing question..." when MCQ is being streamed */}
        {loading && isStreamingMCQ && (
          <div className="flex gap-4 max-w-[800px] w-full mx-auto animate-fadeIn">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>AI</div>
            <div className="px-5 py-4 rounded-2xl flex items-center gap-3" style={{ background: 'var(--surface-container)' }}>
              <div className="w-4 h-4 border-2 border-t-[var(--primary)] rounded-full animate-spin" style={{ borderColor: 'var(--outline-variant)', borderTopColor: 'var(--primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>{t('preparing_question')}</span>
            </div>
          </div>
        )}

        {/* Generic loading dots */}
        {loading && !streamingText && (
          <div className="flex gap-3 max-w-[800px] w-full mx-auto">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>AI</div>
            <div className="px-5 py-4 rounded-2xl flex items-center gap-2" style={{ background: 'var(--surface-container)' }}>
              {[0,.15,.3].map((d,i) => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: `${d}s` }}/>)}
            </div>
          </div>
        )}
      </div>

      {!mcqData && (
        <InputArea theme={theme} section={sectionKey} image={image} setImage={setImage} onSend={sendMessage} loading={loading} />
      )}
      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: '' })} theme={theme} />

      {/* ═══ EXPORT PATIENT DETAILS MODAL ═══ */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl transition-all duration-300 transform scale-100 ${dark ? 'bg-[#0f172a] border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5 text-[#7ad7c6]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export Diagnostic Report
              </h3>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-60">Patient Name</label>
                <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g. John Doe" className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${dark ? 'bg-white/5 focus:bg-white/10 border border-white/10 text-white focus:border-[#7ad7c6]' : 'bg-slate-50 focus:bg-slate-100 border border-slate-200 focus:border-[#00796b]'}`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-60">Age (Years)</label>
                  <input type="number" value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="e.g. 45" className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${dark ? 'bg-white/5 focus:bg-white/10 border border-white/10 text-white focus:border-[#7ad7c6]' : 'bg-slate-50 focus:bg-slate-100 border border-slate-200 focus:border-[#00796b]'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-60">Gender</label>
                  <select value={patientGender} onChange={e => setPatientGender(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${dark ? 'bg-[#1e293b] border border-white/10 text-white focus:border-[#7ad7c6]' : 'bg-slate-50 border border-slate-200 focus:border-[#00796b]'}`}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setShowExportModal(false)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${dark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={confirmExport} className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>Generate Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocUpload && (
        <DocumentUpload theme={theme} onClose={() => setShowDocUpload(false)} />
      )}
    </div>
  );
}
