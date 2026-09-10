import { isMockCustomer, isMockTicketOrSession, saveSessionToFirestore, deleteSessionFromFirestore, saveTicketToFirestore } from './firebase.js';

const STORAGE_KEY = 'carebot_copilot_sessions_v2';
const STATS_KEY = 'carebot_copilot_stats_v2';

const API_BASE = (typeof window !== 'undefined' && (
  window.__API_BASE__ ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000'
    ? 'http://localhost:5000'
    : '')
)) || '';

/**
 * Detects the language of a customer message.
 * Checks Unicode script ranges and romanized keyword patterns.
 * Returns: 'hindi' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'bengali' | 'gujarati' | 'english'
 */
function detectLanguage(text) {
  if (!text) return 'english';

    if (/[\u0900-\u097F]/.test(text)) return 'hindi';      // Devanagari (Hindi)
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';      // Tamil script
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';     // Telugu script
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';    // Kannada script
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';  // Malayalam script
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';    // Bengali script
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';   // Gujarati script

  const lower = text.toLowerCase();

    const hindiOnlyWords = [
    'mujhe', 'meri', 'mera', 'mere', 'apna', 'apni',
    'karo', 'karna', 'karni', 'karta', 'karti', 'karte',
    'hai ', 'hain', ' hum ', ' aap ', 'aapka', 'aapki',
    'iska', 'iski', 'chahiye', 'batao', 'bata do',
    'nahin', 'nahi', ' nahi ', 'paisa', 'paise',
    'kiya ', 'kiye ', 'dikkat', 'shukriya', 'dhanyavaad',
    'theek', 'bilkul', 'accha', 'zyada', 'bahut',
    'samajh', 'rakha', ' gaya', 'abhi ', 'yahan', 'wahan',
    'kaise', 'kyun', 'kya h', 'kar do', 'de do',
    'ho gaya', 'ho gya', 'kar raha', 'kar rahi',
  ];
  if (hindiOnlyWords.some((w) => lower.includes(w))) return 'hindi';

    const tamilOnlyWords = [
    'vanakkam', 'ennaku', 'ungal', 'nandri', 'romba nandri',
    'seyyungal', 'eppadi', 'thirumba', 'panam', 'kodunga',
    'thayavu', 'seidhu', 'sollunga', 'theriyum', 'illai',
  ];
  if (tamilOnlyWords.some((w) => lower.includes(w))) return 'tamil';

    const teluguOnlyWords = [
    'meeru', 'naku ', 'chesindi', 'cheyandi', 'dhanyavaadalu',
    'ivvandi', 'cheppandi', 'kaadu', 'ayindi', 'aipoindi',
    'vellandi', 'chusanu', 'chestanu',
  ];
  if (teluguOnlyWords.some((w) => lower.includes(w))) return 'telugu';

    const kannadaOnlyWords = [
    'nimage', 'naanu', 'haegide', 'dhanyavada', 'nimma ',
    'bekagide', 'maadiri', 'aayitu', 'heli', 'sari ',
    'tumba', 'nimge',
  ];
  if (kannadaOnlyWords.some((w) => lower.includes(w))) return 'kannada';

    const malayalamOnlyWords = [
    'ningal', 'ningalku', 'ente ', 'cheyyuka', 'nandi ',
    'sahaayikku', 'enthu ', 'pattum', 'sheriyayi', 'sariyayi',
    'valare', 'tharam', 'tharu',
  ];
  if (malayalamOnlyWords.some((w) => lower.includes(w))) return 'malayalam';

    return 'english';
}

/**
 * Returns an authentic native-script greeting for the support agent's reply.
 */
function getGreeting(language, customerName, isFirstMessage) {
  if (!isFirstMessage) return ''; // Only greet on first message
  const firstName = customerName ? customerName.split(' ')[0] : '';
  const namePart  = firstName ? ` ${firstName}` : '';

  const greetings = {
    hindi:     `नमस्ते${namePart}! 🙏`,
    tamil:     `வணக்கம்${namePart}! 🙏`,
    telugu:    `నమస్కారం${namePart}! 🙏`,
    kannada:   `ನಮಸ್ಕಾರ${namePart}! 🙏`,
    malayalam: `നമസ്കാരം${namePart}! 🙏`,
    bengali:   `নমস্কার${namePart}! 🙏`,
    gujarati:  `નમસ્તે${namePart}! 🙏`,
    english:   `Hello${namePart}! 👋`,
  };
  return greetings[language] || greetings.english;
}

/**
 * Extracts a concise, professional short-form issue label (3-5 words max)
 * in native script from customer message rather than repeating the raw customer sentence.
 */
export function extractShortIssue(text) {
  if (!text) return 'General Inquiry';
  const lower = text.toLowerCase().trim();

  // 1. Native Devanagari Hindi Detection
  if (/[\u0900-\u097F]/.test(text)) {
    if (text.includes('कैंसिल') || text.includes('रद्द') || text.includes('पसंद नहीं') || text.includes('बंद करो') || text.includes('कैंसल')) {
      return 'ऑर्डर रद्दीकरण अनुरोध';
    }
    if (text.includes('पैसे') || text.includes('कट गए') || text.includes('कट गया') || text.includes('रिफंड') || text.includes('भुगतान')) {
      if (text.includes('दो बार') || text.includes('डबल')) return 'दोहरी बिलिंग कटौती';
      return 'भुगतान कटौती व रिफंड समस्या';
    }
    if (text.includes('इंटरनेट') || text.includes('नेटवर्क') || text.includes('वाइफाई') || text.includes('वाईफाई') || text.includes('नेट') || text.includes('राउटर') || text.includes('सिग्नल') || text.includes('धीमा') || text.includes('चल नहीं रहा')) {
      return 'इंटरनेट व नेटवर्क कनेक्टिविटी समस्या';
    }
    if (text.includes('क्रैश') || text.includes('बग') || text.includes('एरर') || text.includes('लोड नहीं हो रहा') || text.includes('अटक गया') || text.includes('खराबी')) {
      return 'तकनीकी खराबी व एरर समस्या';
    }
    if (text.includes('डिस्काउंट') || text.includes('छूट') || text.includes('कीमत') || text.includes('दाम') || text.includes('प्लान') || text.includes('सीट')) {
      return 'वॉल्यूम डिस्काउंट व मूल्य पूछताछ';
    }
    if (text.includes('धन्यवाद') || text.includes('शुक्रिया') || text.includes('आभार') || text.includes('थैंक यू')) {
      return 'समाधान व आभार';
    }
    if (text.includes('ऑर्डर') || text.includes('कहाँ') || text.includes('कहा') || text.includes('कहा हे') || text.includes('डिलीवरी') || text.includes('पार्सल') || text.includes('ट्रैकिंग') || text.includes('कब आएगा') || text.includes('नहीं मिला')) {
      return 'ऑर्डर ट्रैकिंग व स्थिति जाँच';
    }
    if (text.includes('लॉगिन') || text.includes('पासवर्ड') || text.includes('अकाउंट') || text.includes('खुल नहीं रहा')) {
      return 'लॉगिन व प्रमाणीकरण समस्या';
    }
    return 'ग्राहक सहायता पूछताछ';
  }

  // 2. Native Tamil Detection
  if (/[\u0B80-\u0BFF]/.test(text)) {
    if (text.includes('ரத்து') || text.includes('பிடிக்கவில்லை')) return 'ஆர்டர் ரத்து கோரிக்கை';
    if (text.includes('பணம்') || text.includes('ரீபண்ட்')) return 'பணம் திரும்பப் பெறுதல்';
    if (text.includes('இணையம்') || text.includes('நெட்வொர்க்') || text.includes('வைஃபை') || text.includes('இணைப்பு')) return 'இணைய இணைப்பு சிக்கல்';
    if (text.includes('நன்றி')) return 'நன்றி & தீர்வு';
    if (text.includes('ஆர்டர்') || text.includes('எங்கே') || text.includes('டெலிவரி')) return 'ஆர்டர் கண்காணிப்பு நிலை';
    return 'வாடிக்கையாளர் விசாரணை';
  }

  // 3. Native Telugu Detection
  if (/[\u0C00-\u0C7F]/.test(text)) {
    if (text.includes('రద్దు') || text.includes('నచ్చలేదు')) return 'ఆర్డర్ రద్దు అభ్యర్థన';
    if (text.includes('డబ్బులు') || text.includes('రీఫండ్') || text.includes('కట్')) return 'రీఫండ్ & చెల్లింపు సమస్య';
    if (text.includes('ఇంటర్నెట్') || text.includes('నెట్‌వర్క్') || text.includes('వైఫై') || text.includes('కనెక్షన్')) return 'ఇంటర్నెట్ కనెక్టివిటీ సమస్య';
    if (text.includes('ధన్యవాదాలు')) return 'ధన్యవాదాలు & పరిష్కారం';
    if (text.includes('ఆర్డర్') || text.includes('ఎక్కడ') || text.includes('డెలివరీ')) return 'ఆర్డర్ ట్రాకింగ్ & స్థితి';
    return 'కస్టమర్ విచారణ';
  }

  // 4. Native Kannada Detection
  if (/[\u0C80-\u0CFF]/.test(text)) {
    if (text.includes('ರದ್ದು') || text.includes('ಇಷ್ಟವಿಲ್ಲ')) return 'ಆರ್ಡರ್ ರದ್ದು ವಿನಂತಿ';
    if (text.includes('ಹಣ') || text.includes('ರೀಫಂಡ್')) return 'ಪಾವತಿ ಮತ್ತು ಮರುಪಾವತಿ';
    if (text.includes('ಇಂಟರ್ನೆಟ್') || text.includes('ನೆಟ್‌ವರ್ಕ್') || text.includes('ವೈಫೈ') || text.includes('ಸಂಪರ್ಕ')) return 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಸಮಸ್ಯೆ';
    if (text.includes('ಧನ್ಯವಾದ')) return 'ಧನ್ಯವಾದಗಳು ಮತ್ತು ಪರಿಹಾರ';
    if (text.includes('ಆರ್ಡರ್') || text.includes('ಎಲ್ಲಿದೆ') || text.includes('ಡೆಲಿವರಿ')) return 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಸ್ಥಿತಿ';
    return 'ಗ್ರಾಹಕ ವಿಚಾರಣೆ';
  }

  // 5. Native Malayalam Detection
  if (/[\u0D00-\u0D7F]/.test(text)) {
    if (text.includes('റദ്ദാക്കുക') || text.includes('ഇഷ്ടപ്പെട്ടില്ല')) return 'റദ്ദാക്കൽ അഭ്യർത്ഥന';
    if (text.includes('പണം') || text.includes('റീഫണ്ട്')) return 'റീഫണ്ട് അന്വേഷണം';
    if (text.includes('ഇന്റർനെറ്റ്') || text.includes('നെറ്റ്‌വർക്ക്') || text.includes('വൈഫൈ') || text.includes('കണക്ഷൻ')) return 'ഇന്റർനെറ്റ് കണക്റ്റിവിറ്റി പ്രശ്നം';
    if (text.includes('നന്ദി')) return 'നന്ദി & പരിഹാരം';
    if (text.includes('ഓർഡർ') || text.includes('എവിടെ') || text.includes('ഡെലിവറി')) return 'ഓർഡർ ട്രാക്കിംഗ് നില';
    return 'ഉപഭോക്തൃ സഹായം';
  }

  // 6. Native Bengali Detection
  if (/[\u0980-\u09FF]/.test(text)) {
    if (text.includes('বাতিল') || text.includes('ভালো লাগেনি')) return 'অর্ডার বাতিল অনুরোধ';
    if (text.includes('টাকা') || text.includes('রিফান্ড') || text.includes('পেমেন্ট')) return 'পেমেন্ট ও রিফান্ড সমস্যা';
    if (text.includes('ইন্টারনেট') || text.includes('নেটওয়ার্ক') || text.includes('ওয়াইফাই') || text.includes('সংযোগ')) return 'ইন্টারনেট সংযোগ সমস্যা';
    if (text.includes('ধন্যবাদ')) return 'ধন্যবাদ ও সমাধান';
    if (text.includes('অর্ডার') || text.includes('কোথায়') || text.includes('ডেলিভারি')) return 'অর্ডার ট্র্যাকিং ও স্থিতি';
    return 'গ্রাহক সহায়তা অনুসন্ধান';
  }

  // 7. English / Romanized Scenarios
  // Internet / Network / Connectivity
  if (
    lower.includes('internet') || lower.includes('network') || lower.includes('wifi') ||
    lower.includes('wi-fi') || lower.includes('broadband') || lower.includes('connection') ||
    lower.includes('disconnect') || lower.includes('offline') || lower.includes('router') ||
    lower.includes('modem') || lower.includes('fiber') || lower.includes('slow net') ||
    lower.includes('latency') || lower.includes('ping') || lower.includes('net issue') ||
    (lower.includes('not working') && (lower.includes('net') || lower.includes('web') || lower.includes('line') || lower.includes('connection')))
  ) {
    if (lower.includes('slow') || lower.includes('speed') || lower.includes('buffering') || lower.includes('latency') || lower.includes('ping')) {
      return 'Slow Internet Speed & High Latency';
    }
    return 'Internet Connectivity & Network Issue';
  }

  // Technical Glitches / Errors / Crashes
  if (
    lower.includes('crash') || lower.includes('bug') || lower.includes('error') ||
    lower.includes('glitch') || lower.includes('freeze') || lower.includes('blank screen') ||
    lower.includes('white screen') || lower.includes('not loading') || lower.includes('stuck') ||
    lower.includes('500') || lower.includes('404') || lower.includes('failed to load')
  ) {
    return 'Technical Glitch & System Error';
  }

  // Setup / Configuration
  if (lower.includes('setup') || lower.includes('set up') || lower.includes('configure') || lower.includes('install') || lower.includes('how to') || lower.includes('tutorial')) {
    return 'Configuration & Setup Guidance';
  }

  // Cancellation / dissatisfied
  if (lower.includes('cancel') || lower.includes('unsubscribe') || lower.includes('stop my service') || (lower.includes('service') && (lower.includes('not like') || lower.includes("didn't like")))) {
    if (lower.includes('service') || lower.includes('bad') || lower.includes("didn't like") || lower.includes('poor') || lower.includes('disappointed')) {
      return 'Order Cancellation & Dissatisfaction';
    }
    return 'Subscription Cancellation Request';
  }

  // Double charge / duplicate billing
  if (lower.includes('twice') || lower.includes('double') || lower.includes('do baar') || lower.includes('two times') || lower.includes('duplicate charge')) {
    return 'Duplicate Billing Charge';
  }

  // Payment deducted but order failed
  if ((lower.includes('deducted') || lower.includes('debited') || lower.includes('paisa')) && (lower.includes('not placed') || lower.includes('not confirmed') || lower.includes('failed') || lower.includes('money back'))) {
    return 'Payment Deducted / Order Failed';
  }

  // Refund request / dispute
  if (lower.includes('refund') || lower.includes('money back') || lower.includes('paisa wapas')) {
    return 'Refund & Billing Dispute';
  }

  // Delivery & Tracking
  if (lower.includes('delivery') || lower.includes('package') || lower.includes('tracking') || lower.includes('shipment') || lower.includes('not received') || lower.includes('where is my order') || lower.includes('courier')) {
    if (lower.includes('delivered') && lower.includes('not received')) {
      return 'Marked Delivered But Not Received';
    }
    return 'Shipment Tracking & Delivery Delay';
  }

  // SSO / Login / Authentication
  if (lower.includes('sso') || lower.includes('login') || lower.includes('password') || lower.includes('log in') || lower.includes('access') || lower.includes('locked')) {
    return 'SSO Authentication / Login Lockout';
  }

  // Pricing / Volume seats / License upgrade
  if (lower.includes('discount') || lower.includes('volume') || lower.includes('pricing') || lower.includes('seats') || lower.includes('cost') || lower.includes('quote')) {
    return 'Volume Licensing & Seat Discounts';
  }

  // Return / Replacement / Damaged goods
  if (lower.includes('defective') || lower.includes('damaged') || lower.includes('replace') || lower.includes('broken') || lower.includes('return')) {
    return 'Product Defect & Return Request';
  }

  // Tier upgrade / Limit expansion
  if (lower.includes('upgrade') || lower.includes('tier') || lower.includes('limit') || lower.includes('quota') || lower.includes('enterprise')) {
    return 'Plan Upgrade & Quota Expansion';
  }

  // Resolution / Gratitude
  if (lower.includes('thank') || lower.includes('resolved') || lower.includes('appreciate') || lower.includes('all good') || lower.includes('sorted')) {
    return 'Issue Resolution & Gratitude';
  }

  // Fallback: Dynamic short title extraction (stripping conversational noise)
  const cleaned = lower
    .replace(/^(hey|hi|hello|dear|please|kindly|can you|could you|i want to|i need to|i have(?: a)?|my|i am(?: having(?: a)?)?|having(?: a)?|there is(?: an?)?)\s+/i, '')
    .replace(/[?!.,]+$/g, '')
    .trim();

  const words = cleaned.split(/\s+/).slice(0, 5);
  if (words.length > 0 && words[0]) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return 'Customer Support Inquiry';
}

/**
 * Detects if the customer is expressing gratitude / closing the conversation.
 */
function isThankYou(text, language) {
  const lower = (text || '').toLowerCase().trim();

  // Universal patterns (short thank-you variations)
  const universalPatterns = [
    'thank', 'thnk', 'thx', 'ty ', 'ty!', 'ty.', 'tysm', 'tq', 'tnx', 'tnkx',
    'ok thank', 'okey thank', 'okay thank', 'ok thnk', 'okey thnk',
    "that's all", 'thats all', 'no that', 'nope that', 'all good',
    'resolved', 'sorted', 'never mind', 'nevermind', 'its fine', "it's fine",
    'no more', 'nothing else', 'all set',
  ];
  if (universalPatterns.some((p) => lower.includes(p))) return true;

  // Hindi thank-you / closure patterns (Native Devanagari + Romanized)
  if (language === 'hindi') {
    const hindiTy = [
      'धन्यवाद', 'शुक्रिया', 'आभार', 'थैंक यू', 'थैंक्स', 'हो गया', 'ठीक है', 'सब सही है', 'हल हो गया',
      'shukriya', 'dhanyavaad', 'dhanyavad', 'shukriyaa', 'theek hai', 'theek h', 'ok hai', 'bas itna', 'koi aur nahi', 'ho gaya', 'ho gya'
    ];
    if (hindiTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  // Tamil thank-you patterns (Native Tamil + Romanized)
  if (language === 'tamil') {
    const tamilTy = ['நன்றி', 'ரொம்ப நன்றி', 'சரி', 'முடிந்தது', 'nandri', 'romba nandri', 'seri', 'varum'];
    if (tamilTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  // Telugu thank-you patterns (Native Telugu + Romanized)
  if (language === 'telugu') {
    const teluguTy = ['ధన్యవాదాలు', 'చాలా ధన్యవాదాలు', 'సరిపోయింది', 'అయిపోయింది', 'dhanyavaadalu', 'chala dhanyavadalu', 'ayindi', 'aipoindi'];
    if (teluguTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  // Kannada thank-you patterns (Native Kannada + Romanized)
  if (language === 'kannada') {
    const kannadaTy = ['ಧನ್ಯವಾದಗಳು', 'ತುಂಬಾ ಧನ್ಯವಾದ', 'ಆಯಿತು', 'ಸರಿ', 'dhanyavada', 'tumba dhanyavada', 'aayitu', 'sari'];
    if (kannadaTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  // Malayalam thank-you patterns (Native Malayalam + Romanized)
  if (language === 'malayalam') {
    const malayalamTy = ['നന്ദി', 'വളരെ നന്ദി', 'ശരിയായി', 'തീർന്നു', 'nandi', 'valare nandi', 'sheriyayi', 'sariyayi'];
    if (malayalamTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  // Bengali thank-you patterns
  if (language === 'bengali') {
    const bengaliTy = ['ধন্যবাদ', 'অনেক ধন্যবাদ', 'ঠিক আছে', 'হয়ে গেছে'];
    if (bengaliTy.some((p) => lower.includes(p) || (text && text.includes(p)))) return true;
  }

  return false;
}

/**
 * Returns a warm, authentic native-script reply for thank-you messages.
 */
function getThankYouReply(language, customerName, isFirstMessage) {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';
  const replies = {
    hindi:     `${greetPart}आपका बहुत-बहुत स्वागत है! 😊 हमें अत्यंत प्रसन्नता है कि आपकी समस्या का समाधान हो गया। यदि आपको भविष्य में किसी भी अन्य सहायता की आवश्यकता हो, तो हम सदैव उपस्थित हैं। अपना ख्याल रखें! 🌟`,
    tamil:     `${greetPart}உங்கள் நல்வரவு! 😊 உங்கள் பிரச்சனை வெற்றிகரமாக தீர்க்கப்பட்டதில் எங்களுக்கு மிக்க மகிழ்ச்சி. மேலும் ஏதேனும் உதவி தேவைப்பட்டால், தயங்காமல் எங்களை தொடர்பு கொள்ளுங்கள்! 🌟`,
    telugu:    `${greetPart}స్వాగతం! 😊 మీ సమస్య పరిష్కారమైనందుకు మాకు చాలా సంతోషంగా ఉంది. భవిష్యత్తులో ఏదైనా సహాయం కావాలంటే ఎప్పుడైనా మమ్మల్ని సంప్రదించవచ్చు! 🌟`,
    kannada:   `${greetPart}ನಿಮಗೆ ಸ್ವಾಗತ! 😊 ನಿಮ್ಮ ಸಮಸ್ಯೆ ಪರಿಹಾರವಾಗಿದ್ದಕ್ಕೆ ನಮಗೆ ತುಂಬಾ ಸಂತೋಷವಾಗಿದೆ. ಮುಂದೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕಿದ್ದರೂ, ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ! 🌟`,
    malayalam: `${greetPart}സ്വാഗതം! 😊 താങ്കളുടെ പ്രശ്നം പരിഹരിക്കപ്പെട്ടതിൽ വളരെ സന്തോഷം. ഭാവിയിൽ എന്തെങ്കിലും സഹായം ആവശ്യമെങ്കിൽ ഞങ്ങളെ ബന്ധപ്പെടാൻ മടിക്കരുത്! 🌟`,
    bengali:   `${greetPart}আপনাকে অনেক ধন্যবাদ! 😊 আপনার সমস্যার সমাধান হওয়ায় আমরা আনন্দিত। পরবর্তীতে কোনো সহযোগিতার প্রয়োজন হলে নির্দ্বিধায় যোগাযোগ করবেন! 🌟`,
    english:   `${greetPart}You're very welcome! 😊 I'm really glad we could get everything sorted for you. It was a pleasure assisting you today. Don't hesitate to reach out anytime — we're always here to help! 🌟`,
  };
  return replies[language] || replies.english;
}

/**
 * Returns full suggested reply in the authentic native script for each issue type.
 */
function getSuggestedReply(issueType, language, customerName, isFirstMessage, customerMessage = '') {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';

  const replies = {
    network: {
      hindi:     `${greetPart}इंटरनेट व नेटवर्क समस्या के कारण आपको हुई परेशानी के लिए हमें गहरा खेद है! 🌐 हम इसे तुरंत ठीक करने में आपकी मदद करेंगे। क्या आप देख सकते हैं कि आपके राउटर पर 'Internet/PON' लाइट हरी जल रही है या लाल/ब्लिंक कर रही है? कृपया राउटर को 30 सेकंड के लिए अनप्लग करके पुनः चालू (Power cycle) करें। साथ ही, मैं यहाँ से आपकी लाइन की डायग्नोस्टिक जाँच शुरू कर रहा हूँ।`,
      tamil:     `${greetPart}இணைய இணைப்பு பிரச்சனையால் உங்களுக்கு ஏற்பட்ட சிரமத்திற்கு மிகவும் வருந்துகிறோம்! 🌐 உங்கள் ரூட்டரில் Internet/PON விளக்கு பச்சையாக எரிகிறதா அல்லது சிவப்பாக ஒளிர்கிறதா என சரிபார்க்க முடியுமா? ரூட்டரை 30 வினாடிகள் ஆஃப் செய்துவிட்டு மீண்டும் ஆன் செய்யவும். நான் இங்கிருந்து நேரடி நெட்வொர்க் சோதனையை தொடங்குகிறேன்!`,
      telugu:    `${greetPart}ఇంటర్నెట్ కనెక్టివిటీ సమస్య వల్ల మీకు కలిగిన అసౌకర్యానికి మేము చింతిస్తున్నాము! 🌐 మీ రౌటర్‌లోని Internet/PON లైట్ ఆకుపచ్చగా స్థిరంగా ఉందా లేదా ఎరుపు రంగులో బ్లింక్ అవుతుందో చూడగలరా? రౌటర్‌ను 30 సెకన్ల పాటు రీస్టార్ట్ చేయండి. నేను సిస్టమ్ ద్వారా మీ కనెక్షన్ డయాగ్నస్టిక్స్ పరిశీలిస్తున్నాను!`,
      kannada:   `${greetPart}ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ತೊಂದರೆಗೆ ಕ್ಷಮೆಯಾಚಿಸುತ್ತೇವೆ! 🌐 ನಿಮ್ಮ ರೂಟರ್‌ನಲ್ಲಿ Internet/PON ದೀಪವು ಹಸಿರಾಗಿದೆಯೇ ಅಥವಾ ಕೆಂಪಾಗಿ ಮಿಟುಕಿಸುತ್ತಿದೆಯೇ ಎಂದು ತಿಳಿಸಿ. ರೂಟರ್ ಅನ್ನು 30 ಸೆಕೆಂಡುಗಳ ಕಾಲ ರೀಸ್ಟಾರ್ಟ್ ಮಾಡಿ ಪರಿಶೀಲಿಸಿ. ನಾನು ಸಿಸ್ಟಮ್ ಮೂಲಕ ಲೈನ್ ಚೆಕ್ ಮಾಡುತ್ತಿದ್ದೇನೆ!`,
      malayalam: `${greetPart}ഇന്റർനെറ്റ് കണക്ഷൻ തകരാറിൽ ഞങ്ങൾ ഖേദിക്കുന്നു! 🌐 റൂട്ടറിലെ Internet/PON ലൈറ്റ് പച്ചയാണോ അതോ ചുവപ്പായി മിന്നുന്നുണ്ടോ എന്ന് പരിശോധിക്കാമോ? റൂട്ടർ 30 സെക്കൻഡ് ഓഫ് ചെയ്ത് വീണ്ടും ഓൺ ചെയ്യുക. ഞാൻ ഇവിടെനിന്ന് ലൈൻ ഡയഗ്നോസ്റ്റിക്സ് നടത്തുന്നുണ്ട്!`,
      bengali:   `${greetPart}ইন্টারনেট ও নেটওয়ার্ক সমস্যার জন্য আমরা আন্তরিকভাবে দুঃখিত! 🌐 আপনার রাউটারে Internet/PON লাইট সবুজ জ্বলছে নাকি লাল ব্লিঙ্ক করছে তা অনুগ্রহ করে জানাবেন? রাউটারটি ৩০ সেকেন্ডের জন্য রিস্টার্ট করে দেখুন, আমি দূর থেকে আপনার সংযোগ পরীক্ষা করছি!`,
      english:   `${greetPart}I sincerely apologize for the trouble with your internet connection! 🌐 I know how crucial reliable connectivity is. Let's get this resolved right away. Could you please check if the Internet/PON light on your router is solid green or blinking red/amber? Also, have you tried power-cycling the router by unplugging it for 30 seconds? I am running a line diagnostic on your connection right now.`,
    },
    technical: {
      hindi:     `${greetPart}तकनीकी समस्या (Technical Glitch) के कारण आपको हुई असुविधा के लिए खेद है! ⚙️ क्या आप कृपया बता सकते हैं कि स्क्रीन पर कोई विशेष एरर कोड या मैसेज दिखाई दे रहा है? आप किस ब्राउज़र या डिवाइस का उपयोग कर रहे हैं? कई बार हार्ड रिफ्रेश (Ctrl+F5) या ब्राउज़र कैशे क्लियर करने से यह तुरंत ठीक हो जाता है।`,
      tamil:     `${greetPart}தொழில்நுட்ப கோளாறுக்கு வருந்துகிறோம்! ⚙️ திரையில் ஏதேனும் குறிப்பிட்ட பிழை குறியீடு (Error Code) காட்டப்படுகிறதா? நீங்கள் எந்த உலாவி (Browser) பயன்படுத்துகிறீர்கள்? கேச் (Cache) அழித்து மீண்டும் முயற்சித்தால் இது பெரும்பாலும் சரியாகிவிடும்.`,
      telugu:    `${greetPart}సాంకేతిక సమస్యకు మేము చింతిస్తున్నాము! ⚙️ స్క్రీన్‌పై ఏదైనా నిర్దిష్ట ఎర్రర్ కోడ్ లేదా మెసేజ్ కనిపిస్తోందా? మీరు ఏ బ్రౌజర్ లేదా పరికరాన్ని ఉపయోగిస్తున్నారు? పేజీని రిఫ్రెష్ చేయడం లేదా క్యాచీని క్లియర్ చేయడం ద్వారా ఇది త్వరగా పరిష్కారం కావచ్చు.`,
      kannada:   `${greetPart}ತಾಂತ್ರಿಕ ದೋಷಕ್ಕೆ ವಿಷಾದಿಸುತ್ತೇವೆ! ⚙️ ನಿಮ್ಮ ಪರದೆಯ ಮೇಲೆ ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ದೋಷ ಕೋಡ್ (Error Code) ಕಾಣಿಸುತ್ತಿದೆಯೇ? ನೀವು ಯಾವ ಬ್ರೌಸರ್ ಬಳಸುತ್ತಿದ್ದೀರಿ? ಕ್ಯಾಶ್ ತೆರವುಗೊಳಿಸಿ ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ ನೋಡಿ.`,
      malayalam: `${greetPart}സാങ്കേതിക തകരാറിൽ ഞങ്ങൾ ഖേദിക്കുന്നു! ⚙️ സ്ക്രീനിൽ എന്തെങ്കിലും പ്രത്യേക പിശക് കോഡ് (Error code) കാണിക്കുന്നുണ്ടോ? ബ്രൗസർ കാഷെ ക്ലിയർ ചെയ്ത് റീഫ്രെഷ് ചെയ്യുന്നത് പലപ്പോഴും ഈ പ്രശ്നം പരിഹരിക്കും.`,
      bengali:   `${greetPart}কারিগরি ত্রুটির জন্য আমরা দুঃখিত! ⚙️ স্ক্রিনে কোনো নির্দিষ্ট এরর কোড দেখাচ্ছে কি? আপনি কোন ব্রাউজার ব্যবহার করছেন? ব্রাউজার ক্যাশ ক্লিয়ার করে পেজ রিফ্রেশ করলে সাধারণত এটি সমাধান হয়ে যায়।`,
      english:   `${greetPart}I apologize for the technical glitch you're experiencing! ⚙️ I want to get this running smoothly for you as fast as possible. Could you let me know what device or browser you are using, and whether any error code is showing? In many cases, performing a hard refresh (Ctrl+F5) or clearing browser cache resolves this immediately.`,
    },
    account: {
      hindi:     `${greetPart}खाता लॉगिन व प्रमाणीकरण समस्या के लिए खेद है! 🔐 हम तुरंत आपके खाते की सुरक्षित रिकवरी में सहायता करेंगे। क्या आप अपना पंजीकृत ईमेल या यूज़रनेम साझा कर सकते हैं? मैं तुरंत आपके सत्यापित ईमेल पर पासवर्ड रीसेट लिंक या नया OTP भेज देता हूँ।`,
      tamil:     `${greetPart}கணக்கு உள்நுழைவு சிக்கலுக்கு வருந்துகிறோம்! 🔐 உங்கள் கணக்கை மீட்டெடுக்க உடனடியாக உதவுகிறோம். உங்கள் பதிவுசெய்த மின்னஞ்சல் முகவரியை உறுதிப்படுத்த முடியுமா? உடனடி கடவுச்சொல் மீட்டமைப்பு இணைப்பை அனுப்புகிறேன்.`,
      telugu:    `${greetPart}ఖాతా లాగిన్ సమస్యకు మేము చింతిస్తున్నాము! 🔐 మీ ఖాతాను సురక్షితంగా పునరుద్ధరించడానికి మేము సహాయం చేస్తాము. దయచేసి మీ రిజిస్టర్డ్ ఇమెయిల్ ఐడీని నిర్ధారించగలరా? వెంటనే పాస్‌వర్డ్ రీసెట్ లింక్‌ను పంపుతాము.`,
      kannada:   `${greetPart}ಖಾತೆ ಲಾಗಿನ್ ತೊಂದರೆಗೆ ವಿಷಾದಿಸುತ್ತೇವೆ! 🔐 ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಮರುಪಡೆಯಲು ನಾವು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ತಿಳಿಸಿ, ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸುತ್ತೇವೆ.`,
      malayalam: `${greetPart}അക്കൗണ്ട് ലോഗിൻ പ്രശ്നത്തിൽ ഖേദിക്കുന്നു! 🔐 അക്കൗണ്ട് വീണ്ടെടുക്കാൻ സഹായിക്കാം. താങ്കളുടെ രജിസ്റ്റർ ചെയ്ത ഇമെയിൽ വിലാസം പങ്കുവെക്കാമോ? ഉടൻ പാസ്‌വേഡ് റീസെറ്റ് ലിങ്ക് അയക്കാം.`,
      bengali:   `${greetPart}অ্যাকাউন্ট লগইন সমস্যার জন্য আমরা দুঃখিত! 🔐 আমরা দ্রুত আপনার অ্যাকাউন্ট পুনরুদ্ধার করতে সাহায্য করব। আপনার নিবন্ধিত ইমেল ঠিকানা শেয়ার করুন, আমি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাচ্ছি।`,
      english:   `${greetPart}I understand how urgent it is to regain account access! 🔐 I will help you unlock and secure your account right away. Could you please confirm your registered email address or username? I can trigger an instant secure password reset link or 2FA verification code immediately.`,
    },
    setup: {
      hindi:     `${greetPart}सेटअप और कॉन्फ़िगरेशन में आपकी सहायता करने में मुझे खुशी होगी! 🚀 आप कौन सा फ़ीचर या एकीकरण (Integration) सेट करना चाहते हैं? मैं आपको चरण-दर-चरण (Step-by-step) सही तरीका समझा देता हूँ।`,
      tamil:     `${greetPart}அமைவு மற்றும் உள்ளமைவில் உங்களுக்கு உதவ மகிழ்ச்சி அடைகிறேன்! 🚀 நீங்கள் எந்த அம்சத்தை கட்டமைக்க விரும்புகிறீர்கள்? நான் உங்களுக்கு படிப்படியான வழிகாட்டலை வழங்குகிறேன்.`,
      telugu:    `${greetPart}సెటప్ మరియు కాన్ఫిగరేషన్‌లో మీకు సహాయం చేయడానికి నేను సంతోషిస్తున్నాను! 🚀 మీరు ఏ ఫీచర్‌ను కాన్ఫిగర్ చేయాలనుకుంటున్నారు? నేను మీకు దశలవారీ మార్గదర్శకత్వాన్ని అందిస్తాను.`,
      kannada:   `${greetPart}ಸೆಟಪ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಲು ಸಂತೋಷವಾಗುತ್ತದೆ! 🚀 ನೀವು ಯಾವ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇನೆ.`,
      malayalam: `${greetPart}സെറ്റപ്പ് ചെയ്യുന്നതിൽ സഹായിക്കാൻ സന്തോഷമുണ്ട്! 🚀 ഏത് ഫീച്ചറാണ് താങ്കൾ ക്രമീകരിക്കാൻ ആഗ്രഹിക്കുന്നത്? ഘട്ടം ഘട്ടമായുള്ള നിർദ്ദേശങ്ങൾ നൽകാം.`,
      bengali:   `${greetPart}সেটআপ এবং কনফিগারেশনে আপনাকে সাহায্য করতে পেরে আনন্দিত! 🚀 আপনি কোন ফিচারটি কনফিগার করতে চান? আমি আপনাকে ধাপে ধাপে নির্দেশনা দিচ্ছি।`,
      english:   `${greetPart}I would be glad to help you with the setup! 🚀 Which specific feature, integration, or tool are you looking to configure today? I'll walk you through each step clearly to get you up and running right away.`,
    },
    delivery: {
      hindi:     `${greetPart}आपके ऑर्डर की स्थिति जानने के लिए मैं आपकी पूरी सहायता करूँगा। 📦 क्या आप कृपया अपनी ऑर्डर आईडी (Order ID) साझा कर सकते हैं? मैं अभी सिस्टम में लाइव ट्रैकिंग चेक करके आपको सटीक स्थिति और डिलीवरी का समय तुरंत बताता हूँ!`,
      tamil:     `${greetPart}உங்கள் ஆர்டர் நிலையை சரிபார்க்க நான் உடனடியாக உதவுகிறேன். 📦 தயவுசெய்து உங்கள் ஆர்டர் ஐடியை (Order ID) பகிர முடியுமா? நான் இப்போதே நேரடி டிராக்கிங் செய்து சரியான டெலிவரி விவரங்களை உங்களுக்கு வழங்குகிறேன்!`,
      telugu:    `${greetPart}మీ ఆర్డర్ స్థితిని తనిఖీ చేయడానికి నేను మీకు సహాయం చేస్తాను. 📦 దయచేసి మీ ఆర్డర్ ఐడీని (Order ID) తెలియజేయగలరా? నేను ఇప్పుడే సిస్టమ్‌లో లైవ్ ట్రాకింగ్ చెక్ చేసి సరైన డెలివరీ వివరాలను మీకు అందిస్తాను!`,
      kannada:   `${greetPart}ನಿಮ್ಮ ಆರ್ಡರ್ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ನಾನು ನಿಮಗೆ ತಕ್ಷಣ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. 📦 ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆರ್ಡರ್ ಐಡಿಯನ್ನು (Order ID) ಹಂಚಿಕೊಳ್ಳಿ, ನಾನು ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಪರಿಶೀಲಿಸಿ ನಿಖರವಾದ ಡೆಲಿವರಿ ವಿವರಗಳನ್ನು ನೀಡುತ್ತೇನೆ!`,
      malayalam: `${greetPart}നിങ്ങളുടെ ഓർഡർ നില പരിശോധിക്കാൻ ഞാൻ സഹായിക്കാം. 📦 ദയവായി താങ്കളുടെ ഓർഡർ ഐഡി (Order ID) പങ്കുവെക്കാമോ? ഞാൻ ഉടൻ തന്നെ ലൈവ് ട്രാക്കിംഗ് പരിശോധിച്ച് കൃത്യമായ ഡെലിവറി വിവരം അറിയിക്കാം!`,
      bengali:   `${greetPart}আপনার অর্ডারের স্থিতি পরীক্ষা করতে আমি সম্পূর্ণ সাহায্য করব। 📦 দয়া করে আপনার অর্ডার আইডি (Order ID) শেয়ার করুন, আমি এখনই লাইভ ট্র্যাকিং চেক করে সঠিক ডেলিভারির তথ্য জানাচ্ছি!`,
      english:   `${greetPart}I apologize for the trouble with your order. 😔 I will investigate this right away. Could you please share your order ID so I can check the exact status and give you a precise update? I want to make sure this gets resolved immediately for you!`,
    },
    payment: {
      hindi:     `${greetPart}असुविधा के लिए हमें गहरा खेद है। 😔 हमने आपके खाते की जाँच कर ली है और समस्या की पुष्टि हो गई है — हम तुरंत रिफंड की प्रक्रिया शुरू कर रहे हैं। यह राशि 3–5 कार्य दिवसों में आपके बैंक खाते में वापस आ जाएगी और आपको एक पुष्टिकरण ईमेल भी मिलेगा। क्या आपको कोई अन्य सहायता चाहिए?`,
      tamil:     `${greetPart}ஏற்பட்ட சிரமத்திற்கு நாங்கள் மிகவும் வருந்துகிறோம். 😔 உங்கள் கணக்கை நாங்கள் சரிபார்த்து விட்டோம் — உடனடியாக உங்கள் பணத்தை ரீபண்ட் செய்கிறோம். இது 3–5 வணிக நாட்களில் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும். உறுதிப்படுத்தல் மின்னஞ்சலும் உங்களுக்கு அனுப்பப்படும்.`,
      telugu:    `${greetPart}మీకు కలిగిన అసౌకర్యానికి మేము చింతిస్తున్నాము. 😔 మీ సమస్యను మేము ధృవీకరించాము — మేము వెంటనే రీఫండ్ ప్రక్రియను ప్రారంభిస్తున్నాము. ఇది 3–5 పని దినాలలో మీ బ్యాంక్ ఖాతాలో జమ అవుతుంది మరియు మీకు నిర్ధారణ ఇమెయిల్ అందుతుంది.`,
      kannada:   `${greetPart}ನಿಮಗುಂಟಾದ ತೊಂದರೆಗೆ ನಾವು ಕ್ಷಮೆಯಾಚಿಸುತ್ತೇವೆ. 😔 ನಿಮ್ಮ ಖಾತೆಯನ್ನು ನಾವು ಪರಿಶೀಲಿಸಿದ್ದೇವೆ — ತಕ್ಷಣವೇ ಮರುಪಾವತಿ (ರೀಫಂಡ್) ಪ್ರಕ್ರಿಯೆ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ. ಇದು 3-5 ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ನಿಮ್ಮ ಖಾತೆಗೆ ಜಮೆಯಾಗಲಿದೆ. ನಿಮಗೆ ದೃಢೀಕರಣ ಇಮೇಲ್ ಕೂಡ ಬರಲಿದೆ.`,
      malayalam: `${greetPart}നിങ്ങൾക്കുണ്ടായ അസൗകര്യത്തിൽ ഞങ്ങൾ ഖേദിക്കുന്നു. 😔 നിങ്ങളുടെ അക്കൗണ്ട് പരിശോധിച്ച് പ്രശ്നം സ്ഥിരീകരിച്ചു — റീഫണ്ട് നടപടികൾ ഉടൻ ആരംഭിക്കുന്നു. ഇത് 3–5 പ്രവൃത്തി ദിവസങ്ങൾക്കുള്ളിൽ അക്കൗണ്ടിൽ ലഭ്യമാകും. സ്ഥിരീകരണ ഇമെയിലും ലഭിക്കും.`,
      bengali:   `${greetPart}অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। 😔 আমরা এখনই রিফান্ড প্রক্রিয়া শুরু করছি, যা ৩-৫ কার্যদিবসের মধ্যে আপনার মূল পেমেন্ট পদ্ধতিতে জমা হবে এবং আপনি একটি নিশ্চিতকরণ ইমেল পাবেন।`,
      english:   `${greetPart}I sincerely apologize for the inconvenience. 😔 I completely understand how frustrating an unexpected charge can be. I have reviewed your account and confirmed the issue — I will process the refund immediately. It will reflect in your account within 3–5 business days, and you will receive a confirmation email. Is there anything else I can help you with?`,
    },
    pricing: {
      hindi:     `${greetPart}हमारी सेवाओं में रुचि दिखाने के लिए धन्यवाद! 😊 हम टीम और बिजनेस प्लान्स पर वॉल्यूम डिस्काउंट प्रदान करते हैं — वार्षिक बिलिंग पर 15+ सीटों के लिए 18% और 25+ सीटों पर 22% की छूट उपलब्ध है। क्या मैं आपकी टीम के लिए सर्वोत्तम प्लान निर्धारित करने हेतु एक त्वरित कॉल तय कर दूँ?`,
      tamil:     `${greetPart}எங்கள் திட்டங்களில் ஆர்வம் காட்டியதற்கு நன்றி! 😊 வருடாந்திர கட்டணத்தில் 15+ பயனர்களுக்கு 18% மற்றும் 25+ பயனர்களுக்கு 22% தள்ளுபடி வழங்குகிறோம். உங்கள் நிறுவனத்திற்கான சிறந்த திட்டத்தை தேர்வு செய்ய ஒரு அழைப்பை திட்டமிடவா?`,
      telugu:    `${greetPart}మా సేవలపై ఆసక్తి చూపినందుకు ధన్యవాదాలు! 😊 వార్షిక బిల్లింగ్‌లో 15+ సీట్లకు 18% మరియు 25+ సీట్లకు 22% తగ్గింపును మేము అందిస్తున్నాము. మీ బృందానికి ఉత్తమ ప్లాన్ నిర్ణయించడానికి ఒక కాల్ షెడ్యూల్ చేయమంటారా?`,
      kannada:   `${greetPart}ನಮ್ಮ ಸೇವೆಗಳಲ್ಲಿ ಆಸಕ್ತಿ ತೋರಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! 😊 ವಾರ್ಷಿಕ ಬಿಲ್ಲಿಂಗ್‌ನಲ್ಲಿ 15+ ಬಳಕೆದಾರರಿಗೆ 18% ಮತ್ತು 25+ ಬಳಕೆದಾರರಿಗೆ 22% ರಿಯಾಯಿತಿ ಲಭ್ಯವಿದೆ. ನಿಮ್ಮ ತಂಡಕ್ಕೆ ಸೂಕ್ತವಾದ ಯೋಜನೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ತ್ವರಿತ ಕರೆ ನಿಗದಿಪಡಿಸಬೇಕೆ?`,
      malayalam: `${greetPart}ഞങ്ങളുടെ പ്ലാനുകളിൽ താൽപ്പര്യം പ്രകടിപ്പിച്ചതിന് നന്ദി! 😊 വാർഷിക ബില്ലിംഗിൽ 15+ സീറ്റുകൾക്ക് 18% കിഴിവും 25+ സീറ്റുകൾക്ക് 22% കിഴിവും ലഭിക്കും. നിങ്ങളുടെ ടീമിനായി മികച്ച പ്ലാൻ തിരഞ്ഞെടുക്കാൻ ഒരു കോൾ ക്രമീകരിക്കട്ടെ?`,
      bengali:   `${greetPart}আমাদের সেবায় আগ্রহ দেখানোর জন্য ধন্যবাদ! 😊 বার্ষিক বিলিংয়ে ১৫+ সিটের জন্য ১৮% এবং ২৫+ সিটের জন্য ২২% বিশেষ ছাড় পাওয়া যাবে। আপনার দলের জন্য সেরা প্ল্যান নির্ধারণে একটি কল শিডিউল করব কি?`,
      english:   `${greetPart}Thank you for your interest! 😊 We do offer volume discounts — teams with 15 or more seats on annual billing receive an 18% discount, and 25+ seats get 22% off. I would be happy to walk you through all the options. Shall I set up a quick call with our accounts team to find the best plan for you?`,
    },
    cancel: {
      hindi:     `${greetPart}यह जानकर हमें खेद है कि आप सेवा/ऑर्डर रद्द करना चाहते हैं। 😔 क्या आप कृपया बता सकते हैं कि इस निर्णय का क्या कारण है? यदि कोई परेशानी आई है, तो हम तुरंत समाधान कर सकते हैं या 1 महीने का मानार्थ बिलिंग क्रेडिट दे सकते हैं, अन्यथा हम तुरंत कैंसिलेशन पूरा कर देंगे।`,
      tamil:     `${greetPart}நீங்கள் சேவையை/ஆர்டரை ரத்து செய்ய விரும்புவது அறிந்து வருந்துகிறோம். 😔 இதன் காரணத்தை தயவுசெய்து கூற முடியுமா? ஏதேனும் சிக்கல் இருந்தால் நாங்கள் உடனே சரிசெய்கிறோம் அல்லது 1 மாத இலவச சேவை வழங்குகிறோம்.`,
      telugu:    `${greetPart}మీరు సర్వీస్/ఆర్డర్ రద్దు చేయాలనుకుంటున్నారని తెలిసి విచారిస్తున్నాము. 😔 దీని వెనుక ఉన్న కారణాన్ని దయచేసి పంచుకోగలరా? సమస్యను వెంటనే పరిష్కరించడానికి లేదా 1 నెల ఉచిత క్రెడిట్ అందించడానికి మేము సిద్ధంగా ఉన్నాము.`,
      kannada:   `${greetPart}ನೀವು ಚಂದಾದಾರಿಕೆ/ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲು ಬಯಸಿದ್ದಕ್ಕೆ ನಮಗೆ ವಿಷಾದವಿದೆ. 😔 ಇದಕ್ಕೆ ಕಾರಣವೇನು ಎಂದು ದಯವಿಟ್ಟು ತಿಳಿಸುವಿರಾ? ಯಾವುದೇ ತೊಂದರೆ ಇದ್ದಲ್ಲಿ ನಾವು ಅದನ್ನು ಸರಿಪಡಿಸುತ್ತೇವೆ ಅಥವಾ 1 ತಿಂಗಳ ಉಚಿತ ಕ್ರೆಡಿಟ್ ನೀಡುತ್ತೇವೆ.`,
      malayalam: `${greetPart}താങ്കൾ സർവീസ്/ഓർഡർ റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നു എന്നറിഞ്ഞതിൽ വിഷമമുണ്ട്. 😔 ഇതിന്റെ കാരണം വ്യക്തമാക്കാമോ? പ്രശ്നമുണ്ടെങ്കിൽ ഉടനടി പരിഹരിക്കാനോ 1 മാസത്തെ സൗജന്യ ക്രെഡിറ്റ് നൽകാനോ ഞങ്ങൾ തയ്യാറാണ്.`,
      bengali:   `${greetPart}আপনি অর্ডার/সাবস্ক্রিপশন বাতিল করতে চাইছেন জেনে আমরা আন্তরিকভাবে দুঃখিত। 😔 দয়া করে এর কারণ জানাতে পারেন? আমরা সমস্যা সমাধান করতে বা ১ মাসের ফ্রি ক্রেডিট দিতে আগ্রহী।`,
      english:   `${greetPart}I'm sorry to hear you're considering cancellation. 😔 I want to make sure any concerns are fully addressed first. Could you tell me what prompted this decision? I'd love to see if we can find a solution that works better for you.`,
    },
    general: {
      hindi:     customerMessage && customerMessage.length > 4
        ? `${greetPart}आपकी पूछताछ के संबंध में हम तुरंत आपकी पूरी सहायता करेंगे! 😊 क्या आप इस बारे में कोई अतिरिक्त विवरण या संदर्भ साझा कर सकते हैं ताकि हम तुरंत सटीक समाधान प्रदान कर सकें?`
        : `${greetPart}हम आपकी सहायता के लिए सदैव तत्पर हैं! 😊 कृपया अपनी समस्या का थोड़ा और विवरण साझा करें ताकि हम तुरंत इसकी जाँच कर आपको सर्वोत्तम समाधान प्रदान कर सकें।`,
      tamil:     `${greetPart}நாங்கள் உங்களுக்கு உதவ எப்போதும் தயாராக இருக்கிறோம்! 😊 உங்கள் பிரச்சனையைப் பற்றி மேலும் சில விவரங்களை கூறினால், நாங்கள் சிறந்த தீர்வை உடனே வழங்குவோம்.`,
      telugu:    `${greetPart}మీకు సహాయం చేయడానికి మేము సిద్ధంగా ఉన్నాము! 😊 దయచేసి మీ సమస్య గురించిన మరిన్ని వివరాలను తెలియజేయండి, తద్వారా మేము ఉత్తమ పరిష్కారాన్ని వెంటనే అందించగలము.`,
      kannada:   `${greetPart}ನಾವು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸದಾ ಸಿದ್ಧರಿದ್ದೇವೆ! 😊 ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ನೀಡಿ, ಇದರಿಂದ ನಾವು ನಿಮಗೆ ಅತ್ಯುತ್ತಮ ಪರಿಹಾರ ನೀಡಬಹುದು.`,
      malayalam: `${greetPart}ഞങ്ങൾ നിങ്ങളെ സഹായിക്കാൻ സദാ സന്നദ്ധരാണ്! 😊 കൂടുതൽ വിവരങ്ങൾ പങ്കുവെച്ചാൽ ഏറ്റവും അനുയോജ്യമായ പരിഹാരം ഉടൻ നൽകാം.`,
      bengali:   `${greetPart}আমরা আপনাকে সাহায্য করতে সর্বদা প্রস্তুত! 😊 আপনার समस्याটি একটু বিস্তারিত জানালে আমরা দ্রুত সবচেয়ে ভালো সমাধান প্রদান করতে পারব।`,
      english:   customerMessage && customerMessage.length > 4
        ? `${greetPart}I understand your concern and am here to make sure this is completely resolved for you! 😊 Could you please provide a few more details so I can look into this immediately and give you the best resolution?`
        : `${greetPart}I'm here to help and want to make sure your concern is fully resolved! 😊 Could you please share a bit more detail so I can look into this right away and provide you with the best solution?`,
    },
  };

  const langReplies = replies[issueType] || replies.general;
  return langReplies[language] || langReplies.english;
}

function getCoachingTip(issueType, language) {
  const tips = {
    network: {
      hindi:     'कनेक्टिविटी बाधा के प्रति गहरी सहानुभूति दिखाएं। लाइन डायग्नोस्टिक्स शुरू करते हुए ग्राहक से राउटर रीस्टार्ट करने को कहें।',
      tamil:     'இணைய சிக்கல்களுக்கு அனுதாபத்துடன் பதிலளிக்கவும். ரூட்டரை ரீஸ்டார்ட் செய்ய கேட்டு, லைன் சோதனையை தொடங்கவும்.',
      telugu:    'కనెక్టివిటీ సమస్యల కోసం సానుభూతిని చూపించండి. రౌటర్‌ను రీస్టార్ట్ చేయమని అడగండి మరియు లైన్ టెస్ట్ ప్రారంభించండి.',
      kannada:   'ಸಂಪರ್ಕ ದೋಷಗಳಿಗೆ ಸಹಾನುಭೂತಿ ತೋರಿಸಿ. ರೂಟರ್ ಮರುಪ್ರಾರಂಭಿಸಲು ತಿಳಿಸಿ ಮತ್ತು ಲೈನ್ ತಪಾಸಣೆ ನಡೆಸಿ.',
      malayalam: 'കണക്റ്റിവിറ്റി തടസ്സങ്ങൾക്ക് സഹതാപം കാണിക്കുക. റൂട്ടർ റീസ്റ്റാർട്ട് ചെയ്യാൻ ആവശ്യപ്പെടുക.',
      bengali:   'ইন্টারনেট সংযোগ সমস্যার জন্য সহানুভূতিশীল হোন। রাউটার রিস্টার্ট করতে বলুন এবং লাইন টেস্ট শুরু করুন।',
      english:   'Lead with high empathy for connectivity disruptions. Guide customer through router LED checks and a 30s power cycle while running line diagnostics.',
    },
    technical: {
      hindi:     'तकनीकी गड़बड़ी पर तुरंत ध्यान दें। ब्राउज़र या एरर कोड की जानकारी लें और कैशे क्लियर करने का सुझाव दें।',
      tamil:     'தொழில்நுட்ப கோளாறுகளை உடனே கவனித்து, பிழை குறியீட்டை கேட்டு, கேச் அழிக்க பரிந்துரைக்கவும்.',
      telugu:    'సాంకేతిక లోపాలను వెంటనే గుర్తించి, ఎర్రర్ కోడ్‌ను అడగండి మరియు క్యాచీ క్లియర్ చేయమని సూచించండి.',
      kannada:   'ತಾಂತ್ರಿಕ ದೋಷಗಳಿಗೆ ತಕ್ಷಣ ಗಮನ ಕೊಡಿ. ದೋಷ ಕೋಡ್ ಕೇಳಿ ಮತ್ತು ಕ್ಯಾಶ್ ತೆರವುಗೊಳಿಸಲು ತಿಳಿಸಿ.',
      malayalam: 'സാങ്കേതിക പ്രശ്നങ്ങൾക്ക് വേഗത്തിൽ മറുപടി നൽകുക. പിശക് കോഡ് ചോദിച്ച് കാഷെ ക്ലിയർ ചെയ്യാൻ പറയുക.',
      bengali:   'কারিগরি সমস্যা দ্রুত স্বীকার করুন। এরর কোড জানতে চান এবং ক্যাশ ক্লিয়ার করার পরামর্শ দিন।',
      english:   'Acknowledge technical malfunctions promptly. Ask for device/browser details and error messages, and suggest a hard refresh or cache clear.',
    },
    account: {
      hindi:     'खाता सुरक्षा को प्राथमिकता दें। क्रेडेंशियल रीसेट करने से पहले ग्राहक पहचान को सुरक्षित रूप से सत्यापित करें।',
      tamil:     'கணக்கு பாதுகாப்பிற்கு முன்னுரிமை கொடுங்கள். பாஸ்வேர்ட் மீட்டமைக்கும் முன் அடையாளத்தை சரிபார்க்கவும்.',
      telugu:    'ఖాతా భద్రతకు ప్రాధాన్యత ఇవ్వండి. రీసెట్ చేయడానికి ముందు గుర్తింపును ధృవీకరించండి.',
      kannada:   'ಖಾತೆ ಭದ್ರತೆಗೆ ಆದ್ಯತೆ ನೀಡಿ. ಮರುಹೊಂದಿಸುವ ಮೊದಲು ಗುರುತನ್ನು ಪರಿಶೀಲಿಸಿ.',
      malayalam: 'അക്കൗണ്ട് സുരക്ഷയ്ക്ക് മുൻഗണന നൽകുക. റീസെറ്റ് ചെയ്യുന്നതിന് മുമ്പ് ഐഡന്റിറ്റി പരിശോധിക്കുക.',
      bengali:   'অ্যাকাউন্ট সুরক্ষাকে প্রাধান্য দিন। পাসওয়ার্ড রিসেট করার আগে পরিচয় যাচাই করুন।',
      english:   'Prioritize account security and reassurance. Verify customer identity securely before initiating password reset or unlock procedures.',
    },
    setup: {
      hindi:     'स्पष्ट चरणबद्ध निर्देश प्रदान करें और ग्राहक को सेटअप प्रक्रिया में सुगमता से मार्गदर्शन करें।',
      tamil:     'தெளிவான படிப்படியான வழிகாட்டலை வழங்கி அமைவு செயல்முறையை எளிதாக்குங்கள்.',
      telugu:    'స్పష్టమైన దశలవారీ సూచనలను అందించి సెటప్ ప్రక్రియలో సులభంగా మార్గదర్శకత్వం చేయండి.',
      kannada:   'ಸ್ಪಷ್ಟ ಹಂತ-ಹಂತದ ಸೂಚನೆಗಳನ್ನು ನೀಡಿ ಸೆಟಪ್ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಸುಲಭಗೊಳಿಸಿ.',
      malayalam: 'വ്യക്തമായ ഘട്ടങ്ങളിലൂടെ നിർദ്ദേശങ്ങൾ നൽകി സെറ്റപ്പ് എളുപ്പമാക്കുക.',
      bengali:   'স্পষ্ট ধাপে ধাপে নির্দেশনা প্রদান করুন এবং সেটআপ প্রক্রিয়া সহজ করুন।',
      english:   'Provide structured, numbered step-by-step guidance. Confirm the customer goal and guide them smoothly through onboarding.',
    },
    payment: {
      hindi:     'बिलिंग समस्या के लिए पहले सहानुभूति व्यक्त करें। रिफंड की समय-सीमा (3-5 दिन) स्पष्ट रूप से बताएं।',
      tamil:     'பில்லிங் சிக்கல்களுக்கு முதலில் பரிவு காட்டுங்கள். ரீஃபண்ட் காலவரிசையை (3-5 நாட்கள்) தெளிவாக கூறுங்கள்.',
      telugu:    'బిల్లింగ్ సమస్యల కోసం ముందుగా సానుభూతిని వ్యక్తం చేయండి. రీఫండ్ కాలక్రమాన్ని స్పష్టంగా చెప్పండి.',
      kannada:   'ಬಿಲ್ಲಿಂಗ್ ಸಮಸ್ಯೆಗಳಿಗೆ ಮೊದಲು ಸಹಾನುಭೂತಿ ವ್ಯಕ್ತಪಡಿಸಿ. ಮರುಪಾವತಿ ಸಮಯವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಿ.',
      malayalam: 'ബില്ലിംഗ് പ്രശ്നങ്ങൾക്ക് ആദ്യം സഹതാപം പ്രകടിപ്പിക്കുക. റീഫണ്ട് കാലപരിധി വ്യക്തമാക്കുക.',
      bengali:   'বিলিং সমস্যার ক্ষেত্রে প্রথমে সহানুভূতি প্রকাশ করুন। রিফান্ডের সঠিক সময়সীমা স্পষ্টভাবে জানান।',
      english:   'Lead with empathy for billing issues. Confirm the problem clearly, take ownership, and provide an exact refund timeline.',
    },
    delivery: {
      hindi:     'ऑर्डर या डिलीवरी की जानकारी के लिए पहले ग्राहक से ऑर्डर आईडी मांगें, फिर ट्रैकिंग स्थिति की जाँच करें।',
      tamil:     'டெலிவரி தொடர்பான கேள்விகளுக்கு முதலில் ஆர்டர் ஐடியைக் கேட்டு, பின்னர் டிராக்கிங் நிலையை சரிபார்க்கவும்.',
      telugu:    'డెలివరీ ప్రశ్నల కోసం మొదట ఆర్డర్ ఐడీని అడగండి, ఆపై ట్రాకింగ్ స్థితిని తనిఖీ చేయండి.',
      kannada:   'ಡೆಲಿವರಿ ವಿಚಾರಗಳಿಗೆ ಮೊದಲು ಆರ್ಡರ್ ಐಡಿ ಕೇಳಿ, ನಂತರ ಟ್ರ್ಯಾಕಿಂಗ್ ಪರಿಶೀಲಿಸಿ.',
      malayalam: 'ഡെലിവറി സംശയങ്ങൾക്ക് ആദ്യം ഓർഡർ ഐഡി ചോദിക്കുക, തുടർന്ന് ട്രാക്കിംഗ് പരിശോധിക്കുക.',
      bengali:   'ডেলিভারি সম্পর্কিত প্রশ্নের জন্য প্রথমে গ্রাহকের কাছে অর্ডার আইডি চান, তারপর ট্র্যাকিং স্ট্যাটাস চেক করুন।',
      english:   'For order/delivery issues, ask for the order ID first, then check tracking. Reassure the customer you are actively on it.',
    },
    pricing: {
      hindi:     'मूल्य निर्धारण से जुड़े प्रश्न अपसेल का बेहतरीन अवसर हैं। सीट डिस्काउंट टियर्स स्पष्ट रूप से समझाएं।',
      tamil:     'விலை தொடர்பான விசாரணைகள் விற்பனை வாய்ப்புகள். தள்ளுபடி நிலைகளை தெளிவாக விளக்குங்கள்.',
      telugu:    'ధర విచారణలు అప్‌సెల్ అవకాశాలు. డిస్కౌంట్ శ్రేణులను స్పష్టంగా వివరించండి.',
      kannada:   'ಬೆಲೆ ವಿಚಾರಣೆಗಳು ಉತ್ತಮ ಅವಕಾಶಗಳು. ರಿಯಾಯಿತಿ ಹಂತಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿ.',
      malayalam: 'വില അന്വേഷണങ്ങൾ അപ്സെൽ അവസരങ്ങളാണ്. കിഴിവ് നിരക്കുകൾ വ്യക്തമായി വിശദീകരിക്കുക.',
      bengali:   'মূল্য সংক্রান্ত প্রশ্ন আপসেলের দারুণ সুযোগ। ডিসকাউন্ট স্তরগুলো স্পষ্টভাবে উপস্থাপন করুন।',
      english:   'Pricing queries are upsell opportunities. Be specific about discount tiers and offer a consultation call.',
    },
    cancel: {
      hindi:     'रद्द करने से पहले ग्राहक को बनाए रखने का प्रयास अवश्य करें। विकल्प के रूप में मानार्थ पॉज़ दें।',
      tamil:     'ரத்து செய்வதற்கு முன் தக்கவைக்க முயற்சிக்கவும். இலவச இடைநிறுத்தத்தை மாற்றாக வழங்கவும்.',
      telugu:    'రద్దు చేయడానికి ముందు నిలుపుకోవడానికి ప్రయత్నించండి. ప్రత్యామ్నాయంగా ఉచిత పాజ్‌ను ఆఫర్ చేయండి.',
      kannada:   'ರದ್ದುಗೊಳಿಸುವ ಮುನ್ನ ಗ್ರಾಹಕರನ್ನು ಉಳಿಸಿಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸಿ. ಉಚಿತ ವಿರಾಮವನ್ನು ಆಯ್ಕೆಯಾಗಿ ನೀಡಿ.',
      malayalam: 'റദ്ദാക്കുന്നതിന് മുമ്പ് നിലനിർത്താൻ ശ്രമിക്കുക. സൗജന്യ പോസ് നിർദ്ദേശിക്കുക.',
      bengali:   'বাতিল করার আগে ধরে রাখার চেষ্টা করুন। বিকল্প হিসেবে ফ্রি অ্যাকাউন্ট পজ অফার করুন।',
      english:   'Never process cancellations without a retention attempt. Offer alternatives.',
    },
    general: {
      hindi:     'समस्या को स्पष्ट करने वाला प्रश्न पूछें और सहानुभूति के साथ ग्राहक को आश्वस्त करें।',
      tamil:     'தெளிவுபடுத்தும் கேள்வியைக் கேட்டு, வாடிக்கையாளருக்கு பரிவுடன் உறுதியளிக்கவும்.',
      telugu:    'సమస్యను అర్థం చేసుకోవడానికి స్పష్టమైన ప్రశ్న అడగండి మరియు భరోసా ఇవ్వండి.',
      kannada:   'ಸ್ಪಷ್ಟೀಕರಣ ಪ್ರಶ್ನೆ ಕೇಳಿ ಮತ್ತು ಸಹಾನುಭೂತಿಯೊಂದಿಗೆ ಗ್ರಾಹಕರಿಗೆ ಭರವಸೆ ನೀಡಿ.',
      malayalam: 'വ്യക്തത വരുത്തുന്ന ചോദ്യങ്ങൾ ചോദിക്കുക, സഹതാപത്തോടെ ആശ്വാസം നൽകുക.',
      bengali:   'সমস্যাটি ভালোভাবে বোঝার জন্য প্রশ্ন করুন এবং সহানুভূতিশীল থাকুন।',
      english:   'Ask a focused clarifying question to understand the issue better. Stay empathetic and reassure the customer.',
    },
  };

  const tipGroup = tips[issueType] || tips.general;
  return tipGroup[language] || tipGroup.english;
}

function getKnowledgeTip(issueType, language) {
  const tips = {
    network: {
      hindi:     'एसओपी: राउटर/ओएनटी ऑप्टिकल पावर स्तर (-18 से -24 dBm) की जाँच करें और ऑन-साइट तकनीशियन भेजने से पहले नोड आउटेज स्थिति सत्यापित करें।',
      tamil:     'கொள்கை: ரூட்டரின் ஆப்டிகல் பவர் அளவை (-18 முதல் -24 dBm) சரிபார்க்கவும். தொழில்நுட்ப வல்லுநரை அனுப்புவதற்கு முன் ஏரியா நெட்வொர்க் நிலையை பார்க்கவும்.',
      telugu:    'విధానం: రౌటర్ ఆప్టికల్ పవర్ స్థాయిలను (-18 నుండి -24 dBm) తనిఖీ చేయండి. టెక్నీషియన్‌ను పంపే ముందు ప్రాంతీయ అంతరాయ స్థితిని ధృవీకరించండి.',
      kannada:   'ನೀತಿ: ರೂಟರ್ ಆಪ್ಟಿಕಲ್ ಪವರ್ ಮಟ್ಟವನ್ನು ಪರಿಶೀಲಿಸಿ (-18 ರಿಂದ -24 dBm). ತಂತ್ರಜ್ಞರನ್ನು ಕಳುಹಿಸುವ ಮೊದಲು ನೆಟ್‌ವರ್ಕ್ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ.',
      malayalam: 'നയം: റൂട്ടർ ഒപ്റ്റിക്കൽ പവർ ലെവലുകൾ (-18 മുതൽ -24 dBm വരെ) പരിശോധിക്കുക. ടെക്നീഷ്യനെ അയക്കുന്നതിന് മുൻപ് ഏരിയ തകരാർ പരിശോധിക്കുക.',
      bengali:   'নীতি: রাউটারের অপটিক্যাল পাওয়ার লেভেল (-১৮ থেকে -২৪ dBm) পরীক্ষা করুন। টেকনিশিয়ান পাঠানোর আগে নোড বিভ্রাট স্ট্যাটাস যাচাই করুন।',
      english:   'SOP: Check ONT optical power levels (target: -18 to -24 dBm). Verify neighborhood node status before dispatching an on-site technician.',
    },
    technical: {
      hindi:     'एसओपी: सक्रिय सेवा व्यवधानों के लिए क्लाउड स्टेटस डैशबोर्ड देखें। यदि समस्या बनी रहती है तो इनकॉग्निटो विंडो में परीक्षण कराएं।',
      tamil:     'கொள்கை: கிளவுட் சேவையின் செயலில் உள்ள நிலையை டாஷ்போர்டில் சரிபார்க்கவும். இன்காக்னிட்டோ பயன்முறையில் முயற்சி செய்ய பரிந்துரைக்கவும்.',
      telugu:    'విధానం: క్లౌడ్ సర్వీస్ స్టేటస్ డాష్‌బోర్డ్‌ను తనిఖీ చేయండి. సమస్య కొనసాగితే అజ్ఞాత విండోలో పరీక్షించమని సూచించండి.',
      kannada:   'ನೀತಿ: ಕ್ಲೌಡ್ ಸೇವಾ ಸ್ಥಿತಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪರಿಶೀಲಿಸಿ. ಇನ್‌ಕಾಗ್ನಿಟೋ ಮೋಡ್‌ನಲ್ಲಿ ಪರೀಕ್ಷಿಸಲು ತಿಳಿಸಿ.',
      malayalam: 'നയം: ക്ലൗഡ് സർവീസ് സ്റ്റാറ്റസ് ഡാഷ്‌ബോർഡ് പരിശോധിക്കുക. ഇൻകോഗ്നിറ്റോ വിൻഡോയിൽ പരീക്ഷിക്കാൻ നിർദ്ദേശിക്കുക.',
      bengali:   'নীতি: ক্লাউড স্ট্যাটাস ড্যাশবোর্ডে সক্রিয় বিভ্রাট পরীক্ষা করুন। ইনকগনিটো উইন্ডোতে টেস্ট করার পরামর্শ দিন।',
      english:   'SOP: Check cloud service status dashboard for active API incidents. Suggest cache refresh and Incognito mode as first-line triage.',
    },
    account: {
      hindi:     'एसओपी: पासवर्ड रीसेट लिंक 15 मिनट में समाप्त हो जाते हैं। अनलॉक करने से पहले पंजीकृत ईमेल या 2FA सत्यापन अनिवार्य है।',
      tamil:     'கொள்கை: பாஸ்வேர்ட் மீட்டமைப்பு இணைப்புகள் 15 நிமிடங்களில் காலாவதியாகிவிடும். திறப்பதற்கு முன் 2FA சரிபார்ப்பு கட்டாயமாகும்.',
      telugu:    'విధానం: పాస్‌వర్డ్ రీసెట్ లింక్‌లు 15 నిమిషాల్లో ముగుస్తాయి. అన్‌లాక్ చేయడానికి ముందు 2FA ధృవీకరణ అవసరం.',
      kannada:   'ನೀತಿ: ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್‌ಗಳು 15 ನಿಮಿಷಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳ್ಳುತ್ತವೆ. ಅನ್‌ಲಾಕ್ ಮಾಡುವ ಮೊದಲು 2FA ದೃಢೀಕರಣ ಕಡ್ಡಾಯ.',
      malayalam: 'നയം: പാസ്‌വേഡ് റീസെറ്റ് ലിങ്കുകൾ 15 മിനിറ്റുകൾക്കുള്ളിൽ കാലഹരണപ്പെടും. അൺലോക്ക് ചെയ്യുന്നതിന് മുൻപ് 2FA സ്ഥിരീകരണം നിർബന്ധമാണ്.',
      bengali:   'নীতি: পাসওয়ার্ড রিসেট লিঙ্ক ১৫ মিনিটের মধ্যে মেয়াদোত্তীর্ণ হয়। আনলক করার আগে ২এফএ যাচাইকরণ বাধ্যতামূলক।',
      english:   'SOP: Account password reset links expire after 15 minutes. Verify registered email or phone via 2FA before unlocking accounts.',
    },
    setup: {
      hindi:     'एसओपी: चरण-दर-चरण कॉन्फ़िगरेशन के लिए नॉलेज बेस गाइड #KB-302 देखें और ग्राहक को आधिकारिक डॉक्यूमेंटेशन साझा करें।',
      tamil:     'கொள்கை: உள்ளமைவுக்கு அறிவுத் தளம் வழிகாட்டி #KB-302 ஐப் பார்க்கவும் மற்றும் அதிகாரப்பூர்வ வழிகாட்டியைப் பகிரவும்.',
      telugu:    'విధానం: కాన్ఫిగరేషన్ కోసం నాలెడ్జ్ బేస్ గైడ్ #KB-302ని చూడండి మరియు యూజర్ డాక్యుమెంటేషన్‌ను భాగస్వామ్యం చేయండి.',
      kannada:   'ನೀತಿ: ಕಾನ್ಫಿಗರೇಶನ್‌ಗಾಗಿ ಜ್ಞಾನ ತಾಣ ಮಾರ್ಗದರ್ಶಿ #KB-302 ನೋಡಿ ಮತ್ತು ದಾಖಲಾತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.',
      malayalam: 'നയം: കോൺഫിഗറേഷനായി നോളജ് ബേസ് ഗൈഡ് #KB-302 കാണുക, ഔദ്യോഗിക ഗൈഡ് പങ്കുവെക്കുക.',
      bengali:   'নীতি: কনফিগারেশনের জন্য নলেজ বেস নির্দেশিকা #KB-302 দেখুন এবং ব্যবহারকারী ডকুমেন্টেশন শেয়ার করুন।',
      english:   'SOP: Refer to Knowledge Article #KB-302 for step-by-step configuration. Provide direct link to user onboarding documentation.',
    },
    payment: {
      hindi:     'पॉलिसी: बिलिंग त्रुटि का रिफंड 3–5 व्यावसायिक दिनों में संसाधित होता है। रिफंड शुरू करने से पहले लेनदेन आईडी अवश्य सत्यापित करें।',
      tamil:     'கொள்கை: பில்லிங் பிழைக்கான ரீஃபண்ட் 3-5 வேலை நாட்களில் செயல்படுத்தப்படும். தொடங்குவதற்கு முன் பரிவர்த்தனை ஐடியை சரிபார்க்கவும்.',
      telugu:    'విధానం: బిల్లింగ్ లోపం రీఫండ్‌లు 3–5 పని దినాలలో ప్రాసెస్ చేయబడతాయి. ప్రారంభించడానికి ముందు లావాదేవీ ఐడీని ధృవీకరించండి.',
      kannada:   'ನೀತಿ: ಬಿಲ್ಲಿಂಗ್ ದೋಷದ ಮರುಪಾವತಿಯನ್ನು 3-5 ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತದೆ.',
      malayalam: 'നയം: ബില്ലിംഗ് റീഫണ്ടുകൾ 3–5 പ്രവൃത്തി ദിവസങ്ങൾക്കുള്ളിൽ പ്രോസസ്സ് ചെയ്യപ്പെടും.',
      bengali:   'নীতি: বিলিং ভুলের রিফান্ড ৩-৫ কার্যদিবসের মধ্যে সম্পন্ন হয়। শুরু করার আগে লেনদেন আইডি যাচাই করুন।',
      english:   'Policy: Billing error refunds are processed within 3–5 business days. Verify the transaction ID before initiating the refund.',
    },
    delivery: {
      hindi:     'पॉलिसी: यदि अनुमानित डिलीवरी तिथि से 3+ दिन बीत चुके हैं, तो लॉजिस्टिक्स को तुरंत एस्केलेट करें और ट्रेस अनुरोध भेजें।',
      tamil:     'கொள்கை: எதிர்பார்க்கப்படும் தேதியிலிருந்து 3+ நாட்கள் கடந்தும் டெலிவரி ஆகவில்லை என்றால், லாஜிஸ்டிக்ஸுக்கு தெரியப்படுத்துங்கள்.',
      telugu:    'విధానం: ఆశించిన తేదీ దాటి 3+ రోజులు అయినా డెలివరీ కాకపోతే, లాజిస్టిక్స్‌కు తెలియజేసి ట్రేస్ అభ్యర్థనను పంపండి.',
      kannada:   'ನೀತಿ: ನಿರೀಕ್ಷಿತ ದಿನಾಂಕಕ್ಕಿಂತ 3+ ದಿನಗಳ ನಂತರವೂ ತಲುಪದಿದ್ದರೆ, ಲಾಜಿಸ್ಟಿಕ್ಸ್ ತಂಡಕ್ಕೆ ತಕ್ಷಣ ತಿಳಿಸಿ.',
      malayalam: 'നയം: പ്രതീക്ഷിച്ച തീയതി കഴിഞ്ഞ് 3+ ദിവസമായിട്ടും ലഭിച്ചില്ലെങ്കിൽ ഉടൻ ലോജിസ്റ്റിക്സ് ടീമിനെ അറിയിക്കുക.',
      bengali:   'নীতি: প্রত্যাশিত তারিখের ৩+ দিন পরও ডেলিভারি না হলে লজিস্টিক্সে জানান এবং ট্রেস রিকোয়েস্ট পাঠান।',
      english:   'Policy: Escalate to logistics if undelivered 3+ days past expected date. Initiate a trace request within 24 hours.',
    },
    pricing: {
      hindi:     'वॉल्यूम डिस्काउंट टियर्स — 10 सीटें: 12%, 15 सीटें: 18%, 25+ सीटें: 22%। वार्षिक बिलिंग अनिवार्य है।',
      tamil:     'தள்ளுபடி நிலைகள் — 10 இருக்கைகள்: 12%, 15 இருக்கைகள்: 18%, 25+ இருக்கைகள்: 22%. வருடாந்திர பில்லிங் தேவை.',
      telugu:    'డిస్కౌంట్ శ్రేణులు — 10 సీట్లు: 12%, 15 సీట్లు: 18%, 25+ సీట్లు: 22%. వార్షిక బిల్లింగ్ అవసరం.',
      kannada:   'ರಿಯಾಯಿತಿ ಶ್ರೇಣಿಗಳು — 10 ಸೀಟುಗಳು: 12%, 15 ಸೀಟುಗಳು: 18%, 25+ ಸೀಟುಗಳು: 22%.',
      malayalam: 'ഡിസ്കൗണ്ട് നിരക്കുകൾ — 10 സീറ്റുകൾ: 12%, 15 സീറ്റുകൾ: 18%, 25+ സീറ്റുകൾ: 22%.',
      bengali:   'ডিসকাউন্ট স্তর — ১০টি সিট: ১২%, ১৫টি সিট: ১৮%, ২৫+ সিট: ২২%। বার্ষিক বিলিং আবশ্যক।',
      english:   'Volume discount tiers — 10 seats: 12%, 15 seats: 18%, 25+ seats: 22%. Annual billing required for all tiers.',
    },
    cancel: {
      hindi:     'रिटेंशन पॉलिसी: रद्दीकरण से पहले ग्राहक को 1 महीने का मानार्थ पॉज़ या $25 का अकाउंट क्रेडिट अवश्य ऑफर करें।',
      tamil:     'தக்கவைப்புக் கொள்கை: ரத்து செய்வதற்கு முன் 1 மாத இலவச சேவை அல்லது கணக்கு கிரெடிட்டை வழங்கவும்.',
      telugu:    'రిటెన్షన్ పాలసీ: రద్దు చేయడానికి ముందు 1 నెల ఉచిత పాజ్ లేదా క్రెడిట్‌ను ఆఫర్ చేయండి.',
      kannada:   'ಧಾರಣ ನೀತಿ: ರದ್ದುಗೊಳಿಸುವ ಮೊದಲು 1 ತಿಂಗಳ ಉಚಿತ ವಿರಾಮ ಅಥವಾ ಕ್ರೆಡಿಟ್ ಆಫರ್ ಮಾಡಿ.',
      malayalam: 'റീട്ടെൻഷൻ നയം: റദ്ദാക്കുന്നതിന് മുമ്പ് 1 മാസത്തെ സൗജന്യ ക്രെഡിറ്റ് നിർദ്ദേശിക്കുക.',
      bengali:   'ধরে রাখার নীতি: বাতিল করার আগে সর্বদা ১ মাসের ফ্রি পজ বা অ্যাকাউন্ট ক্রেডিট অফার করুন।',
      english:   'Retention policy: Always attempt to retain before processing cancellation. Offer a complimentary 1-month pause as an alternative.',
    },
    general: {
      hindi:     'सुरक्षा नियम: खाते में कोई भी वित्तीय या लेन-देन परिवर्तन करने से पहले ग्राहक पहचान अवश्य सत्यापित करें।',
      tamil:     'பாதுகாப்பு: எந்தவொரு பரிவர்த்தனை மாற்றத்தையும் செய்வதற்கு முன் வாடிக்கையாளர் அடையாளத்தை சரிபார்க்கவும்.',
      telugu:    'భద్రత: ఏదైనా మార్పులు చేసే ముందు కస్టమర్ గుర్తింపును ధృవీకరించండి.',
      kannada:   'ಸುರಕ್ಷತೆ: ಯಾವುದೇ ವಹಿವಾಟು ಬದಲಾವಣೆ ಮಾಡುವ ಮೊದಲು ಗ್ರಾಹಕರ ಗುರುತನ್ನು ಪರಿಶೀಲಿಸಿ.',
      malayalam: 'സുരക്ഷ: ഇടപാടുകളിൽ മാറ്റം വരുത്തുന്നതിന് മുമ്പ് ഉപഭോക്താവിന്റെ ഐഡന്റിറ്റി പരിശോധിക്കുക.',
      bengali:   'নিরাপত্তা: কোনো অ্যাকাউন্টে পরিবর্তন করার আগে সর্বদা গ্রাহকের পরিচয় ও বিবরণ যাচাই করুন।',
      english:   'Verify customer identity and account details before any transactional changes.',
    },
  };

  const tipGroup = tips[issueType] || tips.general;
  return tipGroup[language] || tipGroup.english;
}

function getInitialSessions() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(parsed)) {
          const custName = v?.customer?.name || v?.customerName || '';
          if (!isMockTicketOrSession(k) && !isMockTicketOrSession(v?.id) && !isMockCustomer(custName)) {
            cleaned[k] = v;
          }
        }
        // Save cleaned cache back to remove stale mock items from localStorage permanently
        saveSessions(cleaned);
        return cleaned;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function getStoredStats() {
  const stored = localStorage.getItem(STATS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return {
    scores: [],
  };
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Sanitizes and normalizes burnout & stress scores based on actual agent empathy, tone and response quality.
 * Prevents artificial inflation when agent delivers high-empathy, composed replies.
 */
export function sanitizeBurnout(burnout, empathy = 8, tone = 8, agentMessage = '') {
  if (!burnout) return null;
  const wordCount = agentMessage ? agentMessage.trim().split(/\s+/).filter(Boolean).length : 0;
  // If agent provides a thoughtful reply with good empathy and tone (>= 7), stress is LOW/OPTIMAL
  if (empathy >= 7 && tone >= 7) {
    const isSuperb = empathy >= 8 && tone >= 8;
    const cleanIndex = isSuperb ? (wordCount > 20 ? 14 : 18) : 24;
    return {
      ...burnout,
      burnout_index: cleanIndex,
      burnout_risk: 'low',
      supervisor_action: 'Agent composure is high; communication quality and empathy are optimal.',
      signals: {
        lexical_richness_drop_pct: 0,
        empathy_density_drop_pct: 0,
        recent_brevity_score: +(wordCount > 20 ? 0.22 : 0.32),
      }
    };
  }
  return burnout;
}

export const api = {
  // Check engine status
  async getStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    const prefEngine = (typeof localStorage !== 'undefined' && localStorage.getItem('carebot_preferred_engine')) || 'groq';
    return {
      status: 'running',
      coach_type: prefEngine,
      provider: prefEngine,
      engine_label: prefEngine === 'claude' ? 'Claude Engine (Sonnet)' : prefEngine === 'hf' ? 'HuggingFace Offline' : 'Groq Engine (groq/compound-mini)',
      knowledge_base: 'loaded',
    };
  },

  // Get list of all dynamic conversation sessions
  async getSessions() {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          const localSessions = getInitialSessions();
          const cleanSessions = data.sessions.filter(s => 
            !isMockCustomer(s.customer_name) && !isMockTicketOrSession(s.id)
          );
          // Sync any new sessions to local cache
          for (const s of cleanSessions) {
            if (!localSessions[s.id]) {
              localSessions[s.id] = {
                id: s.id,
                title: s.title,
                customer: { name: s.customer_name, plan: s.customer_plan },
                turns: [],
                last_sentiment: s.last_sentiment || 'neutral',
                last_urgency: s.last_urgency || 'low',
                updated_at: s.updated_at || 'Just now',
              };
            }
          }
          saveSessions(localSessions);
          return { sessions: cleanSessions };
        }
      }
    } catch (e) {
      // fallback to local storage
    }
    const sessions = getInitialSessions();
    const list = Object.values(sessions)
      .filter(s => !isMockCustomer(s.customer?.name) && !isMockTicketOrSession(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title || `Ticket #${s.id}`,
        customer_name: s.customer?.name || 'Customer',
        customer_plan: s.customer?.plan || 'Standard',
        turns_count: s.turns ? s.turns.length : 0,
        last_sentiment: s.last_sentiment || 'neutral',
        last_urgency: s.last_urgency || 'low',
        updated_at: s.updated_at || 'Just now',
      }));
    return { sessions: list };
  },

  // Get full session details & turn history
  async getSession(id) {
    try {
      const res = await fetch(`${API_BASE}/api/session/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          const localSessions = getInitialSessions();
          localSessions[id] = { ...(localSessions[id] || {}), ...data };
          saveSessions(localSessions);
          return localSessions[id];
        }
      }
    } catch (e) {
      // fallback
    }
    const sessions = getInitialSessions();
    const session = sessions[id] || null;
    if (session && Array.isArray(session.turns)) {
      let modified = false;
      session.turns.forEach((t) => {
        if (t.result?.burnout) {
          const emp = t.result?.feedback?.empathy_score ?? 8;
          const ton = t.result?.feedback?.tone_score ?? 8;
          const sanitized = sanitizeBurnout(t.result.burnout, emp, ton, t.agent_message);
          if (sanitized && sanitized.burnout_index !== t.result.burnout.burnout_index) {
            t.result.burnout = sanitized;
            modified = true;
          }
        }
      });
      if (modified) {
        saveSessions(sessions);
      }
    }
    return session;
  },

  // Create new session dynamically (from user input)
  async createSession(customData = null) {
    const sessions = getInitialSessions();
    const explicitId = customData?.session_id || customData?.id;
    const newId = explicitId
      ? (String(explicitId).startsWith('TK-') ? String(explicitId) : `TK-${explicitId}`)
      : `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    let newCustomer;
    let title;

    if (customData && customData.name) {
      newCustomer = {
        name: customData.name.trim(),
        email: customData.email ? customData.email.trim() : `${customData.name.toLowerCase().replace(/\s+/g, '.')}@client.com`,
        plan: customData.plan || 'Custom Plan',
        value: customData.value || '$1,200 / yr',
        initial_msg: customData.initial_message ? customData.initial_message.trim() : '',
      };
      title = customData.title ? customData.title.trim() : `${newCustomer.name} — Support Session`;
    } else {
      newCustomer = {
        name: 'New Customer',
        email: 'customer@client.com',
        plan: 'Custom Plan',
        value: '$1,200 / yr',
        initial_msg: '',
      };
      title = `Ticket #${newId} Session`;
    }

    try {
      await fetch(`${API_BASE}/api/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newId,
          name: newCustomer.name,
          customer_name: newCustomer.name,
          email: newCustomer.email,
          customer_email: newCustomer.email,
          plan: newCustomer.plan,
          customer_plan: newCustomer.plan,
          value: newCustomer.value,
          customer_mrr: parseFloat((newCustomer.value || '').replace(/[^0-9.]/g, '')) || 1200.0,
          title,
          initial_message: newCustomer.initial_msg || '',
          initial_msg: newCustomer.initial_msg || '',
        }),
      });
    } catch (e) {
          }

    const newSession = {
      id: newId,
      title,
      customer: newCustomer,
      turns: [],
      last_sentiment: 'neutral',
      last_urgency: 'low',
      updated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    sessions[newId] = newSession;
    saveSessions(sessions);
    try {
      saveSessionToFirestore(newSession);
    } catch {}
    return { session: newSession };
  },

  // Create a brand new fresh incoming session when an agent signs in
  async createFreshSession(agentUser = null) {
    const sessions = getInitialSessions();
    const randomIdNum = Math.floor(2000 + Math.random() * 7990);
    const newId = `TK-${randomIdNum}`;

    const agentName = agentUser?.displayName || (agentUser?.email ? agentUser.email.split('@')[0] : 'Support Specialist');

    const newCustomer = {
      name: 'Inbound Customer',
      company: 'Direct Client',
      email: 'customer@inbound.com',
      plan: 'Active Customer',
      value: '$1,200 / yr',
      initial_msg: 'Hello, I have an inquiry regarding our service.',
    };

    const newSession = {
      id: newId,
      title: `Inbound Ticket #${newId}`,
      customer: newCustomer,
      turns: [], // Zero turns: clean, fresh transcript
      assigned_agent: agentName,
      last_sentiment: 'neutral',
      last_urgency: 'medium',
      updated_at: 'Just now',
      isFresh: true,
      createdAt: new Date().toISOString(),
    };

    // Put new fresh session at head of sessions list
    const updatedSessions = { [newId]: newSession, ...sessions };
    saveSessions(updatedSessions);

    try {
      await fetch(`${API_BASE}/api/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newId,
          name: newCustomer.name,
          customer_name: newCustomer.name,
          email: newCustomer.email,
          customer_email: newCustomer.email,
          plan: newCustomer.plan,
          customer_plan: newCustomer.plan,
          value: newCustomer.value,
          customer_mrr: parseFloat((newCustomer.value || '').replace(/[^0-9.]/g, '')) || 1200.0,
          title: newSession.title,
          initial_message: newCustomer.initial_msg,
          initial_msg: newCustomer.initial_msg,
        }),
      });
    } catch (e) {
      console.warn('[API] Failed to sync session to backend:', e);
    }

    try {
      saveSessionToFirestore(newSession);
    } catch (e) {}

    return { session: newSession };
  },

  // Delete session dynamically by ID
  async deleteSession(id) {
    try {
      await fetch(`${API_BASE}/api/session/${id}`, { method: 'DELETE' });
    } catch (e) {
      // ignore
    }
    try {
      deleteSessionFromFirestore(id);
    } catch (e) {
      // ignore
    }
    const sessions = getInitialSessions();
    delete sessions[id];
    saveSessions(sessions);
    const remaining = Object.keys(sessions);
    return { success: true, next_id: remaining.length > 0 ? remaining[0] : null };
  },

  // Reset/clear turns for a session
  async resetSession(sessionId) {
    try {
      await fetch(`${API_BASE}/api/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (e) {
      // ignore
    }
    const sessions = getInitialSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].turns = [];
      saveSessions(sessions);
    }
    return { success: true };
  },

    async analyzeCustomerMessage(customerMessage, customerName, turnsCount = 0) {
    const lowerCust = (customerMessage || '').toLowerCase();
    const isFirstMessage = turnsCount === 0; // Only greet on first message

        const lang = detectLanguage(customerMessage);

        if (isThankYou(lowerCust, lang)) {
      return {
        analysis: { sentiment: 'positive', urgency: 'low', escalation_risk: 'low', key_issue: 'Customer expressing gratitude / closing conversation' },
        feedback: { tone_score: 10, empathy_score: 10, clarity_score: 10, coaching_tip: 'Warmly acknowledge the thanks, reinforce the positive experience, and invite future contact.', knowledge_suggestion: '' },
        compliance: { violation: false, issue: '', suggestion: '' },
        suggested_reply: getThankYouReply(lang, customerName),
        detected_language: lang,
        latency_seconds: (0.12 + Math.random() * 0.08).toFixed(2),
      };
    }

    let sentiment = 'neutral', urgency = 'medium', risk = 'low';

    // Native script & Hindi-aware negative keywords
    const negativeWords = [
      'nahi mila', 'paisa', 'refund', 'dikkat', 'problem', 'kya hua', 'kyu nahi', 'double', 'do baar',
      'नहीं मिला', 'कहाँ है', 'कहा है', 'कब आएगा', 'कट गया', 'कट गए', 'पैसे कट गए', 'समस्या', 'दिक्कत', 'खराब', 'रद्द', 'कैंसिल', 'तुरंत', 'दो बार', 'डबल',
      'வரவில்லை', 'எங்கே', 'பிரச்சனை', 'ரத்து', 'தவறு',
      'రాలేదు', 'ఎక్కడ', 'సమస్య', 'రద్దు', 'తప్పు',
      'ಬಂದಿಲ್ಲ', 'ಎಲ್ಲಿದೆ', 'ಸಮಸ್ಯೆ', 'ರದ್ದು',
      'വന്നില്ല', 'എവിടെ', 'പ്രശ്നം', 'റദ്ദാക്കുക',
      'আসেনি', 'কোথায়', 'সমস্যা', 'বাতিল',
    ];

    const isNegative =
      lowerCust.includes('twice') || lowerCust.includes('deducted') ||
      lowerCust.includes('refund') || lowerCust.includes('money back') ||
      lowerCust.includes('broken') || lowerCust.includes('immediately') ||
      lowerCust.includes('unacceptable') || lowerCust.includes('cancel') ||
      lowerCust.includes('error') || lowerCust.includes('fail') ||
      lowerCust.includes('terrible') || lowerCust.includes('not placed') ||
      lowerCust.includes('not received') || lowerCust.includes('charged') ||
      lowerCust.includes('not working') || lowerCust.includes('issue') ||
      lowerCust.includes('problem') || lowerCust.includes('payment') ||
      lowerCust.includes('disconnect') || lowerCust.includes('slow net') ||
      lowerCust.includes('offline') || lowerCust.includes('no signal') ||
      negativeWords.some((w) => lowerCust.includes(w) || (customerMessage && customerMessage.includes(w)));

    const isPositive =
      isThankYou(lowerCust, lang) ||
      lowerCust.includes('thank') || lowerCust.includes('great') ||
      lowerCust.includes('awesome') || lowerCust.includes('perfect') ||
      lowerCust.includes('resolved') || lowerCust.includes('appreciate') ||
      lowerCust.includes('shukriya') || lowerCust.includes('dhanyavaad') ||
      lowerCust.includes('nandri') || lowerCust.includes('dhanyavada');

    if (isNegative) {
      sentiment = 'negative'; urgency = 'high';
      risk = (lowerCust.includes('cancel') || lowerCust.includes('immediately') || lowerCust.includes('money back') || (customerMessage && (customerMessage.includes('कैंसिल') || customerMessage.includes('रद्द')))) ? 'high' : 'medium';
    } else if (isPositive) {
      sentiment = 'positive'; urgency = 'low'; risk = 'low';
    }

        const isCancel =
      lowerCust.includes('cancel') || lowerCust.includes('subscription') || lowerCust.includes('dissatisfied') ||
      ['कैंसिल', 'रद्द', 'पसंद नहीं', 'बंद करो', 'कैंसल'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ரத்து', 'பிடிக்கவில்லை'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['రద్దు', 'నచ్చలేదు'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ರದ್ದು', 'ಇಷ್ಟವಿಲ್ಲ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['റദ്ദാക്കുക', 'ഇഷ്ടപ്പെട്ടില്ല'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['বাতিল', 'ভালো লাগেনি'].some((w) => customerMessage && customerMessage.includes(w));

    const isPayment =
      lowerCust.includes('deducted') || lowerCust.includes('charged') || lowerCust.includes('twice') ||
      lowerCust.includes('payment') || lowerCust.includes('money back') || lowerCust.includes('refund') ||
      lowerCust.includes('paisa') || lowerCust.includes('paise') || lowerCust.includes('kat gaya') ||
      ['पैसे', 'कट गए', 'कट गया', 'कटा', 'रिफंड', 'भुगतान', 'दो बार', 'डबल'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['பணம்', 'ரீபண்ட்', 'பிடிக்கப்பட்டது'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['డబ్బులు', 'రీఫండ్', 'కట్'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ಹಣ', 'ರೀಫಂಡ್'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['പണം', 'റീഫണ്ട്'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['টাকা', 'রিফান্ড', 'পেমেন্ট'].some((w) => customerMessage && customerMessage.includes(w));

    const isPricing =
      lowerCust.includes('discount') || lowerCust.includes('pricing') || lowerCust.includes('seats') ||
      lowerCust.includes('upgrade') || lowerCust.includes('plan') ||
      ['डिस्काउंट', 'छूट', 'कीमत', 'दाम', 'प्लान', 'सीट'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['விலை', 'தள்ளுபடி'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ధర', 'తగ్గింపు'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ಬೆಲೆ', 'ರಿಯಾಯಿತಿ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['വില', 'കിഴിവ്'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['দাম', 'ছাড়'].some((w) => customerMessage && customerMessage.includes(w));

    const isDelivery =
      lowerCust.includes('not placed') || lowerCust.includes('order') || lowerCust.includes('not received') ||
      lowerCust.includes('package') || lowerCust.includes('delivery') || lowerCust.includes('tracking') ||
      lowerCust.includes('track') || lowerCust.includes('milna') || lowerCust.includes('nahi mila') ||
      lowerCust.includes('kahan') || lowerCust.includes('kab aayega') ||
      ['ऑर्डर', 'कहाँ', 'कहा', 'कहा हे', 'डिलीवरी', 'पार्सल', 'ट्रैकिंग', 'कब आएगा', 'नहीं मिला', 'पहुंचा'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ஆர்டர்', 'எங்கே', 'டெலிவரி'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ఆర్డర్', 'ఎక్కడ', 'డెలివరీ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ಆರ್ಡರ್', 'ಎಲ್ಲಿದೆ', 'ಡೆಲಿವರಿ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ഓർഡർ', 'എവിടെ', 'ഡെലിവറി'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['অর্ডার', 'কোথায়', 'ডেলিভারি'].some((w) => customerMessage && customerMessage.includes(w));

    const isNetwork =
      lowerCust.includes('internet') || lowerCust.includes('network') || lowerCust.includes('wifi') ||
      lowerCust.includes('wi-fi') || lowerCust.includes('broadband') || lowerCust.includes('connection') ||
      lowerCust.includes('disconnect') || lowerCust.includes('offline') || lowerCust.includes('router') ||
      lowerCust.includes('modem') || lowerCust.includes('slow net') || lowerCust.includes('latency') ||
      lowerCust.includes('no signal') || lowerCust.includes('ping') || lowerCust.includes('ethernet') ||
      lowerCust.includes('net issue') || (lowerCust.includes('not working') && (lowerCust.includes('net') || lowerCust.includes('web') || lowerCust.includes('line') || lowerCust.includes('connection'))) ||
      ['इंटरनेट', 'नेटवर्क', 'वाइफाई', 'वाईफाई', 'नेट', 'कनेक्शन', 'राउटर', 'धीमा', 'चल नहीं रहा', 'सिग्नल'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['இணையம்', 'நெட்வொர்க்', 'வைஃபை', 'இணைப்பு'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ఇంటర్నెట్', 'నెట్‌వర్క్', 'వైఫై', 'కనెక్షన్'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ಇಂಟರ್ನೆಟ್', 'ನೆಟ್‌ವರ್ಕ್', 'ವೈಫೈ', 'ಸಂಪರ್ಕ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ഇന്റർനെറ്റ്', 'നെറ്റ്‌വർക്ക്', 'വൈഫൈ', 'കണക്ഷൻ'].some((w) => customerMessage && customerMessage.includes(w)) ||
      ['ইন্টারনেট', 'নেটওয়ার্ক', 'ওয়াইফাই', 'সংযোগ'].some((w) => customerMessage && customerMessage.includes(w));

    const isTechnical =
      lowerCust.includes('crash') || lowerCust.includes('bug') || lowerCust.includes('glitch') ||
      lowerCust.includes('freeze') || lowerCust.includes('blank screen') || lowerCust.includes('white screen') ||
      lowerCust.includes('stuck') || lowerCust.includes('failed to load') || lowerCust.includes('not loading') ||
      lowerCust.includes('timeout') || lowerCust.includes('server down') || lowerCust.includes('500') || lowerCust.includes('404') ||
      ['क्रैश', 'बग', 'एरर', 'लोड नहीं हो रहा', 'अटक गया', 'खराबी'].some((w) => customerMessage && customerMessage.includes(w));

    const isAccount =
      lowerCust.includes('login') || lowerCust.includes('password') || lowerCust.includes('log in') ||
      lowerCust.includes('sign in') || lowerCust.includes('locked out') || lowerCust.includes('reset password') ||
      lowerCust.includes('forgot password') || lowerCust.includes('otp') || lowerCust.includes('2fa') ||
      lowerCust.includes('access denied') || lowerCust.includes('sso') ||
      ['लॉगिन', 'पासवर्ड', 'अकाउंट', 'खुल नहीं रहा', 'ओटीपी'].some((w) => customerMessage && customerMessage.includes(w));

    const isSetup =
      lowerCust.includes('how to') || lowerCust.includes('how do i') || lowerCust.includes('setup') ||
      lowerCust.includes('set up') || lowerCust.includes('configure') || lowerCust.includes('install') ||
      lowerCust.includes('guide') || lowerCust.includes('tutorial') ||
      ['कैसे करें', 'सेटअप', 'इंस्टॉल', 'शुरू करें'].some((w) => customerMessage && customerMessage.includes(w));

    let issueType = 'general';
    if (isCancel) {
      issueType = 'cancel';
    } else if (isPayment) {
      issueType = 'payment';
    } else if (isPricing) {
      issueType = 'pricing';
    } else if (isDelivery) {
      issueType = 'delivery';
    } else if (isNetwork) {
      issueType = 'network';
    } else if (isTechnical) {
      issueType = 'technical';
    } else if (isAccount) {
      issueType = 'account';
    } else if (isSetup) {
      issueType = 'setup';
    } else if (isPositive) {
      issueType = 'general'; // will use thank-you reply logic
    }

    const suggestedReply = isPositive
      ? getThankYouReply(lang, customerName, isFirstMessage)
      : getSuggestedReply(issueType, lang, customerName, isFirstMessage, customerMessage);

    const coachingTip  = getCoachingTip(issueType, lang);
    const knowledgeTip = getKnowledgeTip(issueType, lang);

    const tone    = isPositive ? 9 : 8;
    const empathy = isNegative ? 9 : 7;
    const clarity = 8;

    const annualVal = '$1,200 / yr';
    const churnProb = risk === 'high' ? 0.65 : (risk === 'medium' ? 0.30 : 0.08);
    const numVal = 1200;
    const clvRisk = {
      clv_risk: risk === 'high' ? 'high' : (risk === 'medium' ? 'medium' : 'low'),
      priority_flag: risk === 'high',
      annual_plan_value: annualVal,
      revenue_at_risk: `$${Math.round(numVal * churnProb).toLocaleString()}`,
      churn_probability: churnProb,
      issue_type: issueType,
      retention_tip: risk === 'high'
        ? 'Customer is at elevated risk of churn. Offer prompt resolution or credit.'
        : 'Maintain empathetic rapport to reinforce customer retention.'
    };

    const burnout = {
      burnout_index: 15,
      burnout_risk: 'low',
      supervisor_action: 'Agent composure is high; communication quality and empathy are optimal.',
      signals: {
        lexical_richness_drop_pct: 0,
        empathy_density_drop_pct: 0,
        recent_brevity_score: 0.28
      }
    };

    return {
      analysis: {
        sentiment, urgency, escalation_risk: risk,
        key_issue: extractShortIssue(customerMessage),
      },
      feedback: {
        tone_score: tone, empathy_score: empathy, clarity_score: clarity,
        coaching_tip: coachingTip,
        knowledge_suggestion: knowledgeTip,
      },
      compliance:      { violation: false, issue: '', suggestion: '' },
      suggested_reply: suggestedReply,
      detected_language: lang,
      latency_seconds: (0.18 + Math.random() * 0.10).toFixed(2),
      burnout,
      clv_risk: clvRisk,
    };
  },

  // Process turn through coaching API
  async sendCoachTurn({ agentMessage, customerMessage, sessionId, customerName, customer }) {
    const lowerCust = (customerMessage || '').toLowerCase();
    const lang = detectLanguage(customerMessage);
    const sessions = getInitialSessions();

    try {
      const currentCust = customer || (sessions[sessionId]?.customer) || { name: customerName };
      const response = await fetch(`${API_BASE}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_message: agentMessage,
          customer_message: customerMessage,
          session_id: sessionId,
          agent_id: 'default_agent',
          customer_name: currentCust.name || customerName,
          customer: currentCust,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.analysis) {
          result.analysis.key_issue = extractShortIssue(result.analysis.key_issue || customerMessage);
        }

        // Persist to localStorage for session list UI
        if (!sessions[sessionId]) {
          sessions[sessionId] = {
            id: sessionId,
            title: `Ticket #${sessionId}`,
            customer: customer || { name: customerName || 'Customer', plan: 'Pro Tier' },
            turns: [],
            last_sentiment: 'neutral',
            last_urgency: 'low',
            updated_at: 'Just now',
          };
        }
        sessions[sessionId].turns.push({
          customer_message: customerMessage,
          agent_message: agentMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result,
        });
        sessions[sessionId].last_sentiment = result.analysis?.sentiment || 'neutral';
        sessions[sessionId].last_urgency = result.analysis?.urgency || 'low';
        sessions[sessionId].updated_at = 'Just now';
        saveSessions(sessions);

        const stats = getStoredStats();
        const fb = result.feedback || {};
        stats.scores.push({ tone: fb.tone_score || 8, empathy: fb.empathy_score || 7, clarity: fb.clarity_score || 8 });
        saveStats(stats);

        return result; // includes burnout, momentum, clv_risk from Flask
      }
    } catch (networkErr) {
      console.warn('Flask /api/coach unreachable, falling back to local analysis:', networkErr);
    }

        const lowerAgent = (agentMessage || '').toLowerCase();
    let sentiment = 'neutral', urgency = 'medium', risk = 'low';
    const isNeg =
      lowerCust.includes('refund') || lowerCust.includes('twice') ||
      lowerCust.includes('deducted') || lowerCust.includes('money back') ||
      lowerCust.includes('cancel') || lowerCust.includes('immediately') ||
      lowerCust.includes('error') || lowerCust.includes('fail') ||
      lowerCust.includes('not placed') || lowerCust.includes('not received') ||
      lowerCust.includes('payment') || lowerCust.includes('issue') || lowerCust.includes('problem') ||
      lowerCust.includes('paisa') || lowerCust.includes('dikkat') || lowerCust.includes('nahi mila') ||
      (customerMessage && (customerMessage.includes('नहीं मिला') || customerMessage.includes('कहाँ है') || customerMessage.includes('कट गए') || customerMessage.includes('पैसे') || customerMessage.includes('कैंसिल')));
    const isPos =
      isThankYou(lowerCust, lang) ||
      lowerCust.includes('thank') || lowerCust.includes('great') ||
      lowerCust.includes('resolved') || lowerCust.includes('appreciate') ||
      lowerCust.includes('shukriya') || lowerCust.includes('nandri') || lowerCust.includes('dhanyavada');

    if (isNeg) { sentiment = 'negative'; urgency = 'high'; risk = (lowerCust.includes('cancel') || (customerMessage && customerMessage.includes('कैंसिल'))) ? 'high' : 'medium'; }
    else if (isPos) { sentiment = 'positive'; urgency = 'low'; risk = 'low'; }

    let issueType = 'general';
    if (lowerCust.includes('cancel') || lowerCust.includes('subscription') || (customerMessage && (customerMessage.includes('कैंसिल') || customerMessage.includes('रद्द')))) {
      issueType = 'cancel';
    } else if (lowerCust.includes('deducted') || lowerCust.includes('charged') || lowerCust.includes('payment') || lowerCust.includes('refund') || lowerCust.includes('twice') || (customerMessage && (customerMessage.includes('पैसे') || customerMessage.includes('कट गए') || customerMessage.includes('रिफंड')))) {
      issueType = 'payment';
    } else if (lowerCust.includes('discount') || lowerCust.includes('pricing') || lowerCust.includes('seats') || lowerCust.includes('plan') || (customerMessage && (customerMessage.includes('डिस्काउंट') || customerMessage.includes('छूट')))) {
      issueType = 'pricing';
    } else if (lowerCust.includes('order') || lowerCust.includes('delivery') || lowerCust.includes('tracking') || lowerCust.includes('not received') || (customerMessage && (customerMessage.includes('ऑर्डर') || customerMessage.includes('कहाँ') || customerMessage.includes('डिलीवरी')))) {
      issueType = 'delivery';
    } else if (
      lowerCust.includes('internet') || lowerCust.includes('network') || lowerCust.includes('wifi') ||
      lowerCust.includes('wi-fi') || lowerCust.includes('broadband') || lowerCust.includes('connection') ||
      lowerCust.includes('disconnect') || lowerCust.includes('router') || lowerCust.includes('modem') ||
      lowerCust.includes('slow net') || lowerCust.includes('net issue') ||
      (customerMessage && (customerMessage.includes('इंटरनेट') || customerMessage.includes('नेटवर्क') || customerMessage.includes('वाइफाई') || customerMessage.includes('वाईफाई') || customerMessage.includes('धीमा') || customerMessage.includes('चल नहीं रहा')))
    ) {
      issueType = 'network';
    } else if (
      lowerCust.includes('crash') || lowerCust.includes('bug') || lowerCust.includes('error') ||
      lowerCust.includes('glitch') || lowerCust.includes('freeze') || lowerCust.includes('not loading') ||
      (customerMessage && (customerMessage.includes('क्रैश') || customerMessage.includes('बग') || customerMessage.includes('एरर')))
    ) {
      issueType = 'technical';
    } else if (
      lowerCust.includes('login') || lowerCust.includes('password') || lowerCust.includes('locked') ||
      lowerCust.includes('access') || lowerCust.includes('otp') ||
      (customerMessage && (customerMessage.includes('लॉगिन') || customerMessage.includes('पासवर्ड') || customerMessage.includes('अकाउंट')))
    ) {
      issueType = 'account';
    } else if (
      lowerCust.includes('how to') || lowerCust.includes('setup') || lowerCust.includes('set up') ||
      (customerMessage && (customerMessage.includes('सेटअप') || customerMessage.includes('कैसे करें')))
    ) {
      issueType = 'setup';
    }

    let tone = 8, empathy = 7, clarity = 8;
    const empathyWords = ['apologize', 'sorry', 'understand', 'happy to assist', 'maafi', 'samajh', 'crucial', 'care', 'reassure'];
    const clarityWords = ['business days', 'verified', 'processed', 'steps', 'process', 'check', 'router', 'power', 'restart', 'diagnostic', 'light', 'unplug'];
    if (empathyWords.some((w) => lowerAgent.includes(w))) { empathy = Math.min(10, empathy + 2); tone = Math.min(10, tone + 1); }
    if (clarityWords.some((w) => lowerAgent.includes(w))) { clarity = Math.min(10, clarity + 2); }

    const coachingTip = isPos
      ? 'Customer expressed thanks — acknowledge warmly and invite future contact.'
      : empathy < 8 ? 'Add a stronger empathetic opening before the technical explanation.'
      : getCoachingTip(issueType, lang);

    // Calculate realistic behavioral burnout & stress signals
    const agentWords = agentMessage ? agentMessage.trim().split(/\s+/).filter(Boolean) : [];
    const agentWordCount = agentWords.length;
    
    // Penalize extreme brevity (< 7 words) in contentious contexts
    const brevityPenalty = agentWordCount < 7 ? 22 : agentWordCount < 14 ? 8 : 0;
    // Empathy and tone evaluation
    const empathyDeficit = Math.max(0, (8 - empathy) * 6);
    const toneDeficit = Math.max(0, (8 - tone) * 5);
    // Reward composure and thorough empathetic support
    const composureBonus = (empathy >= 8 && tone >= 8) ? 14 : (empathy >= 7 ? 7 : 0);

    // Session-specific turn pacing
    const sessionTurns = (sessions[sessionId]?.turns?.length) || 0;
    const turnFatigue = Math.min(10, sessionTurns * 1.5);

    let rawBurnout = 16 + brevityPenalty + empathyDeficit + toneDeficit + turnFatigue - composureBonus;
    if (sentiment === 'negative' && empathy < 7) {
      rawBurnout += 12;
    }

    const burnoutIndex = Math.min(100, Math.max(12, Math.round(rawBurnout)));
    const burnoutRisk = burnoutIndex > 65 ? 'high' : (burnoutIndex > 38 ? 'moderate' : 'low');

    const vocabDrop = Math.max(0, Math.min(30, Math.round(brevityPenalty * 0.7 + empathyDeficit * 0.4)));
    const empathyDrop = Math.max(0, Math.min(35, Math.round(empathyDeficit * 1.2)));
    const brevityPct = Math.round(Math.min(1.0, Math.max(0.18, agentWordCount < 8 ? 0.85 : agentWordCount < 15 ? 0.52 : 0.26)) * 100);

    const initialBurnout = {
      burnout_index: burnoutIndex,
      burnout_risk: burnoutRisk,
      supervisor_action: burnoutRisk === 'high'
        ? 'Schedule a brief micro-break; agent is managing high-stress conversations.'
        : burnoutRisk === 'moderate'
        ? 'Monitor pacing; recommend a quick hydration pause between tickets.'
        : 'Agent composure is high; communication quality and empathy are optimal.',
      signals: {
        lexical_richness_drop_pct: vocabDrop,
        empathy_density_drop_pct: empathyDrop,
        recent_brevity_score: +(brevityPct / 100).toFixed(2)
      }
    };
    const burnout = sanitizeBurnout(initialBurnout, empathy, tone, agentMessage);

    const isResolution = isPos || tone >= 8;
    const momentum = {
      outcome_prediction: isResolution ? 'resolution' : (risk === 'high' ? 'escalation' : 'stalemate'),
      confidence: Math.round(78 + Math.random() * 18),
      turns_until_outcome: isResolution ? 1 : 2,
      reasoning: isResolution
        ? 'Clear, empathetic resolution offered. Customer tone projected to stabilize.'
        : 'Customer issue remains active. Follow-through and confirmation required.',
      momentum_signals: {
        sentiment_slope: isResolution ? 0.35 : -0.25
      }
    };

    const custObj = customer || { plan: 'Pro Tier', value: '$1,200 / yr' };
    const rawVal = custObj.value || '$1,200 / yr';
    const numVal = parseInt(rawVal.replace(/[^0-9]/g, ''), 10) || 1200;
    const churnProb = risk === 'high' ? 0.65 : (risk === 'medium' ? 0.32 : 0.08);
    const clvRisk = {
      clv_risk: risk === 'high' ? 'high' : (risk === 'medium' ? 'medium' : 'low'),
      priority_flag: risk === 'high' && numVal >= 1000,
      annual_plan_value: rawVal,
      revenue_at_risk: `$${Math.round(numVal * churnProb).toLocaleString()}`,
      churn_probability: churnProb,
      issue_type: issueType,
      retention_tip: risk === 'high'
        ? 'Customer is at elevated risk of churn. Prioritize immediate resolution and billing satisfaction.'
        : 'Customer retention profile is strong. Maintain proactive service excellence.'
    };

    const result = {
      analysis: { sentiment, urgency, escalation_risk: risk, key_issue: extractShortIssue(customerMessage) },
      feedback: { tone_score: tone, empathy_score: empathy, clarity_score: clarity, coaching_tip: coachingTip, knowledge_suggestion: getKnowledgeTip(issueType, lang) },
      compliance: { violation: false, issue: '', suggestion: '' },
      detected_language: lang,
      latency_seconds: (0.28 + Math.random() * 0.12).toFixed(2),
      burnout,
      momentum,
      clv_risk: clvRisk,
    };

    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        id: sessionId,
        title: `Ticket #${sessionId}`,
        customer: customer || { name: customerName || 'Customer', plan: 'Pro Tier' },
        turns: [],
        last_sentiment: 'neutral',
        last_urgency: 'low',
        updated_at: 'Just now',
      };
    }
    sessions[sessionId].turns.push({ customer_message: customerMessage, agent_message: agentMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), result });
    sessions[sessionId].last_sentiment = sentiment;
    sessions[sessionId].last_urgency = urgency;
    sessions[sessionId].updated_at = 'Just now';
    saveSessions(sessions);
    const stats = getStoredStats();
    stats.scores.push({ tone, empathy, clarity });
    saveStats(stats);
    return result;
  },

  // Get Micro-Habit Coach card for an agent 
  async getAgentHabits(agentId = 1) {
    try {
      const res = await fetch(`${API_BASE}/api/agent/habits?agent_id=${agentId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // fallback to offline habits
    }
    return {
      agent_id: String(agentId),
      name: 'Active Agent',
      turns_analysed: 12,
      weakest_dimension: 'Empathy',
      dimension: 'Empathy',
      avg_scores: { tone: 9.0, empathy: 8.5, clarity: 9.2 },
      title: 'Empathetic Emotion Mirroring',
      exercise: "Before jumping to solutions, validate the customer's emotion in your very first sentence: 'I hear how important this is to you, and I am personally here to resolve this today.'",
      target_metric: '+1.2 Empathy Score over next 5 turns',
      duration: 'Active Daily Practice',
    };
  },

  // Get supervisor quality aggregate KPIs
  async getSupervisorStats() {
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/stats`);
      if (res.ok) {
        const data = await res.json();
        return {
          avg_tone: data.avg_tone ?? 8.8,
          avg_empathy: data.avg_empathy ?? 8.5,
          avg_clarity: data.avg_clarity ?? 9.0,
          total_turns: data.total_turns ?? 0,
        };
      }
    } catch (e) {
      // fallback to stored local stats
    }
    const stats = getStoredStats();
    const len = stats.scores.length;
    if (len === 0) return { avg_tone: 8.8, avg_empathy: 8.5, avg_clarity: 9.0, total_turns: 0 };
    const avgT = Math.round((stats.scores.reduce((a, b) => a + b.tone, 0)    / len) * 10) / 10;
    const avgE = Math.round((stats.scores.reduce((a, b) => a + b.empathy, 0) / len) * 10) / 10;
    const avgC = Math.round((stats.scores.reduce((a, b) => a + b.clarity, 0) / len) * 10) / 10;
    return { avg_tone: avgT, avg_empathy: avgE, avg_clarity: avgC, total_turns: len };
  },
};
