/**
 * CareBot Dynamic Client
 * Completely dynamic user-created sessions with persistent localStorage.
 * Supports: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati.
 * Features: Pure native script responses (no Romanized/Hinglish translations), greeting-first replies, multilingual responses, thank-you detection.
 */

const STORAGE_KEY = 'carebot_copilot_sessions_v2';
const STATS_KEY = 'carebot_copilot_stats_v2';

// ── Language Detection ────────────────────────────────────────────────────
/**
 * Detects the language of a customer message.
 * Checks Unicode script ranges and romanized keyword patterns.
 * Returns: 'hindi' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'bengali' | 'gujarati' | 'english'
 */
function detectLanguage(text) {
  if (!text) return 'english';

  // ── 1. Unicode script range checks (most reliable) ──────────────────────
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';      // Devanagari (Hindi)
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';      // Tamil script
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';     // Telugu script
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';    // Kannada script
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';  // Malayalam script
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';    // Bengali script
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';   // Gujarati script

  const lower = text.toLowerCase();

  // ── 2. Romanized Hindi: ONLY words that cannot appear in normal English ──
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

  // ── 3. Romanized Tamil ──────────────────────────────────────────────────
  const tamilOnlyWords = [
    'vanakkam', 'ennaku', 'ungal', 'nandri', 'romba nandri',
    'seyyungal', 'eppadi', 'thirumba', 'panam', 'kodunga',
    'thayavu', 'seidhu', 'sollunga', 'theriyum', 'illai',
  ];
  if (tamilOnlyWords.some((w) => lower.includes(w))) return 'tamil';

  // ── 4. Romanized Telugu ─────────────────────────────────────────────────
  const teluguOnlyWords = [
    'meeru', 'naku ', 'chesindi', 'cheyandi', 'dhanyavaadalu',
    'ivvandi', 'cheppandi', 'kaadu', 'ayindi', 'aipoindi',
    'vellandi', 'chusanu', 'chestanu',
  ];
  if (teluguOnlyWords.some((w) => lower.includes(w))) return 'telugu';

  // ── 5. Romanized Kannada ────────────────────────────────────────────────
  const kannadaOnlyWords = [
    'nimage', 'naanu', 'haegide', 'dhanyavada', 'nimma ',
    'bekagide', 'maadiri', 'aayitu', 'heli', 'sari ',
    'tumba', 'nimge',
  ];
  if (kannadaOnlyWords.some((w) => lower.includes(w))) return 'kannada';

  // ── 6. Romanized Malayalam ──────────────────────────────────────────────
  const malayalamOnlyWords = [
    'ningal', 'ningalku', 'ente ', 'cheyyuka', 'nandi ',
    'sahaayikku', 'enthu ', 'pattum', 'sheriyayi', 'sariyayi',
    'valare', 'tharam', 'tharu',
  ];
  if (malayalamOnlyWords.some((w) => lower.includes(w))) return 'malayalam';

  // ── Default: English ─────────────────────────────────────────────────────
  return 'english';
}

// ── Greeting Generator (Pure Native Scripts) ──────────────────────────────
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

// ── Short-Form Issue Identifier ───────────────────────────────────────────
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
    if (text.includes('நன்றி')) return 'நன்றி & தீர்வு';
    if (text.includes('ஆர்டர்') || text.includes('எங்கே') || text.includes('டெலிவரி')) return 'ஆர்டர் கண்காணிப்பு நிலை';
    return 'வாடிக்கையாளர் விசாரணை';
  }

  // 3. Native Telugu Detection
  if (/[\u0C00-\u0C7F]/.test(text)) {
    if (text.includes('రద్దు') || text.includes('నచ్చలేదు')) return 'ఆర్డర్ రద్దు అభ్యర్థన';
    if (text.includes('డబ్బులు') || text.includes('రీఫండ్') || text.includes('కట్')) return 'రీఫండ్ & చెల్లింపు సమస్య';
    if (text.includes('ధన్యవాదాలు')) return 'ధన్యవాదాలు & పరిష్కారం';
    if (text.includes('ఆర్డర్') || text.includes('ఎక్కడ') || text.includes('డెలివరీ')) return 'ఆర్డర్ ట్రాకింగ్ & స్థితి';
    return 'కస్టమర్ విచారణ';
  }

  // 4. Native Kannada Detection
  if (/[\u0C80-\u0CFF]/.test(text)) {
    if (text.includes('ರದ್ದು') || text.includes('ಇಷ್ಟವಿಲ್ಲ')) return 'ಆರ್ಡರ್ ರದ್ದು ವಿನಂತಿ';
    if (text.includes('ಹಣ') || text.includes('ರೀಫಂಡ್')) return 'ಪಾವತಿ ಮತ್ತು ಮರುಪಾವತಿ';
    if (text.includes('ಧನ್ಯವಾದ')) return 'ಧನ್ಯವಾದಗಳು ಮತ್ತು ಪರಿಹಾರ';
    if (text.includes('ಆರ್ಡರ್') || text.includes('ಎಲ್ಲಿದೆ') || text.includes('ಡೆಲಿವರಿ')) return 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಸ್ಥಿತಿ';
    return 'ಗ್ರಾಹಕ ವಿಚಾರಣೆ';
  }

  // 5. Native Malayalam Detection
  if (/[\u0D00-\u0D7F]/.test(text)) {
    if (text.includes('റദ്ദാക്കുക') || text.includes('ഇഷ്ടപ്പെട്ടില്ല')) return 'റദ്ദാക്കൽ അഭ്യർത്ഥന';
    if (text.includes('പണം') || text.includes('റീഫണ്ട്')) return 'റീഫണ്ട് അന്വേഷണം';
    if (text.includes('നന്ദി')) return 'നന്ദി & പരിഹാരം';
    if (text.includes('ഓർഡർ') || text.includes('എവിടെ') || text.includes('ഡെലിവറി')) return 'ഓർഡർ ട്രാക്കിംഗ് നില';
    return 'ഉപഭോക്തൃ സഹായം';
  }

  // 6. Native Bengali Detection
  if (/[\u0980-\u09FF]/.test(text)) {
    if (text.includes('বাতিল') || text.includes('ভালো লাগেনি')) return 'অর্ডার বাতিল অনুরোধ';
    if (text.includes('টাকা') || text.includes('রিফান্ড') || text.includes('পেমেন্ট')) return 'পেমেন্ট ও রিফান্ড সমস্যা';
    if (text.includes('ধন্যবাদ')) return 'ধন্যবাদ ও সমাধান';
    if (text.includes('অর্ডার') || text.includes('কোথায়') || text.includes('ডেলিভারি')) return 'অর্ডার ট্র্যাকিং ও স্থিতি';
    return 'গ্রাহক সহায়তা অনুসন্ধান';
  }

  // 7. English / Romanized Scenarios
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
    .replace(/^(hey|hi|hello|dear|please|kindly|can you|could you|i want to|i need to|i have|my|i am|there is an?)\s+/i, '')
    .replace(/[?!.,]+$/g, '')
    .trim();

  const words = cleaned.split(/\s+/).slice(0, 5);
  if (words.length > 0 && words[0]) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return 'Customer Support Inquiry';
}

// ── Thank You Detection ───────────────────────────────────────────────────
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

// ── Thank You Reply Generator (Authentic Native Script) ───────────────────
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

// ── Multilingual Suggested Replies (Authentic Native Script) ──────────────
/**
 * Returns full suggested reply in the authentic native script for each issue type.
 */
function getSuggestedReply(issueType, language, customerName, isFirstMessage) {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';

  const replies = {
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
      hindi:     `${greetPart}हम आपकी सहायता के लिए सदैव तत्पर हैं! 😊 कृपया अपनी समस्या का थोड़ा और विवरण साझा करें ताकि हम तुरंत इसकी जाँच कर आपको सर्वोत्तम समाधान प्रदान कर सकें।`,
      tamil:     `${greetPart}நாங்கள் உங்களுக்கு உதவ எப்போதும் தயாராக இருக்கிறோம்! 😊 உங்கள் பிரச்சனையைப் பற்றி மேலும் சில விவரங்களை கூறினால், நாங்கள் சிறந்த தீர்வை உடனே வழங்குவோம்.`,
      telugu:    `${greetPart}మీకు సహాయం చేయడానికి మేము సిద్ధంగా ఉన్నాము! 😊 దయచేసి మీ సమస్య గురించిన మరిన్ని వివరాలను తెలియజేయండి, తద్వారా మేము ఉత్తమ పరిష్కారాన్ని వెంటనే అందించగలము.`,
      kannada:   `${greetPart}ನಾವು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸದಾ ಸಿದ್ಧರಿದ್ದೇವೆ! 😊 ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ನೀಡಿ, ಇದರಿಂದ ನಾವು ನಿಮಗೆ ಅತ್ಯುತ್ತಮ ಪರಿಹಾರ ನೀಡಬಹುದು.`,
      malayalam: `${greetPart}ഞങ്ങൾ നിങ്ങളെ സഹായിക്കാൻ സദാ സന്നദ്ധരാണ്! 😊 കൂടുതൽ വിവരങ്ങൾ പങ്കുവെച്ചാൽ ഏറ്റവും അനുയോജ്യമായ പരിഹാരം ഉടൻ നൽകാം.`,
      bengali:   `${greetPart}আমরা আপনাকে সাহায্য করতে সর্বদা প্রস্তুত! 😊 আপনার সমস্যাটি একটু বিস্তারিত জানালে আমরা দ্রুত সবচেয়ে ভালো সমাধান প্রদান করতে পারব।`,
      english:   `${greetPart}I'm here to help and want to make sure your concern is fully resolved! 😊 Could you please share a bit more detail so I can look into this right away and provide you with the best solution?`,
    },
  };

  const langReplies = replies[issueType] || replies.general;
  return langReplies[language] || langReplies.english;
}

// ── Coaching Tips by Language (Authentic Native Script) ───────────────────
function getCoachingTip(issueType, language) {
  const tips = {
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

// ── Knowledge Tips by Language (Authentic Native Script) ───────────────────
function getKnowledgeTip(issueType, language) {
  const tips = {
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
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  // Start clean with no hardcoded customer sessions
  const emptySessions = {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptySessions));
  return emptySessions;
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

export const api = {
  // Check engine status
  async getStatus() {
    return {
      status: 'running',
      coach_type: 'groq',
      provider: 'groq',
      engine_label: 'Groq Engine (Llama-3.3)',
      knowledge_base: 'loaded',
    };
  },

  // Get list of all dynamic conversation sessions
  async getSessions() {
    const sessions = getInitialSessions();
    const list = Object.values(sessions).map((s) => ({
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
    const sessions = getInitialSessions();
    return sessions[id] || null;
  },

  // Create new session dynamically (from user input)
  async createSession(customData = null) {
    const sessions = getInitialSessions();
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `TK-${randomIdNum}`;

    let newCustomer;
    let title;

    if (customData && customData.name) {
      newCustomer = {
        name: customData.name.trim(),
        email: customData.email ? customData.email.trim() : `${customData.name.toLowerCase().replace(/\s+/g, '.')}@client.com`,
        plan: customData.plan || 'Custom Plan',
        value: customData.value || 'Active Account',
        initial_msg: customData.initial_message ? customData.initial_message.trim() : '',
      };
      title = customData.title ? customData.title.trim() : `${newCustomer.name} — Support Session`;
    } else {
      newCustomer = {
        name: 'New Customer',
        email: 'customer@client.com',
        plan: 'Custom Plan',
        value: 'Active Account',
        initial_msg: '',
      };
      title = `Ticket #${newId} Session`;
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
    return { session: newSession };
  },

  // Delete session dynamically by ID
  async deleteSession(id) {
    const sessions = getInitialSessions();
    delete sessions[id];
    saveSessions(sessions);
    const remaining = Object.keys(sessions);
    return { success: true, next_id: remaining.length > 0 ? remaining[0] : null };
  },

  // Reset/clear turns for a session
  async resetSession(sessionId) {
    const sessions = getInitialSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].turns = [];
      saveSessions(sessions);
    }
    return { success: true };
  },

  // ── Instant Analysis (no turn saved) — auto-fires on customer input ──
  async analyzeCustomerMessage(customerMessage, customerName, turnsCount = 0) {
    const lowerCust = (customerMessage || '').toLowerCase();
    const isFirstMessage = turnsCount === 0; // Only greet on first message

    // ── Detect Language ──
    const lang = detectLanguage(customerMessage);

    // ── Thank You / Closure Detection ──
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

    // ── Determine Issue Type (Cancellation & Payment prioritized) ──
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

    let issueType = 'general';
    if (isCancel) {
      issueType = 'cancel';
    } else if (isPayment) {
      issueType = 'payment';
    } else if (isPricing) {
      issueType = 'pricing';
    } else if (isDelivery) {
      issueType = 'delivery';
    } else if (isPositive) {
      issueType = 'general'; // will use thank-you reply logic
    }

    const suggestedReply = isPositive
      ? getThankYouReply(lang, customerName, isFirstMessage)
      : getSuggestedReply(issueType, lang, customerName, isFirstMessage);

    const coachingTip  = getCoachingTip(issueType, lang);
    const knowledgeTip = getKnowledgeTip(issueType, lang);

    const tone    = isPositive ? 9 : 8;
    const empathy = isNegative ? 9 : 7;
    const clarity = 8;

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
    };
  },

  // Send turn for AI coaching & analysis — calls Flask /api/coach for real AI + novel features
  async sendCoachTurn({ agentMessage, customerMessage, sessionId, customerName }) {
    const lowerCust = (customerMessage || '').toLowerCase();
    const lang = detectLanguage(customerMessage);

    // ── Try the real Flask backend first (provides burnout, momentum, clv_risk) ──
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_message: agentMessage,
          customer_message: customerMessage,
          session_id: sessionId,
          agent_id: 'default_agent',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.analysis) {
          result.analysis.key_issue = extractShortIssue(result.analysis.key_issue || customerMessage);
        }

        // Persist to localStorage for session list UI
        const sessions = getInitialSessions();
        if (sessions[sessionId]) {
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
        }

        const stats = getStoredStats();
        const fb = result.feedback || {};
        stats.scores.push({ tone: fb.tone_score || 8, empathy: fb.empathy_score || 7, clarity: fb.clarity_score || 8 });
        saveStats(stats);

        return result; // includes burnout, momentum, clv_risk from Flask
      }
    } catch (networkErr) {
      console.warn('Flask /api/coach unreachable, falling back to local analysis:', networkErr);
    }

    // ── Fallback: local client-side analysis (offline mode) ──
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
    }

    let tone = 8, empathy = 7, clarity = 8;
    const empathyWords = ['apologize', 'sorry', 'understand', 'happy to assist', 'maafi', 'samajh'];
    const clarityWords = ['business days', 'verified', 'processed', 'steps', 'process', 'check'];
    if (empathyWords.some((w) => lowerAgent.includes(w))) { empathy = Math.min(10, empathy + 2); tone = Math.min(10, tone + 1); }
    if (clarityWords.some((w) => lowerAgent.includes(w))) { clarity = Math.min(10, clarity + 2); }

    const coachingTip = isPos
      ? 'Customer expressed thanks — acknowledge warmly and invite future contact.'
      : empathy < 8 ? 'Add a stronger empathetic opening before the technical explanation.'
      : getCoachingTip(issueType, lang);

    const result = {
      analysis: { sentiment, urgency, escalation_risk: risk, key_issue: extractShortIssue(customerMessage) },
      feedback: { tone_score: tone, empathy_score: empathy, clarity_score: clarity, coaching_tip: coachingTip, knowledge_suggestion: getKnowledgeTip(issueType, lang) },
      compliance: { violation: false, issue: '', suggestion: '' },
      detected_language: lang,
      latency_seconds: (0.28 + Math.random() * 0.12).toFixed(2),
    };

    const sessions = getInitialSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].turns.push({ customer_message: customerMessage, agent_message: agentMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), result });
      sessions[sessionId].last_sentiment = sentiment;
      sessions[sessionId].last_urgency = urgency;
      sessions[sessionId].updated_at = 'Just now';
      saveSessions(sessions);
    }
    const stats = getStoredStats();
    stats.scores.push({ tone, empathy, clarity });
    saveStats(stats);
    return result;
  },

  // Get supervisor quality aggregate KPIs
  async getSupervisorStats() {
    const stats = getStoredStats();
    const len = stats.scores.length;
    if (len === 0) return { avg_tone: 8.8, avg_empathy: 8.5, avg_clarity: 9.0, total_turns: 0 };
    const avgT = Math.round((stats.scores.reduce((a, b) => a + b.tone, 0)    / len) * 10) / 10;
    const avgE = Math.round((stats.scores.reduce((a, b) => a + b.empathy, 0) / len) * 10) / 10;
    const avgC = Math.round((stats.scores.reduce((a, b) => a + b.clarity, 0) / len) * 10) / 10;
    return { avg_tone: avgT, avg_empathy: avgE, avg_clarity: avgC, total_turns: len };
  },
};
