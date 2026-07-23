import React, { useState, useRef, useCallback, useEffect } from 'react';
import { callAPIStream } from '../lib/api';
import { exportDiagnosis } from '../lib/export';
import Message from '../components/Message';
import Toast from '../components/Toast';
import { apiCreateSession, apiSaveMessage, apiGetMessages } from '../lib/api-client';

const scanConfig = {
  xray: {
    title: 'X-Ray Analysis', sectionName: 'X-Ray', uploadLabel: 'Upload X-Ray', studyPrefix: 'XRY', modality: 'DR',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/><path d="M10 14v3"/><path d="M14 14v3"/></svg>,
    annotations: [{ label: 'LUNG_FIELD_L', pos: 'top-4 left-4', color: '#10b981' }, { label: 'NODULE_POSS', pos: 'top-[45%] left-[55%]', color: '#f59e0b', pulse: true }],
    findings: [
      { label: 'Cardiac silhouette', detail: 'Transverse diameter normal.', s: 'ok' },
      { label: 'No pneumothorax', detail: 'Pleural lines intact bilaterally.', s: 'ok' },
      { label: 'Faint Opacity', detail: '8mm nodular density, right lower.', s: 'warn' },
      { label: 'Costophrenic angles', detail: 'Clear and sharp bilaterally.', s: 'ok' },
    ],
    prompt: 'Analyze this X-ray image in detail. Identify all anatomical structures, any abnormalities, and provide a comprehensive diagnostic report.',
  },
  mri: {
    title: 'MRI Analysis', sectionName: 'MRI Scan', uploadLabel: 'Upload MRI', studyPrefix: 'MRI', modality: 'MR',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/></svg>,
    annotations: [{ label: 'BRAIN_FRONTAL', pos: 'top-4 left-4', color: '#8b5cf6' }, { label: 'HYPERINTENSE', pos: 'top-[40%] left-[50%]', color: '#f59e0b', pulse: true }],
    findings: [
      { label: 'Brain parenchyma', detail: 'Normal signal. No mass effect.', s: 'ok' },
      { label: 'Ventricular system', detail: 'Symmetric. No hydrocephalus.', s: 'ok' },
      { label: 'Signal Abnormality', detail: 'Focal hyperintense region on T2.', s: 'warn' },
      { label: 'Midline structures', detail: 'No shift. Falx intact.', s: 'ok' },
    ],
    prompt: 'Analyze this MRI scan in detail. Identify all visible anatomical structures, signal abnormalities, and provide a comprehensive diagnostic report.',
  },
  ct: {
    title: 'CT Scan Analysis', sectionName: 'CT Scan', uploadLabel: 'Upload CT', studyPrefix: 'CTS', modality: 'CT',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="2"/></svg>,
    annotations: [{ label: 'ABDOMEN_UPPER', pos: 'top-4 left-4', color: '#14b8a6' }, { label: 'CALCIFICATION', pos: 'top-[50%] left-[45%]', color: '#f43f5e', pulse: true }],
    findings: [
      { label: 'Liver parenchyma', detail: 'Homogeneous. No focal lesions.', s: 'ok' },
      { label: 'No pleural effusion', detail: 'Angles clear bilaterally.', s: 'ok' },
      { label: 'Calcified focus', detail: '4mm density, right lower lobe.', s: 'warn' },
      { label: 'Vascular structures', detail: 'Aorta normal caliber.', s: 'ok' },
    ],
    prompt: 'Analyze this CT scan in detail. Identify all visible anatomical structures, any abnormalities, and provide a comprehensive diagnostic report.',
  },
};

export default function ScanAnalysis({ sectionKey, theme, activeSession, onSessionConsumed }) {
  const cfg = scanConfig[sectionKey];
  const dark = theme === 'dark';
  const [image, setImage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [text, setText] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [contrast, setContrast] = useState(100);
  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const sessionIdRef = useRef(null);
  const studyId = `${cfg.studyPrefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random()*99)+1).padStart(3,'0')}`;

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');

  const confirmExport = () => {
    setShowExportModal(false);
    exportDiagnosis(messages, cfg.sectionName, {
      name: patientName,
      age: patientAge,
      gender: patientGender,
      scanImage: image?.base64
    });
    setToast({ show: true, message: 'Report generated!' });
  };

  // Reset page state & auto-initialize session on tab switch
  useEffect(() => {
    setImage(null); setMessages([]); setLoading(false); setStreamingText(''); setText(''); setAnalyzing(false); setZoom(1); setContrast(100); sessionIdRef.current = null;
    apiCreateSession(sectionKey, `${cfg.sectionName} Analysis`)
      .then(session => { if (session) sessionIdRef.current = session.id || session._id; })
      .catch(() => {});
  }, [sectionKey]);

  // Load session history when activeSession is passed
  useEffect(() => {
    const load = async () => {
      if (activeSession && activeSession.section === sectionKey) {
        sessionIdRef.current = activeSession.id || activeSession._id;
        setMessages([]);
        setLoading(true);
        try {
          const msgs = await apiGetMessages(activeSession.id || activeSession._id);
          const loaded = msgs.map(m => ({
            role: m.role,
            text: m.content,
            image: m.imageUrl || null,
            timestamp: m.createdAt,
          }));
          setMessages(loaded);
          const firstImgMsg = loaded.find(m => m.role === 'user' && m.image);
          if (firstImgMsg) {
            setImage({ base64: firstImgMsg.image, name: 'Loaded Scan' });
          }
        } catch (err) {
          console.warn('Failed to load scan history:', err);
        } finally {
          setLoading(false);
          if (onSessionConsumed) onSessionConsumed();
        }
      }
    };
    load();
  }, [activeSession, sectionKey, onSessionConsumed]);

  const scrollDown = useCallback(() => { requestAnimationFrame(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }); }, []);
  useEffect(scrollDown, [messages, loading, streamingText, scrollDown]);

  const handleFile = (e) => {
    const file = e.target?.files?.[0] || e;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result;
      setImage({ base64: base64Data, name: file.name || 'scan.jpg' });
      autoAnalyze(base64Data);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const autoAnalyze = async (base64) => {
    setAnalyzing(true); setLoading(true); setStreamingText('');

    let currentSessId = sessionIdRef.current;
    if (!currentSessId) {
      try {
        const session = await apiCreateSession(sectionKey, `${cfg.sectionName} Analysis`);
        if (session) {
          currentSessId = session.id || session._id;
          sessionIdRef.current = currentSessId;
        }
      } catch (err) {
        console.warn('Session creation failed:', err.message);
      }
    }

    setMessages(p => [...p, { role: 'user', text: `Analyze this ${cfg.sectionName} image`, image: base64, timestamp: new Date().toISOString() }]);
    
    if (currentSessId) {
      apiSaveMessage(currentSessId, 'user', `Analyze this ${cfg.sectionName} image`, base64, { type: 'scan_upload' }).catch(() => {});
    }

    try {
      const reply = await callAPIStream(cfg.prompt, { base64 }, sectionKey, [], (partial) => { setStreamingText(partial); scrollDown(); });
      setMessages(p => [...p, { role: 'assistant', text: reply, timestamp: new Date().toISOString() }]);
      if (currentSessId) {
        apiSaveMessage(currentSessId, 'assistant', reply, null, { type: 'scan_analysis' }).catch(() => {});
      }
      setStreamingText('');
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', text: `**Error**: ${err.message}`, timestamp: new Date().toISOString() }]);
      setStreamingText('');
    } finally { setLoading(false); setAnalyzing(false); }
  };

  const sendMessage = async () => {
    if (!text.trim() || loading) return;

    let currentSessId = sessionIdRef.current;
    if (!currentSessId) {
      try {
        const session = await apiCreateSession(sectionKey, `${cfg.sectionName} Analysis`);
        if (session) {
          currentSessId = session.id || session._id;
          sessionIdRef.current = currentSessId;
        }
      } catch (err) {
        console.warn('Session creation failed:', err.message);
      }
    }

    const q = text.trim(); setText(''); setLoading(true); setStreamingText('');
    setMessages(p => [...p, { role: 'user', text: q, timestamp: new Date().toISOString() }]);
    
    if (currentSessId) {
      apiSaveMessage(currentSessId, 'user', q, null).catch(() => {});
    }

    try {
      const reply = await callAPIStream(q, image ? { base64: image.base64 } : null, sectionKey, messages, (partial) => { setStreamingText(partial); scrollDown(); });
      setMessages(p => [...p, { role: 'assistant', text: reply, timestamp: new Date().toISOString() }]);
      if (currentSessId) {
        apiSaveMessage(currentSessId, 'assistant', reply, null).catch(() => {});
      }
      setStreamingText('');
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', text: `**Error**: ${err.message}`, timestamp: new Date().toISOString() }]);
      setStreamingText('');
    } finally { setLoading(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) handleFile(file); };
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleExport = () => {
    if (!messages.length) return setToast({ show: true, message: 'No data' });
    setPatientName('');
    setPatientAge('');
    setPatientGender('Male');
    setShowExportModal(true);
  };
  const clearChat = () => { setMessages([]); setImage(null); setStreamingText(''); setZoom(1); setContrast(100); sessionIdRef.current = null; };

  const ToolBtn = ({ children, onClick, active, title }) => (
    <button onClick={onClick} title={title} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${active ? '' : ''}`}
      style={{ background: active ? 'rgba(122,215,198,0.15)' : 'transparent', color: active ? '#7ad7c6' : 'var(--outline)' }}>
      {children}
    </button>
  );

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

      {/* ═══ LEFT: DICOM Viewer ═══ */}
      <div className="w-[55%] flex flex-col min-h-0 max-lg:hidden" style={{ background: dark ? '#060e20' : '#0f172a' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(122,215,198,0.15)', color: '#7ad7c6' }}>{cfg.modality}</span>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{studyId}</span>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload {cfg.sectionName}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <ToolBtn onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title="Zoom In">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </ToolBtn>
            <ToolBtn onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </ToolBtn>
            <ToolBtn onClick={() => setZoom(1)} title="Reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </ToolBtn>
            <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <ToolBtn onClick={() => setContrast(c => Math.min(c + 20, 200))} title="Increase Contrast" active={contrast > 100}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3"/></svg>
            </ToolBtn>
            <ToolBtn onClick={() => setContrast(100)} title="Reset Contrast">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
            </ToolBtn>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center overflow-hidden relative" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            {image ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={image.base64} alt={cfg.title} className="max-w-full max-h-full object-contain transition-all duration-300"
                  style={{ transform: `scale(${zoom})`, filter: `contrast(${contrast}%)` }} />
                {/* Annotations */}
                {cfg.annotations.map((a, i) => (
                  <div key={i} className={`absolute ${a.pos} flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold text-white ${a.pulse ? 'animate-pulse' : ''}`}
                    style={{ background: a.color + 'cc', backdropFilter: 'blur(4px)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white" /> {a.label}
                  </div>
                ))}
                {/* Analyzing overlay */}
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="px-8 py-4 rounded-2xl flex flex-col items-center gap-3" style={{ background: 'rgba(11,19,38,0.95)' }}>
                      <div className="w-10 h-10 border-2 border-white/20 border-t-[#7ad7c6] rounded-full animate-spin" />
                      <span className="text-sm font-bold text-white font-display">Analyzing {cfg.sectionName}...</span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>AI Engine Processing</span>
                    </div>
                  </div>
                )}
                {/* DICOM info overlay */}
                <div className="absolute bottom-3 left-3 text-[10px] font-mono space-y-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <div>W: {Math.round(400*contrast/100)} L: {Math.round(40*contrast/100)}</div>
                  <div>Zoom: {Math.round(zoom*100)}%</div>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-5 w-full h-full group cursor-pointer">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{ background: 'rgba(122,215,198,0.06)', color: '#7ad7c6' }}>{cfg.icon}</div>
                <div className="text-center">
                  <p className="text-sm font-bold font-display text-white/80">{cfg.uploadLabel}</p>
                  <p className="text-xs text-white/30 mt-1">Drag & drop or click to browse</p>
                </div>
              </button>
            )}
          </div>

          {/* Findings Panel */}
          {image && (
            <div className="p-4 animate-fadeIn" style={{ background: dark ? '#0e1628' : '#131b2e' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold flex items-center gap-2 font-display text-white/80">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" style={{ color: '#7ad7c6' }}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                  Clinical Findings
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(122,215,198,0.1)', color: '#7ad7c6' }}>AI v2.4</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cfg.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: f.s === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                      {f.s === 'ok'
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" className="w-3 h-3"><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="#f59e0b"/></svg>
                      }
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white/90">{f.label}</p>
                      <p className="text-[10px] text-white/40 leading-tight mt-0.5">{f.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Diagnostic Chat ═══ */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: dark ? '#0b1326' : '#f8fafc' }}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', background: dark ? '#0d172e' : '#ffffff' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-display" style={{ color: 'var(--on-surface)' }}>{cfg.title}</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--outline)' }}>Study: {studyId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Image
            </button>
            <button onClick={handleExport} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', color: 'var(--on-surface)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 inline mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <button onClick={clearChat} className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">Clear</button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(122,215,198,0.08)', color: '#7ad7c6' }}>{cfg.icon}</div>
              <h3 className="text-sm font-bold mb-1 font-display" style={{ color: 'var(--on-surface)' }}>{cfg.title}</h3>
              <p className="text-xs max-w-sm" style={{ color: 'var(--outline)' }}>
                Upload an image or ask a diagnostic question to begin your automated clinical report.
              </p>
              <button onClick={() => fileRef.current?.click()} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
                Upload {cfg.sectionName} Image
              </button>
            </div>
          )}

          {messages.map((m, i) => (
            <Message key={i} message={m} theme={theme} section={sectionKey} />
          ))}

          {loading && streamingText && (
            <Message message={{ role: 'assistant', text: streamingText }} theme={theme} section={sectionKey} />
          )}

          {loading && !streamingText && (
            <div className="flex items-center gap-3 p-4 rounded-2xl animate-pulse"
              style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <div className="w-8 h-8 rounded-full bg-[#7ad7c6]/20 animate-spin flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#7ad7c6]" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Analyzing scan data...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', background: dark ? '#0d172e' : '#ffffff' }}>
          <div className="flex items-center gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about the scan..."
              className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-transparent border outline-none transition-all"
              style={{
                borderColor: dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
                color: 'var(--on-surface)',
                background: dark ? 'rgba(0,0,0,0.2)' : '#f8fafc',
              }} />
            <button onClick={sendMessage} disabled={!text.trim() || loading}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${text.trim() && !loading ? 'hover:scale-105' : 'opacity-40 cursor-not-allowed'}`}
              style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
              Send
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: '' })} theme={theme} />

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn"
            style={{ background: dark ? '#0d172e' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}>
            <h3 className="text-base font-bold mb-1 font-display" style={{ color: 'var(--on-surface)' }}>Export Diagnostic Report</h3>
            <p className="text-xs text-slate-400 mb-4">Enter patient details to include in the generated PDF report.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Patient Full Name</label>
                <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                  style={{ background: dark ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1', color: 'var(--on-surface)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Age</label>
                  <input type="number" value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="e.g. 45"
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{ background: dark ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1', color: 'var(--on-surface)' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Gender</label>
                  <select value={patientGender} onChange={e => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{ background: dark ? '#0d172e' : '#f8fafc', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1', color: 'var(--on-surface)' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={confirmExport} className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
