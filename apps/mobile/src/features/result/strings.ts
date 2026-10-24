import { defineStrings } from '@/i18n';

/** UI strings for the scan result screen (/result/[id]). */
export const resultStrings = defineStrings({
  en: {
    title: 'Result',
    loading: 'Loading result',
    productFallback: 'Unnamed product',
    scannedOn: 'Scanned {date}',

    notFoundTitle: 'This result isn’t available',
    notFoundBody: 'It may have been deleted from your history.',
    scanProduct: 'Scan a product',
    loadErrorTitle: 'Couldn’t open this result',
    loadErrorBody: 'Something went wrong while reading your scan history.',

    unreadable: 'The label was hard to read, so this score may be less accurate.',

    explanationLanguage: 'Explanation language',
    langEnglish: 'English',
    langHindi: 'हिन्दी',
    langEnglishA11y: 'English',
    langHindiA11y: 'Hindi',

    whyBuy: 'Why you should buy',
    whyAvoid: 'Why you should avoid',
    noReason: 'No explanation was provided for this product.',

    ingredientsTitle: 'Ingredients of concern',
    ingredientsCount: '{count} flagged',
    noFlagged: 'No ingredients of concern were found.',
    showMore: 'Show more',
    showLess: 'Show less',
    showMoreA11y: 'Show more about {name}',
    showLessA11y: 'Show less about {name}',

    highlightsTitle: 'Nutritional strengths',

    complianceTitle: 'Regulatory notes for {market}',

    altAvoidTitle: 'Healthier alternatives',
    altBuyTitle: 'Similar top-rated choices',
    altSubtitle: 'Available in {market}',
    altEmpty: 'No alternatives were suggested for this product.',
    altPointsOne: '+1 point',
    altPoints: '+{n} points',
    altPointsA11yOne: '1 point higher than this product',
    altPointsA11y: '{n} points higher than this product',
    buyOn: 'Buy on {store}',
    buyOnA11y: 'Buy {product} on {store}',

    reportProblem: 'Report a problem with this result',
    reportSubject: 'Problem with a PureBite result',
    reportBody: 'Product: {product}\nScanned: {date}\n\nWhat looks wrong?\n',
    noEmailApp: 'No email app was found. You can write to us at {email}.',

    shareA11y: 'Share result',
    shareHead: '{name}: {score}/100 — {verdict}',
    shareSeparator: '. ',

    deleteA11y: 'Delete scan',
    deleteTitle: 'Delete this scan?',
    deleteMessage: 'It will be removed from your history on this device.',
    deleteFailed: 'Couldn’t delete this scan. Please try again.',

  },
  hi: {
    title: 'नतीजा',
    loading: 'नतीजा लोड हो रहा है',
    productFallback: 'बिना नाम का प्रोडक्ट',
    scannedOn: '{date} को स्कैन किया',

    notFoundTitle: 'यह नतीजा उपलब्ध नहीं है',
    notFoundBody: 'हो सकता है इसे आपके इतिहास से हटा दिया गया हो।',
    scanProduct: 'प्रोडक्ट स्कैन करें',
    loadErrorTitle: 'यह नतीजा खुल नहीं सका',
    loadErrorBody: 'आपका स्कैन इतिहास पढ़ते समय कुछ गड़बड़ हुई।',

    unreadable: 'लेबल साफ़ नहीं पढ़ा जा सका, इसलिए यह स्कोर कम सटीक हो सकता है।',

    explanationLanguage: 'विवरण की भाषा',
    langEnglish: 'English',
    langHindi: 'हिन्दी',
    langEnglishA11y: 'अंग्रेज़ी',
    langHindiA11y: 'हिन्दी',

    whyBuy: 'इसे क्यों खरीदें',
    whyAvoid: 'इसे क्यों न खरीदें',
    noReason: 'इस प्रोडक्ट के लिए कोई कारण नहीं बताया गया।',

    ingredientsTitle: 'चिंताजनक सामग्री',
    ingredientsCount: '{count} सामग्री चिह्नित',
    noFlagged: 'कोई चिंताजनक सामग्री नहीं मिली।',
    showMore: 'और दिखाएँ',
    showLess: 'कम दिखाएँ',
    showMoreA11y: '{name} के बारे में और दिखाएँ',
    showLessA11y: '{name} के बारे में कम दिखाएँ',

    highlightsTitle: 'पोषण से जुड़ी खूबियाँ',

    complianceTitle: '{market} के लिए नियामक जानकारी',

    altAvoidTitle: 'सेहतमंद विकल्प',
    altBuyTitle: 'मिलते-जुलते बेहतरीन विकल्प',
    altSubtitle: '{market} में उपलब्ध',
    altEmpty: 'इस प्रोडक्ट के लिए कोई विकल्प नहीं सुझाया गया।',
    altPointsOne: '+1 अंक',
    altPoints: '+{n} अंक',
    altPointsA11yOne: 'इस प्रोडक्ट से 1 अंक ज़्यादा',
    altPointsA11y: 'इस प्रोडक्ट से {n} अंक ज़्यादा',
    buyOn: '{store} पर खरीदें',
    buyOnA11y: '{product} को {store} पर खरीदें',

    reportProblem: 'इस नतीजे में समस्या की रिपोर्ट करें',
    reportSubject: 'PureBite नतीजे में समस्या',
    reportBody: 'प्रोडक्ट: {product}\nस्कैन की तारीख: {date}\n\nक्या गलत लग रहा है?\n',
    noEmailApp: 'कोई ईमेल ऐप नहीं मिला। आप हमें {email} पर लिख सकते हैं।',

    shareA11y: 'नतीजा शेयर करें',
    shareHead: '{name}: {score}/100 — {verdict}',
    shareSeparator: '। ',

    deleteA11y: 'स्कैन हटाएँ',
    deleteTitle: 'यह स्कैन हटाएँ?',
    deleteMessage: 'इसे इस डिवाइस पर आपके इतिहास से हटा दिया जाएगा।',
    deleteFailed: 'यह स्कैन हटाया नहीं जा सका। कृपया फिर से कोशिश करें।',

  },
});

export type ResultStrings = (typeof resultStrings)['en'];
