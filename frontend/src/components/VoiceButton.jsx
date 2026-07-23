import { useState, useEffect, useRef } from 'react';

export default function VoiceButton({ text, theme }) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);
  const dark = theme === 'dark';

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleSpeak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    let cleanText = text
      .replace(/#{1,4}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[^`]+```/g, '')
      .replace(/^[-*]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/---/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .trim();

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;

    const voices = synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en-') && v.localService)
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    utterRef.current = utter;
    synth.cancel();
    synth.speak(utter);
    setSpeaking(true);
  };

  if (!window.speechSynthesis) return null;

  return (
    <button
      onClick={toggleSpeak}
      title={speaking ? 'Stop speaking' : 'Listen to response'}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
        ${speaking
          ? 'bg-blue-500/20 text-blue-400 animate-pulse'
          : dark
            ? 'text-slate-500 hover:text-blue-400 hover:bg-white/5'
            : 'text-slate-400 hover:text-blue-500 hover:bg-black/[0.04]'
        }`}
    >
      {speaking ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
