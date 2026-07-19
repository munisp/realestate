import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en.json';
import yoTranslations from './locales/yo.json';
import igTranslations from './locales/ig.json';
import haTranslations from './locales/ha.json';
import swTranslations from './locales/sw.json';
import frTranslations from './locales/fr.json';
import arTranslations from './locales/ar.json';

const resources = {
  en: { translation: enTranslations },
  yo: { translation: yoTranslations }, // Yoruba
  ig: { translation: igTranslations }, // Igbo
  ha: { translation: haTranslations }, // Hausa
  sw: { translation: swTranslations }, // Swahili
  fr: { translation: frTranslations }, // French
  ar: { translation: arTranslations }, // Arabic
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'yo', 'ig', 'ha', 'sw', 'fr', 'ar'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', rtl: false },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', rtl: false },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', rtl: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
];
