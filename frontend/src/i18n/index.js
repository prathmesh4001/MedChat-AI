/**
 * i18n — Language registry & dynamic locale loader.
 * All translations live in ./locales/<code>.json and are imported lazily.
 */

export const LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English',   bcp47: 'en-US' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',      bcp47: 'hi-IN' },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা',       bcp47: 'bn-IN' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',      bcp47: 'te-IN' },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी',       bcp47: 'mr-IN' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',       bcp47: 'ta-IN' },
  { code: 'gu', name: 'Gujarati',  nativeName: 'ગુજરાતી',     bcp47: 'gu-IN' },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ',       bcp47: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',      bcp47: 'ml-IN' },
  { code: 'pa', name: 'Punjabi',   nativeName: 'ਪੰਜਾਬੀ',      bcp47: 'pa-IN' },
  { code: 'ur', name: 'Urdu',      nativeName: 'اردو',        bcp47: 'ur-IN' },
];

const localeImporters = {
  en: () => import('./locales/en.json'),
  hi: () => import('./locales/hi.json'),
  bn: () => import('./locales/bn.json'),
  te: () => import('./locales/te.json'),
  mr: () => import('./locales/mr.json'),
  ta: () => import('./locales/ta.json'),
  gu: () => import('./locales/gu.json'),
  kn: () => import('./locales/kn.json'),
  ml: () => import('./locales/ml.json'),
  pa: () => import('./locales/pa.json'),
  ur: () => import('./locales/ur.json'),
};

/** Lazily load translations for a given language code.
 *  Always merges with English as fallback so missing keys show English text
 *  instead of raw key names.
 */
export async function loadTranslations(code) {
  // Always load English as the base
  const enMod = await localeImporters.en();
  const enDict = enMod.default || enMod;

  if (code === 'en') return enDict;

  const importer = localeImporters[code];
  if (!importer) {
    console.warn(`No locale found for "${code}", falling back to English.`);
    return enDict;
  }

  const mod = await importer();
  const localeDict = mod.default || mod;

  // Merge: locale overrides English defaults
  return { ...enDict, ...localeDict };
}

/** Get language metadata by code. */
export function getLangMeta(code) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}
