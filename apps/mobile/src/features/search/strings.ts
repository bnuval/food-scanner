import { defineStrings } from '@/i18n';
import type { SearchCategory } from '@/shared/api-schema';

/** Search tab strings. Trending terms are not here: they stay English (sent to the backend). */
export const searchStrings = defineStrings({
  en: {
    title: 'Find clean products',
    subtitle: 'Vetted picks available in {market}',

    categoryLabel: 'Product category',
    categoryFood: 'Food',
    categoryCosmetics: 'Cosmetics',

    placeholderFood: 'Organic ketchup, dark chocolate, oats…',
    placeholderCosmetics: 'Mineral sunscreen, toxin-free face wash…',
    fieldA11yFood: 'Search food products',
    fieldA11yCosmetics: 'Search cosmetics and personal-care products',
    fieldHint: 'Type a product, then press search',
    clearText: 'Clear search text',
    submit: 'Search',

    trending: 'Trending',
    trendingA11y: 'Search for {term}',

    recent: 'Recent searches',
    clearRecent: 'Clear',
    clearRecentA11y: 'Clear recent searches',
    recentA11y: 'Search again for {term}',

    introTitle: 'Find cleaner products',
    introBody: 'Search any food or personal-care item to see AI-rated options, with clean-label scores and links to stores.',

    loading: 'Finding vetted products…',
    waiting: 'Waiting for an internet connection…',

    resultsTitle: 'Suggested picks',
    resultsSubtitle: 'AI clean-label scores · available in {market}',
    vettedCountOne: '1 vetted',
    vettedCount: '{n} vetted',
    resultsA11yOne: '1 vetted product found',
    resultsA11y: '{n} vetted products found',

    emptyTitle: 'No highly rated options found',
    emptyBody: 'No highly rated options found for this search. Try a general term like “Peanut Butter” or “Ketchup”.',

    updateA11y: 'Update PureBite in the Play Store. Opens outside the app.',

    errorTitle: 'Search didn’t work',

    buyOn: 'Buy on',
    storeA11y: 'Buy {product} on {store}. Opens outside the app.',
    keyIngredients: 'Key ingredients: {list}',
    highlightsA11y: 'Highlights: {list}',

  },
  hi: {
    title: 'शुद्ध उत्पाद खोजें',
    subtitle: '{market} में उपलब्ध जाँचे-परखे विकल्प',

    categoryLabel: 'उत्पाद की श्रेणी',
    categoryFood: 'खाद्य',
    categoryCosmetics: 'कॉस्मेटिक्स',

    placeholderFood: 'ऑर्गेनिक केचप, डार्क चॉकलेट, ओट्स…',
    placeholderCosmetics: 'मिनरल सनस्क्रीन, टॉक्सिन-फ़्री फ़ेस वॉश…',
    fieldA11yFood: 'खाद्य उत्पाद खोजें',
    fieldA11yCosmetics: 'कॉस्मेटिक्स और पर्सनल-केयर उत्पाद खोजें',
    fieldHint: 'उत्पाद का नाम लिखें, फिर खोजें दबाएँ',
    clearText: 'खोज का टेक्स्ट मिटाएँ',
    submit: 'खोजें',

    trending: 'ट्रेंडिंग',
    trendingA11y: '{term} खोजें',

    recent: 'हाल की खोजें',
    clearRecent: 'मिटाएँ',
    clearRecentA11y: 'हाल की खोजें मिटाएँ',
    recentA11y: '{term} फिर से खोजें',

    introTitle: 'बेहतर और शुद्ध उत्पाद खोजें',
    introBody: 'कोई भी खाद्य या पर्सनल-केयर उत्पाद खोजें और AI से आँके गए विकल्प, क्लीन-लेबल स्कोर और स्टोर लिंक के साथ देखें।',

    loading: 'जाँचे-परखे उत्पाद खोजे जा रहे हैं…',
    waiting: 'इंटरनेट कनेक्शन का इंतज़ार है…',

    resultsTitle: 'सुझाए गए विकल्प',
    resultsSubtitle: 'AI क्लीन-लेबल स्कोर · {market} में उपलब्ध',
    vettedCountOne: '1 जाँचा-परखा',
    vettedCount: '{n} जाँचे-परखे',
    resultsA11yOne: '1 जाँचा-परखा उत्पाद मिला',
    resultsA11y: '{n} जाँचे-परखे उत्पाद मिले',

    emptyTitle: 'अच्छे स्कोर वाला कोई विकल्प नहीं मिला',
    emptyBody: 'इस खोज के लिए अच्छे स्कोर वाला कोई विकल्प नहीं मिला। “Peanut Butter” या “Ketchup” जैसा कोई सामान्य शब्द आज़माएँ।',

    updateA11y: 'Play Store में PureBite अपडेट करें। ऐप के बाहर खुलेगा।',

    errorTitle: 'खोज पूरी नहीं हो सकी',

    buyOn: 'यहाँ से खरीदें',
    storeA11y: '{product} को {store} पर खरीदें। ऐप के बाहर खुलेगा।',
    keyIngredients: 'मुख्य सामग्री: {list}',
    highlightsA11y: 'खूबियाँ: {list}',

  },
});

export type SearchStrings = (typeof searchStrings)['en'];

/**
 * Suggestion terms per category. Kept in English in every UI language because they are
 * sent to the backend verbatim (mirrors the web app).
 */
export const TRENDING: Record<SearchCategory, readonly string[]> = {
  food: ['Tomato Ketchup', 'Peanut Butter', 'Protein Bar', 'Cold Pressed Oil'],
  cosmetics: ['Mineral Sunscreen', 'Niacinamide', 'Hair Oil', 'Lip Balm'],
};
