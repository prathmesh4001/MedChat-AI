import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function InputArea({ theme, section, image, setImage, onSend, loading }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const textRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);
  const canSend = (text.trim() || image) && !loading;
  const dark = theme === 'dark';
  const { t, langMeta } = useLanguage();

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 150) + 'px';
    }
  }, [text]);

  useEffect(() => { return () => { if (recognitionRef.current) recognitionRef.current.abort(); }; }, []);

  const handleSend = () => { if (!canSend) return; onSend(text); setText(''); };
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage({ base64: ev.target.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage({ base64: ev.target.result, name: file.name });
      reader.readAsDataURL(file);
    }
  };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = langMeta.bcp47;
    let ft = text;
    r.onresult = (e) => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) ft += (ft ? ' ' : '') + t; else interim = t; } setText(ft + (interim ? ' ' + interim : '')); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false);
    recognitionRef.current = r; r.start(); setListening(true);
  };

  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="px-4 md:px-6 pt-3 pb-3" style={{ background: dark ? '#131b2e' : '#ffffff' }} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
      {image && (
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2.5 rounded-2xl animate-fadeIn" style={{ background: dark ? 'rgba(122,215,198,0.04)' : 'rgba(0,121,107,0.04)' }}>
          <div className="relative rounded-xl overflow-hidden">
            <img src={image.base64} alt="Preview" className="w-12 h-12 object-cover rounded-xl" />
            <button onClick={() => setImage(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>{t('image_attached')}</span>
        </div>
      )}

      <div className="flex items-end gap-1.5 px-2 py-1.5 rounded-2xl transition-all duration-300"
        style={{
          background: dark ? 'var(--surface-highest)' : 'var(--surface-container)',
          boxShadow: `inset 0 0 0 1px ${dark ? 'rgba(63,73,73,0.2)' : 'rgba(203,213,225,0.4)'}`,
        }}>
        <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105" style={{ color: 'var(--outline)' }} title={t('upload_image')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

        {hasSR && (
          <button onClick={toggleVoice} className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105 ${listening ? 'animate-pulse' : ''}`}
            style={{ color: listening ? '#f43f5e' : 'var(--outline)' }} title={listening ? t('stop') : t('voice')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          </button>
        )}

        <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
          placeholder={listening ? t('listening') : t('type_query')}
          rows={1} className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed py-2.5 px-2 min-h-[40px] max-h-[150px]"
          style={{ color: 'var(--on-surface)' }} />

        <button onClick={handleSend} disabled={!canSend}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 text-white ${canSend ? 'hover:scale-105 hover:shadow-lg' : 'opacity-25 cursor-not-allowed'}`}
          style={{ background: canSend ? 'linear-gradient(135deg, #7ad7c6, #006156)' : 'var(--outline)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
