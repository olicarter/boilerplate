import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

function applyDir(lng: string) {
  document.documentElement.dir = RTL_LANGS.has(lng.split('-')[0]) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })
  .then(() => applyDir(i18n.language));

i18n.on('languageChanged', applyDir);

export default i18n;
