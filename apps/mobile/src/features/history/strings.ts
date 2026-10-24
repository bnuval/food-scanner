import { defineStrings } from '@/i18n';

export const historyStrings = defineStrings({
  en: {
    countOne: '1 scan on this device',
    countOther: '{count} scans on this device',
    clearAll: 'Clear all history',
    clearTitle: 'Clear scan history?',
    clearMessage: 'All saved scans and their photos will be permanently removed from this device.',
    clearConfirm: 'Clear all',
    cleared: 'Scan history cleared.',
    clearFailed: 'Couldn’t clear your history. Please try again.',

    filterAll: 'All',
    filterA11y: 'Filter: {filter}',

    today: 'Today, {time}',
    yesterday: 'Yesterday, {time}',

    emptyTitle: 'No scans yet',
    emptyBody: 'Your scans are saved only on this device.',
    emptyAction: 'Scan a product',
    filteredEmptyBuy: 'None of your scans got a “Buy” verdict yet.',
    filteredEmptyAvoid: 'None of your scans got an “Avoid” verdict yet.',
    showAll: 'Show all scans',

    loading: 'Loading your scan history',
    loadFailed: 'Couldn’t load your scan history.',

    untitled: 'Unnamed product',
    rowHint: 'Opens the full result',
    verdictA11y: 'Verdict: {verdict}',
    scannedA11y: 'Scanned {date}',
    deleteAction: 'Delete',
    deleteTitle: 'Delete this scan?',
    deleteMessage: '“{name}” will be removed from this device.',
    deleted: 'Scan deleted.',
    deleteFailed: 'Couldn’t delete this scan. Please try again.',
  },
  hi: {
    countOne: 'इस डिवाइस पर 1 स्कैन',
    countOther: 'इस डिवाइस पर {count} स्कैन',
    clearAll: 'पूरा इतिहास मिटाएँ',
    clearTitle: 'स्कैन इतिहास मिटाएँ?',
    clearMessage: 'सभी सेव किए गए स्कैन और उनकी फ़ोटो इस डिवाइस से हमेशा के लिए हट जाएँगी।',
    clearConfirm: 'सब मिटाएँ',
    cleared: 'स्कैन इतिहास मिटा दिया गया।',
    clearFailed: 'इतिहास नहीं मिटाया जा सका। कृपया फिर से कोशिश करें।',

    filterAll: 'सभी',
    filterA11y: 'फ़िल्टर: {filter}',

    today: 'आज, {time}',
    yesterday: 'कल, {time}',

    emptyTitle: 'अभी तक कोई स्कैन नहीं',
    emptyBody: 'आपके स्कैन सिर्फ़ इसी डिवाइस पर सेव होते हैं।',
    emptyAction: 'कोई प्रोडक्ट स्कैन करें',
    filteredEmptyBuy: 'अभी तक आपके किसी स्कैन को “खरीदें” का फ़ैसला नहीं मिला है।',
    filteredEmptyAvoid: 'अभी तक आपके किसी स्कैन को “न खरीदें” का फ़ैसला नहीं मिला है।',
    showAll: 'सभी स्कैन दिखाएँ',

    loading: 'आपका स्कैन इतिहास लोड हो रहा है',
    loadFailed: 'आपका स्कैन इतिहास लोड नहीं हो सका।',

    untitled: 'बिना नाम का प्रोडक्ट',
    rowHint: 'पूरा नतीजा खोलता है',
    verdictA11y: 'फ़ैसला: {verdict}',
    scannedA11y: 'स्कैन किया गया: {date}',
    deleteAction: 'हटाएँ',
    deleteTitle: 'यह स्कैन हटाएँ?',
    deleteMessage: '“{name}” इस डिवाइस से हटा दिया जाएगा।',
    deleted: 'स्कैन हटा दिया गया।',
    deleteFailed: 'यह स्कैन हटाया नहीं जा सका। कृपया फिर से कोशिश करें।',
  },
});
