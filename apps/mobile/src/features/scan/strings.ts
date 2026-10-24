import { defineStrings } from '@/i18n';

/** Scan tab strings. Shared words (retry, open settings, app name, offline) live in common.ts. */
export const scanStrings = defineStrings({
  en: {
    stepChip: 'Photo {n} of {total} · {slot}',
    stepChipFull: 'All {total} photos added',
    slotIngredients: 'Ingredients list',
    slotNutrition: 'Nutrition table',
    slotFront: 'Front of pack / barcode',
    hint: 'Fill the frame with the label and hold steady',
    tips: 'Start with the ingredient list. Add the nutrition table and the front of the pack or barcode for a better verdict.',
    full: 'Maximum {max} photos — analyze now or remove one',
    processing: 'Preparing photo…',

    barcodeDetected: 'Barcode {code} detected',
    barcodeRemove: 'Remove barcode',

    torchOn: 'Turn on flashlight',
    torchOff: 'Turn off flashlight',
    marketA11y: 'Market: {market}. Opens Settings to change it.',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',

    cameraPaused: 'Camera paused to save battery',
    resumeCamera: 'Tap to resume camera',
    resumeCameraA11y: 'Camera paused to save battery. Resume camera',

    shutter: 'Take photo {n} of {total}',
    shutterFull: 'Maximum photos taken',
    shutterBusy: 'Preparing photo',
    gallery: 'Choose from gallery',
    docScan: 'Scan flat label',
    analyze: 'Analyze',
    analyzeCount: 'Analyze ({count})',
    analyzeA11yOne: 'Analyze 1 photo',
    analyzeA11yMany: 'Analyze {count} photos',

    trayLabel: '{count} of {total} photos added',
    removePhoto: 'Remove photo {n}: {slot}',
    emptySlot: 'Photo {n}: {slot}, not added yet',

    captureFailed: 'Couldn’t take the photo. Please try again.',
    importFailed: 'Some photos couldn’t be added. Try different photos.',
    importFailedAll: 'These photos couldn’t be added. Try different photos.',
    pickerFailed: 'Couldn’t open your photos. Please try again.',
    docScanFailed: 'The label scanner isn’t available right now.',

    permTitle: 'Scan food labels with your camera',
    permBody:
      'PureBite uses the camera to photograph ingredient lists, nutrition tables and barcodes. You can also choose photos from your gallery.',
    permAllow: 'Allow camera',
    permDeclinedTitle: 'Camera access was declined',
    permDeclinedBody: 'Allow camera access to scan labels, or choose photos from your gallery instead.',
    permBlockedTitle: 'Camera access is off',
    permBlockedBody:
      'To scan labels, allow camera access for PureBite in Settings. You can still choose photos from your gallery.',
    cameraErrorTitle: 'Camera unavailable',
    cameraErrorBody: 'The camera couldn’t start. It may be in use by another app.',

  },
  hi: {
    // "{total} में से …", not "{n}/{total}": Hindi TTS reads a slash pair as a fraction.
    stepChip: '{total} में से फ़ोटो {n} · {slot}',
    stepChipFull: 'सभी {total} फ़ोटो जुड़ गईं',
    slotIngredients: 'सामग्री सूची',
    slotNutrition: 'पोषण तालिका',
    slotFront: 'पैकेट का अगला हिस्सा / बारकोड',
    hint: 'लेबल को फ़्रेम में पूरा लाएँ और फ़ोन स्थिर रखें',
    tips: 'पहले सामग्री सूची की फ़ोटो लें। बेहतर नतीजे के लिए पोषण तालिका और पैकेट के अगले हिस्से या बारकोड की फ़ोटो भी जोड़ें।',
    full: 'अधिकतम {max} फ़ोटो — अभी जाँच करें या कोई एक हटाएँ',
    processing: 'फ़ोटो तैयार हो रही है…',

    barcodeDetected: 'बारकोड {code} मिला',
    barcodeRemove: 'बारकोड हटाएँ',

    torchOn: 'फ़्लैशलाइट चालू करें',
    torchOff: 'फ़्लैशलाइट बंद करें',
    marketA11y: 'बाज़ार: {market}। बदलने के लिए सेटिंग्स खुलेंगी।',
    zoomIn: 'ज़ूम इन करें',
    zoomOut: 'ज़ूम आउट करें',

    cameraPaused: 'बैटरी बचाने के लिए कैमरा रोका गया है',
    resumeCamera: 'कैमरा फिर से चालू करने के लिए टैप करें',
    resumeCameraA11y: 'बैटरी बचाने के लिए कैमरा रोका गया है। कैमरा फिर से चालू करें',

    shutter: '{total} में से फ़ोटो {n} लें',
    shutterFull: 'अधिकतम फ़ोटो ली जा चुकी हैं',
    shutterBusy: 'फ़ोटो तैयार हो रही है',
    gallery: 'गैलरी से चुनें',
    docScan: 'सपाट लेबल स्कैन करें',
    analyze: 'जाँच करें',
    analyzeCount: 'जाँच करें ({count})',
    analyzeA11yOne: '1 फ़ोटो की जाँच करें',
    analyzeA11yMany: '{count} फ़ोटो की जाँच करें',

    trayLabel: '{total} में से {count} फ़ोटो जुड़ गईं',
    removePhoto: 'फ़ोटो {n} हटाएँ: {slot}',
    emptySlot: 'फ़ोटो {n}: {slot}, अभी नहीं जोड़ी गई',

    captureFailed: 'फ़ोटो नहीं ली जा सकी। कृपया फिर से कोशिश करें।',
    importFailed: 'कुछ फ़ोटो नहीं जोड़ी जा सकीं। दूसरी फ़ोटो आज़माएँ।',
    importFailedAll: 'ये फ़ोटो नहीं जोड़ी जा सकीं। दूसरी फ़ोटो आज़माएँ।',
    pickerFailed: 'गैलरी नहीं खुल सकी। कृपया फिर से कोशिश करें।',
    docScanFailed: 'लेबल स्कैनर अभी उपलब्ध नहीं है।',

    permTitle: 'कैमरे से फ़ूड लेबल स्कैन करें',
    permBody:
      'PureBite कैमरे से सामग्री सूची, पोषण तालिका और बारकोड की फ़ोटो लेता है। आप गैलरी से भी फ़ोटो चुन सकते हैं।',
    permAllow: 'कैमरे की अनुमति दें',
    permDeclinedTitle: 'कैमरे की अनुमति नहीं दी गई',
    permDeclinedBody: 'लेबल स्कैन करने के लिए कैमरे की अनुमति दें, या इसके बजाय गैलरी से फ़ोटो चुनें।',
    permBlockedTitle: 'कैमरे की अनुमति बंद है',
    permBlockedBody:
      'लेबल स्कैन करने के लिए सेटिंग्स में PureBite को कैमरे की अनुमति दें। आप अब भी गैलरी से फ़ोटो चुन सकते हैं।',
    cameraErrorTitle: 'कैमरा उपलब्ध नहीं है',
    cameraErrorBody: 'कैमरा शुरू नहीं हो सका। हो सकता है कोई दूसरा ऐप इसका इस्तेमाल कर रहा हो।',

  },
});

export type ScanStrings = (typeof scanStrings)['en'];
