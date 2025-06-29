import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import * as RNLocalize from 'react-native-localize';

// Language resources
import en from './locales/en.json';
import tr from './locales/tr.json';
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
};

// Get device language with fallback
const getDeviceLanguage = (): string => {
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    const deviceLanguage = locales[0].languageCode;
    // Check if we support this language
    if (['en', 'tr', 'de'].includes(deviceLanguage)) {
      return deviceLanguage;
    }
  }
  return 'en'; // fallback
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    debug: __DEV__,
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n; 