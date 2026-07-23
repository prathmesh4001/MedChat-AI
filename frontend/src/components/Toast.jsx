import { useEffect } from 'react';

export default function Toast({ message, show, onClose, theme }) {
  const dark = theme === 'dark';

  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 2500);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slideIn">
      <div className="px-5 py-2.5 rounded-2xl text-sm font-semibold backdrop-blur-2xl"
        style={{
          background: dark ? 'rgba(19,27,46,0.9)' : 'rgba(255,255,255,0.9)',
          color: 'var(--primary)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        }}>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {message}
        </div>
      </div>
    </div>
  );
}
