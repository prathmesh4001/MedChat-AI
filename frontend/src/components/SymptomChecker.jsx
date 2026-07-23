import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Medical Avatar SVG component
function MedicalAvatar({ thinking, dark }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3 w-[140px] shrink-0">
      {/* Avatar */}
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden animate-glow"
          style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}>
          <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
            {/* Head */}
            <circle cx="40" cy="24" r="14" fill="white" opacity="0.9" />
            {/* Eyes */}
            <circle cx="35" cy="22" r="2" fill="#006156" />
            <circle cx="45" cy="22" r="2" fill="#006156" />
            {/* Smile */}
            <path d="M35 28 Q40 33 45 28" stroke="#006156" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Body */}
            <path d="M22 75 L22 50 Q22 42 30 42 L50 42 Q58 42 58 50 L58 75" fill="white" opacity="0.9" />
            {/* Stethoscope */}
            <path d="M35 42 L35 52 Q35 58 40 58 Q45 58 45 52 L45 42" stroke="#7ad7c6" strokeWidth="2.5" fill="none" />
            <circle cx="40" cy="60" r="3" fill="#7ad7c6" />
            {/* Cross on coat */}
            <line x1="40" y1="47" x2="40" y2="55" stroke="#006156" strokeWidth="2" />
            <line x1="36" y1="51" x2="44" y2="51" stroke="#006156" strokeWidth="2" />
          </svg>
        </div>
        {/* Pulse indicator */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 flex items-center justify-center"
          style={{ borderColor: dark ? '#0b1326' : '#ffffff' }}>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </div>
      </div>

      <span className="text-[0.7rem] font-bold text-center font-display" style={{ color: 'var(--primary)' }}>{t('dr_medchat')}</span>

      {/* Thinking bubble */}
      {thinking && (
        <div className="relative animate-fadeIn">
          <div className="px-4 py-3 rounded-2xl text-center max-w-[160px]"
            style={{ background: dark ? 'var(--surface-container)' : 'var(--surface-container)', boxShadow: `inset 0 0 0 1px ${dark ? 'rgba(122,215,198,0.15)' : 'rgba(0,121,107,0.1)'}` }}>
            {/* Thinking dots animation */}
            <div className="flex items-center justify-center gap-1 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>{t('thinking')}</span>
              <span className="flex gap-0.5">
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: `${d}s` }} />
                ))}
              </span>
            </div>
            <p className="text-[0.72rem] font-semibold italic leading-snug" style={{ color: 'var(--on-surface-variant)' }}>"{thinking}"</p>
          </div>
          {/* Speech bubble tail */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{ background: dark ? 'var(--surface-container)' : 'var(--surface-container)' }} />
        </div>
      )}
    </div>
  );
}

// Progress bar
function ProgressBar({ step, total, dark }) {
  const { t } = useLanguage();
  const pct = ((step) / total) * 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>{t('assessment_progress')}</span>
        <span className="text-[0.65rem] font-bold" style={{ color: 'var(--primary)' }}>{step} / {total}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7ad7c6, #006156)' }} />
      </div>
    </div>
  );
}

export default function SymptomChecker({ mcqData, onAnswer, theme, retryInfo }) {
  const dark = theme === 'dark';
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  // Reset when new question comes
  useEffect(() => {
    setSelected(null);
    setConfirmed(false);
    setShowOther(false);
    setOtherText('');
  }, [mcqData?.question]);

  if (!mcqData) return null;

  const isRetry = retryInfo && retryInfo.attempts > 0;
  const previousAnswers = retryInfo?.previousAnswers || [];
  const maxRetries = 2;
  const canRetry = (retryInfo?.attempts || 0) < maxRetries;

  // Select an option (no auto-advance — user must confirm)
  const handleSelect = (idx) => {
    if (confirmed) return;
    setShowOther(false);
    setSelected(idx);
  };

  // Confirm the selected answer
  const handleConfirm = () => {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    setTimeout(() => {
      onAnswer(mcqData.options[selected], false);
    }, 500);
  };

  // Select "Other" option
  const handleOtherSelect = () => {
    if (confirmed) return;
    setSelected(null);
    setShowOther(true);
  };

  // Submit custom "Other" answer
  const handleOtherSubmit = () => {
    if (!otherText.trim() || confirmed) return;
    setConfirmed(true);
    setTimeout(() => {
      onAnswer(otherText.trim(), true);
    }, 500);
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex gap-6 max-w-[900px] w-full mx-auto animate-fadeIn px-4">
      {/* Left: Avatar */}
      <MedicalAvatar thinking={mcqData.thinking} dark={dark} />

      {/* Right: MCQ Card */}
      <div className="flex-1 min-w-0">
        <ProgressBar step={mcqData.step} total={mcqData.totalSteps} dark={dark} />

        {/* Retry feedback banner */}
        {isRetry && retryInfo?.feedback && (
          <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl animate-fadeIn"
            style={{ background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', color: '#f59e0b' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm font-medium">{retryInfo.feedback || t('reconsider')}</span>
          </div>
        )}

        <div className="mt-4 rounded-3xl overflow-hidden" style={{ background: dark ? 'var(--surface-container)' : 'var(--surface)', boxShadow: `inset 0 0 0 1px ${dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)'}` }}>
          {/* Question */}
          <div className="px-6 py-5" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)', color: 'var(--primary)' }}>
                {t('question')} {mcqData.step}
              </span>
              {isRetry && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', color: '#f59e0b' }}>
                  {t('retry')} {retryInfo.attempts}/{maxRetries}
                </span>
              )}
              <span className="text-[10px] font-medium" style={{ color: 'var(--outline)' }}>
                {showOther ? t('type_answer') : t('select_option')}
              </span>
            </div>
            <h3 className="text-base font-bold leading-relaxed font-display" style={{ color: 'var(--on-surface)' }}>{mcqData.question}</h3>
          </div>

          {/* Options */}
          <div className="p-4 space-y-2.5">
            {mcqData.options.map((opt, i) => {
              const isSelected = selected === i;
              const isConfirmed = confirmed && isSelected;
              const isDimmed = confirmed && !isSelected;
              const wasPreviouslySelected = previousAnswers.includes(opt);

              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={confirmed || wasPreviouslySelected}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${isDimmed ? 'opacity-30 scale-[0.98]' : ''} ${wasPreviouslySelected ? 'opacity-40' : ''}`}
                  style={{
                    background: isConfirmed
                      ? 'linear-gradient(135deg, rgba(122,215,198,0.15), rgba(0,97,86,0.1))'
                      : isSelected
                        ? (dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.04)')
                        : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                    boxShadow: isConfirmed
                      ? `inset 0 0 0 2px ${dark ? 'rgba(122,215,198,0.4)' : 'rgba(0,121,107,0.3)'}`
                      : isSelected
                        ? `inset 0 0 0 2px ${dark ? 'rgba(122,215,198,0.2)' : 'rgba(0,121,107,0.15)'}`
                        : `inset 0 0 0 1px ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    transform: isConfirmed ? 'scale(1.01)' : '',
                    textDecoration: wasPreviouslySelected ? 'line-through' : 'none',
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold font-display transition-all duration-300"
                    style={{
                      background: isConfirmed
                        ? 'linear-gradient(135deg, #7ad7c6, #006156)'
                        : isSelected
                          ? (dark ? 'rgba(122,215,198,0.15)' : 'rgba(0,121,107,0.12)')
                          : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                      color: isConfirmed ? 'white' : isSelected ? 'var(--primary)' : 'var(--on-surface-variant)',
                    }}>
                    {isConfirmed ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : wasPreviouslySelected ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : optionLabels[i]}
                  </div>
                  <span className="text-sm font-medium" style={{ color: isConfirmed ? 'var(--primary)' : wasPreviouslySelected ? 'var(--outline)' : 'var(--on-surface-variant)' }}>{opt}</span>
                </button>
              );
            })}

            {/* "Other" Option */}
            <button onClick={handleOtherSelect} disabled={confirmed}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${confirmed && !showOther ? 'opacity-30 scale-[0.98]' : ''}`}
              style={{
                background: showOther
                  ? (dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.04)')
                  : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                boxShadow: showOther
                  ? `inset 0 0 0 2px ${dark ? 'rgba(122,215,198,0.2)' : 'rgba(0,121,107,0.15)'}`
                  : `inset 0 0 0 1px dashed ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold font-display transition-all duration-300"
                style={{
                  background: showOther
                    ? (dark ? 'rgba(122,215,198,0.15)' : 'rgba(0,121,107,0.12)')
                    : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  color: showOther ? 'var(--primary)' : 'var(--on-surface-variant)',
                }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-sm font-medium" style={{ color: showOther ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{t('other_option')}</span>
            </button>

            {/* Other text input (expanded) */}
            {showOther && !confirmed && (
              <div className="animate-fadeIn px-2 pb-2">
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleOtherSubmit(); }}
                    placeholder={t('describe_symptom')}
                    autoFocus
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      color: 'var(--on-surface)',
                      boxShadow: `inset 0 0 0 1px ${dark ? 'rgba(122,215,198,0.15)' : 'rgba(0,121,107,0.1)'}`,
                    }}
                  />
                  <button onClick={handleOtherSubmit} disabled={!otherText.trim()}
                    className="px-4 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{ background: otherText.trim() ? 'linear-gradient(135deg, #7ad7c6, #006156)' : 'var(--outline)' }}>
                    {t('submit')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Button (only when an MCQ option is selected, not "Other") */}
          {selected !== null && !confirmed && !showOther && (
            <div className="px-4 pb-4 animate-fadeIn">
              <button onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl text-sm font-bold font-display text-white transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', boxShadow: '0 4px 20px rgba(122,215,198,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('confirm_answer')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
