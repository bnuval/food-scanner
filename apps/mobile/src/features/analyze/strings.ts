import { defineStrings } from '@/i18n';

/** Strings for the label-analysis screen (progress, unreadable label, errors). */
export const analyzeStrings = defineStrings({
  en: {
    appBarTitle: 'Label analysis',
    cancelAnalysis: 'Cancel analysis',

    stageUpload: 'Uploading photos',
    stageRead: 'Reading the label',
    stageCheck: 'Checking ingredients and regulations',
    stageAlternatives: 'Finding better alternatives',
    stageDone: 'Result ready',
    stageHeadline: '{stage}…',
    typicalTime: 'This usually takes 5–20 seconds. Please keep the app open.',
    slow: 'This is taking longer than usual. We’re still working on it…',

    progressLabel: 'Analysis progress',
    percent: '{percent}%',
    stepDone: 'done',
    stepActive: 'in progress',
    stepPending: 'waiting',
    stepA11y: '{step}, {status}',
    photosA11yOne: '1 label photo being analysed',
    photosA11yMany: '{count} label photos being analysed',
    previewCaption: 'Your result will appear here',
    resultReadyA11y: 'Result ready: {verdict}, score {score}',

    unreadableTitle: 'We couldn’t read the label',
    unreadableBody: 'The photo may be blurry, too dark or cut off. A clearer photo usually fixes this.',
    unreadableReason: 'What we noticed',
    tipsTitle: 'Tips for a clear photo',
    tipLight: 'Use even, bright light',
    tipGlare: 'Avoid glare and reflections on shiny packs',
    tipFill: 'Fill the frame with the label',
    tipSteady: 'Hold the phone steady',
    tipFull: 'Include the full ingredient list',
    retake: 'Retake photos',
    backToPhotos: 'Back to photos',

    errorTitle: 'The analysis didn’t finish',
    updateTitle: 'Update required',
    errorPhotos: 'We couldn’t open your photos. Please take them again.',
    photosKept: 'Your photos are still here, so you don’t need to retake them.',
    retryIn: 'Try again in {seconds}s',

    saveErrorTitle: 'Your result couldn’t be saved',
    saveErrorBody:
      'The analysis finished, but saving it on this phone failed. Free up some storage and try again. You won’t need to scan the label again.',
    retrySave: 'Try saving again',
  },
  hi: {
    appBarTitle: 'लेबल विश्लेषण',
    cancelAnalysis: 'विश्लेषण रद्द करें',

    stageUpload: 'फ़ोटो अपलोड हो रही हैं',
    stageRead: 'लेबल पढ़ा जा रहा है',
    stageCheck: 'सामग्री और नियमों की जाँच हो रही है',
    stageAlternatives: 'बेहतर विकल्प खोजे जा रहे हैं',
    stageDone: 'नतीजा तैयार है',
    stageHeadline: '{stage}…',
    typicalTime: 'इसमें आमतौर पर 5–20 सेकंड लगते हैं। कृपया ऐप खुला रखें।',
    slow: 'सामान्य से ज़्यादा समय लग रहा है। हम अभी भी इस पर काम कर रहे हैं…',

    progressLabel: 'विश्लेषण की प्रगति',
    percent: '{percent}%',
    stepDone: 'पूरा हुआ',
    stepActive: 'जारी है',
    stepPending: 'बाकी है',
    stepA11y: '{step}, {status}',
    photosA11yOne: '1 लेबल फ़ोटो का विश्लेषण हो रहा है',
    photosA11yMany: '{count} लेबल फ़ोटो का विश्लेषण हो रहा है',
    previewCaption: 'आपका नतीजा यहाँ दिखेगा',
    resultReadyA11y: 'नतीजा तैयार है: {verdict}, स्कोर {score}',

    unreadableTitle: 'हम लेबल नहीं पढ़ पाए',
    unreadableBody: 'फ़ोटो धुंधली, बहुत अंधेरी या अधूरी हो सकती है। साफ़ फ़ोटो लेने से आमतौर पर यह ठीक हो जाता है।',
    unreadableReason: 'हमने क्या देखा',
    tipsTitle: 'साफ़ फ़ोटो के लिए सुझाव',
    tipLight: 'अच्छी और एक-समान रोशनी में फ़ोटो लें',
    tipGlare: 'चमकदार पैकेट पर चमक और प्रतिबिंब से बचें',
    tipFill: 'लेबल से पूरा फ़्रेम भरें',
    tipSteady: 'फ़ोन को स्थिर रखें',
    tipFull: 'सामग्री की पूरी सूची फ़ोटो में शामिल करें',
    retake: 'फिर से फ़ोटो लें',
    backToPhotos: 'फ़ोटो पर वापस जाएँ',

    errorTitle: 'विश्लेषण पूरा नहीं हो सका',
    updateTitle: 'अपडेट ज़रूरी है',
    errorPhotos: 'हम आपकी फ़ोटो नहीं खोल सके। कृपया फ़ोटो फिर से लें।',
    photosKept: 'आपकी फ़ोटो सुरक्षित हैं, इन्हें दोबारा लेने की ज़रूरत नहीं है।',
    retryIn: '{seconds} सेकंड में फिर कोशिश करें',

    saveErrorTitle: 'आपका नतीजा सेव नहीं हो सका',
    saveErrorBody:
      'विश्लेषण पूरा हो गया, लेकिन इसे इस फ़ोन में सेव नहीं किया जा सका। फ़ोन में थोड़ी जगह खाली करके फिर से कोशिश करें। लेबल को दोबारा स्कैन करने की ज़रूरत नहीं है।',
    retrySave: 'फिर से सेव करें',
  },
});
