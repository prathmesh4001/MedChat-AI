import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadTranslations, getLangMeta, LANGUAGES } from '../i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('medchat-lang') || 'en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadTranslations(lang).then((dict) => {
      if (!cancelled) {
        setTranslations(dict);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((code) => {
    localStorage.setItem('medchat-lang', code);
    setLangState(code);
  }, []);

  /**
   * Translate a key. Falls back to the key itself if not found.
   * Supports simple template interpolation: t('key', { name: 'X' })
   */
  const t = useCallback((key, params) => {
    let val = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return val;
  }, [translations]);

  const langMeta = getLangMeta(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langMeta, languages: LANGUAGES, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
