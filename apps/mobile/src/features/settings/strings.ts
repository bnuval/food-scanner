import { defineStrings } from '@/i18n';

export const settingsStrings = defineStrings({
  en: {
    languageTitle: 'Language',
    languageSystem: 'System default',
    languageSystemHint: 'Follows your phone’s language',
    languageEnglish: 'English',
    languageHindi: 'हिन्दी',
    languageNote: 'AI explanations are in English and, for India, also in Hindi.',

    marketSubtitle:
      'Decides which healthier alternatives and store links you see, and which food regulations are applied.',
    marketAuto: 'Automatic — {market}',
    marketAutoHint: 'Based on your phone’s time zone',

    appearanceTitle: 'Appearance',
    themeSystem: 'System default',
    themeLight: 'Light',
    themeDark: 'Dark',

    privacyTitle: 'Privacy & data',
    privacyBody:
      'Label photos are sent securely to the PureBite server only for analysis. Scan history stays on this device and is never backed up.',
    clearHistory: 'Clear scan history',
    savedScansOne: '1 saved scan',
    savedScansOther: '{count} saved scans',
    savedScansNone: 'No saved scans',
    historyCleared: 'Scan history cleared.',
    privacyPolicy: 'Privacy policy',
    terms: 'Terms of use',
    opensInBrowser: 'Opens in your browser',

    aboutTitle: 'About',
    version: 'Version',
    disclaimerTitle: 'Health disclaimer',
    licensesTitle: 'Open-source notices',
    licensesBody: 'Icons: Material Icons (Apache 2.0). Hindi font: Noto Sans Devanagari (SIL OFL 1.1).',
    apiServer: 'API server (debug build)',
    apiNotConfigured: 'Not configured',
  },
  hi: {
    languageTitle: 'भाषा',
    languageSystem: 'सिस्टम के अनुसार',
    languageSystemHint: 'आपके फ़ोन की भाषा के अनुसार',
    languageEnglish: 'English',
    languageHindi: 'हिन्दी',
    languageNote: 'AI के विवरण अंग्रेज़ी में होते हैं, और भारत के लिए हिन्दी में भी।',

    marketSubtitle: 'इसी से तय होता है कि आपको कौन-से बेहतर विकल्प और स्टोर लिंक दिखें, और कौन-से खाद्य नियम लागू हों।',
    marketAuto: 'अपने-आप — {market}',
    marketAutoHint: 'आपके फ़ोन के टाइम ज़ोन के आधार पर',

    appearanceTitle: 'थीम',
    themeSystem: 'सिस्टम के अनुसार',
    themeLight: 'हल्की',
    themeDark: 'गहरी',

    privacyTitle: 'निजता और डेटा',
    privacyBody:
      'लेबल की फ़ोटो सिर्फ़ जाँच के लिए सुरक्षित तरीके से PureBite सर्वर पर भेजी जाती हैं। स्कैन इतिहास इसी डिवाइस पर रहता है और उसका कभी बैकअप नहीं लिया जाता।',
    clearHistory: 'स्कैन इतिहास मिटाएँ',
    savedScansOne: '1 सेव किया गया स्कैन',
    savedScansOther: '{count} सेव किए गए स्कैन',
    savedScansNone: 'कोई स्कैन सेव नहीं है',
    historyCleared: 'स्कैन इतिहास मिटा दिया गया।',
    privacyPolicy: 'निजता नीति',
    terms: 'इस्तेमाल की शर्तें',
    opensInBrowser: 'आपके ब्राउज़र में खुलता है',

    aboutTitle: 'ऐप के बारे में',
    version: 'संस्करण',
    disclaimerTitle: 'स्वास्थ्य संबंधी सूचना',
    licensesTitle: 'ओपन-सोर्स सूचनाएँ',
    licensesBody: 'आइकन: Material Icons (Apache 2.0)। हिन्दी फ़ॉन्ट: Noto Sans Devanagari (SIL OFL 1.1)।',
    apiServer: 'API सर्वर (डीबग बिल्ड)',
    apiNotConfigured: 'सेट नहीं है',
  },
});
