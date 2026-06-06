import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ro from '@/shared/locales/ro.json';
import en from '@/shared/locales/en.json';

// Sync <html lang> with the active locale so screen readers use the correct
// pronunciation rules. Registered before init() to catch the startup detection.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
    },
    fallbackLng: 'ro',
    supportedLngs: ['ro', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      // Romanian by default: only honour an explicit in-app choice stored in
      // localStorage. The browser language is intentionally ignored so the UI
      // stays Romanian unless the user picks otherwise from the profile page.
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

export default i18n;
