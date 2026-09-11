# -*- coding: utf-8 -*-
import os

client_path = os.path.abspath('frontend/src/api/client.js')
with open(client_path, 'r', encoding='utf-8') as f:
    content = f.read()

m1 = 'function getGreeting(language, customerName, isFirstMessage) {'
m2 = 'function getCoachingTip(issueType, language) {'

idx1 = content.find(m1)
idx2 = content.find(m2)
assert idx1 != -1 and idx2 != -1, "Markers m1 or m2 not found"

new_section_1 = """function getGreeting(language, customerName, isFirstMessage) {
  if (!isFirstMessage) return ''; // Only greet on first message
  const firstName = customerName ? customerName.split(' ')[0] : '';
  const namePart  = firstName ? ` ${firstName}` : '';

  const greetings = {
    hindi:     `नमस्ते${namePart},`,
    tamil:     `வணக்கம்${namePart},`,
    telugu:    `నమస్కారం${namePart},`,
    kannada:   `ನಮಸ್ಕಾರ${namePart},`,
    malayalam: `നമസ്കാരം${namePart},`,
    bengali:   `নমস্কার${namePart},`,
    gujarati:  `નમસ્તે${namePart},`,
    english:   `Hello${namePart},`,
  };
  return greetings[language] || greetings.english;
}

/**
 * Detects if a customer message is a follow-up or check confirmation rather than a brand-new issue.
 */
export function isFollowUpMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  const followUpPatterns = [
    'checked', 'i checked', 'checked all', 'did that', 'already did', 'already tried',
    'still facing', 'still not working', 'still problem', 'still issue', 'not working yet',
    'same problem', 'tried that', 'tried it', 'yes i', 'yes, i', 'done that', 'i have done',
    'restarted', 'rebooted', 'no change', 'same error', 'still slow', 'still down',
    'did everything', 'done all', 'tried all', 'no luck', 'did not help', "didn't help",
    'persists', 'persisting',
    // Hindi romanized & native
    'ha kiya', 'haan kiya', 'check kiya', 'kar liya', 'sab kar liya', 'nahi chal raha',
    'phir bhi', 'fir bhi', 'ab bhi', 'wahi dikkat', 'wahi problem',
    'हाँ', 'हां', 'कर लिया', 'जाँच लिया', 'चेक किया', 'फिर भी', 'चल नहीं रहा',
    // Tamil/Telugu/Kannada
    'seri', 'aipoindi', 'chesanu', 'aayitu'
  ];
  return followUpPatterns.some(p => lower.includes(p));
}

/**
 * Helper to identify service category from arbitrary text (titles, previous turns, initial message).
 */
export function detectCategoryFromText(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  if (
    lower.includes('internet') || lower.includes('network') || lower.includes('wifi') ||
    lower.includes('wi-fi') || lower.includes('broadband') || lower.includes('router') ||
    lower.includes('modem') || lower.includes('fiber') || lower.includes('slow') ||
    lower.includes('latency') || lower.includes('ping') || lower.includes('disconnect') ||
    lower.includes('इंटरनेट') || lower.includes('नेटवर्क') || lower.includes('राउटर') ||
    lower.includes('இணையம்') || lower.includes('ఇంటర్నెట్') || lower.includes('ಇಂಟರ್ನೆಟ್')
  ) {
    return 'network';
  }
  if (
    lower.includes('invoice') || lower.includes('receipt') || lower.includes('statement') ||
    lower.includes('gst') || lower.includes('बिलिंग') || lower.includes('इनवॉइस')
  ) {
    return 'billing';
  }
  if (
    lower.includes('refund') || lower.includes('deducted') || lower.includes('payment') ||
    lower.includes('charged') || lower.includes('twice') || lower.includes('debited') ||
    lower.includes('पैसे') || lower.includes('कट गए') || lower.includes('रिफंड')
  ) {
    return 'payment';
  }
  if (
    lower.includes('bluetooth') || lower.includes('headphone') || lower.includes('earphone') ||
    lower.includes('earbud') || lower.includes('mic') || lower.includes('speaker') ||
    lower.includes('hardware') || lower.includes('स्पीकर') || lower.includes('हार्डवेयर')
  ) {
    return 'hardware';
  }
  if (
    lower.includes('delivery') || lower.includes('tracking') || lower.includes('courier') ||
    lower.includes('shipment') || lower.includes('not received') || lower.includes('parcel') ||
    lower.includes('ऑर्डर') || lower.includes('डिलीवरी') || lower.includes('पार्सल')
  ) {
    return 'delivery';
  }
  if (
    lower.includes('cancel') || lower.includes('unsubscribe') || lower.includes('stop subscription') ||
    lower.includes('कैंसिल') || lower.includes('रद्द')
  ) {
    return 'cancel';
  }
  if (
    lower.includes('defective') || lower.includes('damaged') || lower.includes('broken') ||
    lower.includes('faulty') || lower.includes('replacement') || lower.includes('खराब')
  ) {
    return 'defect';
  }
  if (
    lower.includes('login') || lower.includes('password') || lower.includes('locked') ||
    lower.includes('sso') || lower.includes('2fa') || lower.includes('otp') ||
    lower.includes('लॉगिन') || lower.includes('पासवर्ड')
  ) {
    return 'account';
  }
  if (
    lower.includes('how to') || lower.includes('setup') || lower.includes('set up') ||
    lower.includes('configure') || lower.includes('install') || lower.includes('सेटअप')
  ) {
    return 'setup';
  }
  if (
    lower.includes('crash') || lower.includes('glitch') || lower.includes('error') ||
    lower.includes('bug') || lower.includes('freeze') || lower.includes('500') ||
    lower.includes('404') || lower.includes('क्रैश') || lower.includes('एरर')
  ) {
    return 'technical';
  }
  if (
    lower.includes('discount') || lower.includes('pricing') || lower.includes('seats') ||
    lower.includes('quote') || lower.includes('upgrade plan') || lower.includes('छूट') ||
    lower.includes('कीमत')
  ) {
    return 'pricing';
  }
  return null;
}

/**
 * Extracts a concise, professional short-form issue label (3-5 words max)
 * in native script from customer message rather than repeating the raw customer sentence.
 */
export function extractShortIssue(text, conversationHistory = [], sessionContext = null) {
  if (!text) return 'General Inquiry';
  const lower = text.toLowerCase().trim();

  // Multi-turn context resolution: If this is a follow-up confirmation (e.g. "yes i checked all. still i am facing issue")
  if (isFollowUpMessage(text)) {
    const prevContext = [
      sessionContext?.title,
      sessionContext?.ticket_title,
      sessionContext?.customer?.initial_msg,
      Array.isArray(conversationHistory)
        ? conversationHistory.map(t => `${t.customer_message || t.customer || t.text || ''} ${t.agent_message || t.agent || ''}`).join(' ')
        : ''
    ].filter(Boolean).join(' ');

    const contextCat = detectCategoryFromText(prevContext);
    const isHindi = /[\\u0900-\\u097F]/.test(text) || /[\\u0900-\\u097F]/.test(prevContext);
    const isTamil = /[\\u0B80-\\u0BFF]/.test(text) || /[\\u0B80-\\u0BFF]/.test(prevContext);
    const isTelugu = /[\\u0C00-\\u0C7F]/.test(text) || /[\\u0C00-\\u0C7F]/.test(prevContext);
    const isKannada = /[\\u0C80-\\u0CFF]/.test(text) || /[\\u0C80-\\u0CFF]/.test(prevContext);
    const isMalayalam = /[\\u0D00-\\u0D7F]/.test(text) || /[\\u0D00-\\u0D7F]/.test(prevContext);
    const isBengali = /[\\u0980-\\u09FF]/.test(text) || /[\\u0980-\\u09FF]/.test(prevContext);

    if (contextCat === 'network') {
      if (isHindi) return 'इंटरनेट व नेटवर्क समस्या निवारण';
      if (isTamil) return 'இணைய இணைப்பு சிக்கல் தீர்வு';
      if (isTelugu) return 'ఇంటర్నెట్ సమస్య పరిష్కారం';
      if (isKannada) return 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಸಮಸ್ಯೆ ಪರಿಹಾರ';
      if (isMalayalam) return 'ഇന്റർനെറ്റ് കണക്റ്റിവിറ്റി പരിഹാരം';
      if (isBengali) return 'ইন্টারনেট সংযোগ সমস্যা সমাধান';
      return 'Internet & Network Troubleshooting';
    }
    if (contextCat === 'payment') {
      if (isHindi) return 'भुगतान व रिफंड अनुवर्ती';
      return 'Payment & Refund Verification';
    }
    if (contextCat === 'technical') {
      if (isHindi) return 'तकनीकी खराबी निवारण';
      return 'Technical Issue Resolution';
    }
    if (contextCat === 'billing') {
      if (isHindi) return 'बिलिंग व इनवॉइस विवरण';
      return 'Billing & Statement Assistance';
    }
    if (contextCat === 'delivery') {
      if (isHindi) return 'ऑर्डर ट्रैकिंग व वितरण';
      return 'Order Status & Delivery Tracking';
    }
    if (contextCat === 'hardware') {
      if (isHindi) return 'हार्डवेयर व डिवाइस जाँच';
      return 'Hardware Diagnostic & Audio Check';
    }
    if (contextCat === 'account') {
      if (isHindi) return 'खाता एक्सेस व सत्यापन';
      return 'Account Access & Verification';
    }
    if (contextCat === 'cancel') {
      if (isHindi) return 'रद्दीकरण व खाता समीक्षा';
      return 'Subscription Retention & Cancellation';
    }
    if (contextCat === 'defect') {
      if (isHindi) return 'उत्पाद रिप्लेसमेंट व वारंटी';
      return 'Product Replacement & Warranty';
    }
    if (contextCat === 'setup') {
      if (isHindi) return 'कॉन्फ़िगरेशन व सेटअप सहायता';
      return 'Configuration & Setup Support';
    }
    if (contextCat === 'pricing') {
      if (isHindi) return 'प्लान व वॉल्यूम लाइसेंसिंग';
      return 'Plan & Volume Licensing';
    }

    if (isHindi) return 'ग्राहक सहायता अनुवर्ती';
    return 'Customer Support Follow-Up';
  }

  // 1. Native Devanagari Hindi Detection
  if (/[\\u0900-\\u097F]/.test(text)) {
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
  if (/[\\u0B80-\\u0BFF]/.test(text)) {
    if (text.includes('ரத்து') || text.includes('பிடிக்கவில்லை')) return 'ஆர்டர் ரத்து கோரிக்கை';
    if (text.includes('பணம்') || text.includes('ரீபண்ட்')) return 'பணம் திரும்பப் பெறுதல்';
    if (text.includes('இணையம்') || text.includes('நெட்வொர்க்') || text.includes('வைஃபை') || text.includes('இணைப்பு')) return 'இணைய இணைப்பு சிக்கல்';
    if (text.includes('நன்றி')) return 'நன்றி & தீர்வு';
    if (text.includes('ஆர்டர்') || text.includes('எங்கே') || text.includes('டெலிவரி')) return 'ஆர்டர் கண்காணிப்பு நிலை';
    return 'வாடிக்கையாளர் விசாரணை';
  }

  // 3. Native Telugu Detection
  if (/[\\u0C00-\\u0C7F]/.test(text)) {
    if (text.includes('రద్దు') || text.includes('నచ్చలేదు')) return 'ఆర్డర్ రద్దు అభ్యర్థన';
    if (text.includes('డబ్బులు') || text.includes('రీఫండ్') || text.includes('కట్')) return 'రీఫండ్ & చెల్లింపు సమస్య';
    if (text.includes('ఇంటర్నెట్') || text.includes('నెట్‌వర్క్') || text.includes('వైఫై') || text.includes('కనెక్షన్')) return 'ఇంటర్నెట్ కనెక్టివిటీ సమస్య';
    if (text.includes('ధన్యవాదాలు')) return 'ధన్యవాదాలు & పరిష్కారం';
    if (text.includes('ఆర్డర్') || text.includes('ఎక్కడ') || text.includes('డెలివరీ')) return 'ఆర్డర్ ట్రాకింగ్ & స్థితి';
    return 'కస్టమర్ విచారణ';
  }

  // 4. Native Kannada Detection
  if (/[\\u0C80-\\u0CFF]/.test(text)) {
    if (text.includes('ರದ್ದು') || text.includes('ಇಷ್ಟವಿಲ್ಲ')) return 'ಆರ್ಡರ್ ರದ್ದು ವಿನಂತಿ';
    if (text.includes('ಹಣ') || text.includes('ರೀಫಂಡ್')) return 'ಪಾವತಿ ಮತ್ತು ಮರುಪಾವತಿ';
    if (text.includes('ಇಂಟರ್ನೆಟ್') || text.includes('ನೆಟ್‌ವರ್ಕ್') || text.includes('ವೈಫೈ') || text.includes('ಸಂಪರ್ಕ')) return 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಸಮಸ್ಯೆ';
    if (text.includes('ಧನ್ಯವಾದ')) return 'ಧನ್ಯವಾದಗಳು ಮತ್ತು ಪರಿಹಾರ';
    if (text.includes('ಆರ್ಡರ್') || text.includes('ಎಲ್ಲಿದೆ') || text.includes('ಡೆಲಿವರಿ')) return 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಸ್ಥಿತಿ';
    return 'ಗ್ರಾಹಕ ವಿಚಾರಣೆ';
  }

  // 5. Native Malayalam Detection
  if (/[\\u0D00-\\u0D7F]/.test(text)) {
    if (text.includes('റദ്ദാക്കുക') || text.includes('ഇഷ്ടപ്പെട്ടില്ല')) return 'റദ്ദാക്കൽ അഭ്യർത്ഥന';
    if (text.includes('പണം') || text.includes('റീഫണ്ട്')) return 'റീഫണ്ട് അന്വേഷണം';
    if (text.includes('ഇന്റർനെറ്റ്') || text.includes('നെറ്റ്‌വർക്ക്') || text.includes('വൈഫൈ') || text.includes('കണക്ഷൻ')) return 'ഇന്റർനെറ്റ് കണക്റ്റിവിറ്റി പ്രശ്നം';
    if (text.includes('നന്ദി')) return 'നന്ദി & പരിഹാരം';
    if (text.includes('ഓർഡർ') || text.includes('എവിടെ') || text.includes('ഡെലിവറി')) return 'ഓർഡർ ട്രാക്കിംഗ് നില';
    return 'ഉപഭോക്തൃ സഹായം';
  }

  // 6. Native Bengali Detection
  if (/[\\u0980-\\u09FF]/.test(text)) {
    if (text.includes('বাতিল') || text.includes('ভালো লাগেনি')) return 'অর্ডার বাতিল অনুরোধ';
    if (text.includes('টাকা') || text.includes('রিফান্ড') || text.includes('পেমেন্ট')) return 'পেমেন্ট ও রিফান্ড সমস্যা';
    if (text.includes('ইন্টারনেট') || text.includes('নেটওয়ার্ক') || text.includes('ওয়াইফাই') || text.includes('সংযোগ')) return 'ইন্টারনেট সংযোগ সমস্যা';
    if (text.includes('ধন্যবাদ')) return 'ধন্যবাদ ও সমাধান';
    if (text.includes('অর্ডার') || text.includes('কোথায়') || text.includes('ডেলিভারি')) return 'অর্ডার ট্র্যাকিং ও স্থিতি';
    return 'গ্রাহক সহায়তা অনুসন্ধান';
  }

  // 7. English / Romanized Scenarios
  // Device Hardware & Bluetooth / Audio (check BEFORE network to avoid disconnect collision)
  if (lower.includes('bluetooth') || lower.includes('pair') || lower.includes('headphone') || lower.includes('earphone') || lower.includes('earbud') || lower.includes('microphone') || lower.includes('mic ') || lower.includes('speaker') || lower.includes('battery') || lower.includes('charger') || lower.includes('hardware')) {
    return 'Device Hardware & Bluetooth Audio Issue';
  }

  // Invoices & Billing Statements
  if (lower.includes('invoice') || lower.includes('receipt') || lower.includes('gst') || lower.includes('tax invoice') || lower.includes('billing statement') || lower.includes('statement') || lower.includes('breakdown')) {
    return 'Billing Statement & Invoice Inquiry';
  }

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
    lower.includes('glitch') || lower.includes('freeze') || lower.includes('frozen') || lower.includes('blank screen') || lower.includes('black screen') || lower.includes('hanging') ||
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

  // Fallback: Dynamic short title extraction (stripping conversational noise & stop words)
  const stopWords = new Set([
    'yes', 'no', 'yeah', 'yep', 'checked', 'did', 'tried', 'done', 'all', 'still',
    'am', 'facing', 'issue', 'issues', 'problem', 'problems', 'ok', 'okay', 'same',
    'not', 'working', 'pls', 'please', 'help', 'having', 'get', 'getting', 'is', 'it',
    'this', 'that', 'with', 'for', 'the', 'and', 'but', 'so', 'just', 'too', 'also',
    'ha', 'haan', 'kiya', 'kar', 'sab', 'phir', 'bhi', 'ab', 'wahi', 'dikkat'
  ]);
  const cleaned = lower
    .replace(/^(hey|hi|hello|dear|please|kindly|can you|could you|i want to|i need to|i have(?: a)?|my|i am(?: having(?: a)?)?|having(?: a)?|there is(?: an?)?)\\s+/i, '')
    .replace(/[?!.,;:]+/g, ' ')
    .trim();

  const words = cleaned.split(/\\s+/).filter(w => w.length > 1 && !stopWords.has(w)).slice(0, 5);
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
    hindi:     `${greetPart}आपका स्वागत है। हमें प्रसन्नता है कि आपकी समस्या का समाधान हो गया है। यदि आपको भविष्य में किसी भी अन्य सहायता की आवश्यकता हो, तो कृपया निसंकोच संपर्क करें।`,
    tamil:     `${greetPart}நல்வரவு. உங்கள் பிரச்சனை வெற்றிகரமாக தீர்க்கப்பட்டதில் மகிழ்ச்சி. மேலும் ஏதேனும் உதவி தேவைப்பட்டால் தயங்காமல் தொடர்பு கொள்ளவும்.`,
    telugu:    `${greetPart}స్వాగతం. మీ సమస్య పరిష్కారమైనందుకు సంతోషంగా ఉంది. భవిష్యత్తులో ఏదైనా సహాయం కావాలంటే ఎప్పుడైనా మమ్మల్ని సంప్రదించవచ్చు.`,
    kannada:   `${greetPart}ನಿಮಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಸಮಸ್ಯೆ ಪರಿಹಾರವಾಗಿದ್ದಕ್ಕೆ ಸಂತೋಷವಾಗಿದೆ. ಮುಂದೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕಿದ್ದರೂ ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ.`,
    malayalam: `${greetPart}സ്വാഗതം. താങ്കളുടെ പ്രശ്നം പരിഹരിക്കപ്പെട്ടതിൽ സന്തോഷം. ഭാവിയിൽ എന്തെങ്കിലും സഹായം ആവശ്യമെങ്കിൽ ദയവായി ഞങ്ങളെ ബന്ധപ്പെടുക.`,
    bengali:   `${greetPart}আপনাকে স্বাগতম। আপনার সমস্যার সমাধান হওয়ায় আমরা আনন্দিত। পরবর্তীতে কোনো সহযোগিতার প্রয়োজন হলে নির্দ্বিধায় যোগাযোগ করবেন।`,
    english:   `${greetPart}You are very welcome. I am glad we could resolve this for you today. Please feel free to reach out anytime if you require further assistance.`,
  };
  return replies[language] || replies.english;
}

/**
 * Detects customer intent domain and severity across all operational categories and Indian languages.
 */
export function detectCustomerIntent(text, language, conversationHistory = [], sessionContext = null) {
  const lower = (text || '').toLowerCase().trim();
  const raw = text || '';

  if (isThankYou(lower, language)) {
    return {
      category: 'gratitude',
      intentLabel: 'Gratitude & Closure',
      sentiment: 'positive',
      urgency: 'low',
      risk: 'low',
      isFollowUp: false,
    };
  }

  const isFollowUp = isFollowUpMessage(text);
  const contextText = [
    sessionContext?.title,
    sessionContext?.ticket_title,
    sessionContext?.customer?.initial_msg,
    Array.isArray(conversationHistory)
      ? conversationHistory.map(t => `${t.customer_message || t.customer || t.text || ''} ${t.agent_message || t.agent || ''}`).join(' ')
      : ''
  ].filter(Boolean).join(' ');
  const inheritedCategory = detectCategoryFromText(contextText);

  // If customer is confirming checks / follow-up, inherit the active domain context
  if (isFollowUp && inheritedCategory) {
    const labelMap = {
      network: 'Network & Internet',
      technical: 'Technical / Bug',
      account: 'Account & Security',
      setup: 'Product Support / Setup',
      hardware: 'Device & Hardware',
      billing: 'Billing & Invoicing',
      defect: 'Product Defect & Return',
      delivery: 'Order & Delivery',
      payment: 'Payment & Refund',
      pricing: 'Pricing & Plans',
      cancel: 'Cancellation & Retention',
      general: 'Customer Inquiry',
    };
    return {
      category: inheritedCategory,
      intentLabel: `${labelMap[inheritedCategory] || 'Customer Inquiry'} (Follow-Up)`,
      sentiment: 'negative',
      urgency: 'high',
      risk: (inheritedCategory === 'cancel' || inheritedCategory === 'payment') ? 'high' : 'medium',
      isFollowUp: true,
    };
  }

  // Cancellation & Retention
  const isCancel =
    lower.includes('cancel') || lower.includes('cancellation') || lower.includes('unsubscribe') ||
    lower.includes('stop my subscription') || lower.includes('stop subscription') || lower.includes('terminate') ||
    lower.includes('close my account') || lower.includes('dissatisfied') ||
    (lower.includes('service') && (lower.includes('not like') || lower.includes("didn't like") || lower.includes('poor') || lower.includes('bad') || lower.includes('terrible'))) ||
    ['कैंसिल', 'रद्द', 'पसंद नहीं', 'बंद करो', 'कैंसल', 'सब्सक्रिप्शन बंद'].some((w) => raw.includes(w)) ||
    ['ரத்து', 'பிடிக்கவில்லை'].some((w) => raw.includes(w)) ||
    ['రద్దు', 'నచ్చలేదు'].some((w) => raw.includes(w)) ||
    ['ರದ್ದು', 'ಇಷ್ಟವಿಲ್ಲ'].some((w) => raw.includes(w)) ||
    ['റദ്ദാക്കുക', 'ഇഷ്ടപ്പെട്ടില്ല'].some((w) => raw.includes(w)) ||
    ['বাতিল', 'ভালো লাগেনি'].some((w) => raw.includes(w));

  // Payment Deducted / Refund / Duplicate Billing
  const isPayment =
    lower.includes('deducted') || lower.includes('charged') || lower.includes('twice') ||
    lower.includes('debited') || lower.includes('double charge') || lower.includes('paid twice') ||
    lower.includes('payment') || lower.includes('money back') || lower.includes('refund') ||
    lower.includes('paisa') || lower.includes('paise') || lower.includes('kat gaya') ||
    ['पैसे', 'कट गए', 'कट गया', 'कटा', 'रिफंड', 'भुगतान', 'दो बार', 'डबल', 'पैसे वापस'].some((w) => raw.includes(w)) ||
    ['பணம்', 'ரீபண்ட்', 'பிடிக்கப்பட்டது'].some((w) => raw.includes(w)) ||
    ['డబ్బులు', 'రీఫండ్', 'కట్'].some((w) => raw.includes(w)) ||
    ['ಹಣ', 'ರೀಫಂಡ್'].some((w) => raw.includes(w)) ||
    ['പണം', 'റീഫണ്ട്'].some((w) => raw.includes(w)) ||
    ['টাকা', 'রিফান্ড', 'পেমেন্ট'].some((w) => raw.includes(w));

  // Device Hardware & Bluetooth / Audio (check BEFORE network to avoid disconnect false-positive)
  const isHardware =
    lower.includes('bluetooth') || lower.includes('pair') || lower.includes('pairing') ||
    lower.includes('headphone') || lower.includes('earphone') || lower.includes('earbud') ||
    lower.includes('microphone') || lower.includes('mic ') || lower.includes('speaker') ||
    lower.includes('battery') || lower.includes('charger') || lower.includes('hardware') ||
    ['ब्लूटूथ', 'माइक', 'स्पीकर', 'बैटरी', 'आवाज'].some((w) => raw.includes(w));

  // Internet & Network Connectivity
  const isNetwork =
    lower.includes('internet') || lower.includes('network') || lower.includes('wifi') ||
    lower.includes('wi-fi') || lower.includes('broadband') || lower.includes('connection') ||
    lower.includes('disconnect') || lower.includes('offline') || lower.includes('router') ||
    lower.includes('modem') || lower.includes('fiber') || lower.includes('slow net') ||
    lower.includes('latency') || lower.includes('ping') || lower.includes('ethernet') ||
    lower.includes('net issue') || lower.includes('packet loss') || lower.includes('dns') ||
    (lower.includes('not working') && (lower.includes('net') || lower.includes('web') || lower.includes('line') || lower.includes('connection') || lower.includes('internet'))) ||
    ['इंटरनेट', 'नेटवर्क', 'वाइफाई', 'वाईफाई', 'नेट', 'कनेक्शन', 'राउटर', 'धीमा', 'चल नहीं रहा', 'सिग्नल', 'नेट बंद'].some((w) => raw.includes(w)) ||
    ['இணையம்', 'நெட்வொர்க்', 'வைஃபை', 'இணைப்பு'].some((w) => raw.includes(w)) ||
    ['ఇంటర్నెట్', 'నెట్‌వర్క్', 'వైఫై', 'కనెక్షన్'].some((w) => raw.includes(w)) ||
    ['ಇಂಟರ್ನೆಟ್', 'ನೆಟ್‌ವರ್ಕ್', 'ವೈಫೈ', 'ಸಂಪರ್ಕ'].some((w) => raw.includes(w)) ||
    ['ഇന്റർനെറ്റ്', 'നെറ്റ്‌വർക്ക്', 'വൈഫൈ', 'കണക്ഷൻ'].some((w) => raw.includes(w)) ||
    ['ইন্টারনেট', 'নেটওয়ার্ক', 'ওয়াইফাই', 'সংযোগ'].some((w) => raw.includes(w));

  // Invoices & Billing Statements
  const isBilling =
    lower.includes('invoice') || lower.includes('receipt') || lower.includes('gst') ||
    lower.includes('tax invoice') || lower.includes('billing statement') || lower.includes('statement') ||
    lower.includes('breakdown') || lower.includes('autopay') || lower.includes('payment method') ||
    ['इनवॉइस', 'रसीद', 'जीएसटी', 'बिल', 'स्टेटमेंट'].some((w) => raw.includes(w));

  // Delivery & Order Tracking
  const isDelivery =
    lower.includes('not placed') || lower.includes('order') || lower.includes('not received') ||
    lower.includes('package') || lower.includes('delivery') || lower.includes('tracking') ||
    lower.includes('track') || lower.includes('milna') || lower.includes('nahi mila') ||
    lower.includes('courier') || lower.includes('shipment') || lower.includes('where is my order') ||
    ['ऑर्डर', 'कहाँ', 'कहा', 'कहा हे', 'डिलीवरी', 'पार्सल', 'ट्रैकिंग', 'कब आएगा', 'नहीं मिला', 'पहुंचा'].some((w) => raw.includes(w)) ||
    ['ஆர்டர்', 'எங்கே', 'டெலிவரி'].some((w) => raw.includes(w)) ||
    ['ఆర్డర్', 'ఎక్కడ', 'డెలివరీ'].some((w) => raw.includes(w)) ||
    ['ಆರ್ಡರ್', 'ಎಲ್ಲಿದೆ', 'ಡೆಲಿವರಿ'].some((w) => raw.includes(w)) ||
    ['ഓർഡർ', 'എവിടെ', 'ഡെലിവറി'].some((w) => raw.includes(w)) ||
    ['অর্ডার', 'কোথায়', 'ডেলিভারি'].some((w) => raw.includes(w));

  // Technical Glitches / Errors / Crashes
  const isTechnical =
    lower.includes('crash') || lower.includes('bug') || lower.includes('glitch') ||
    lower.includes('freeze') || lower.includes('frozen') || lower.includes('blank screen') ||
    lower.includes('white screen') || lower.includes('black screen') || lower.includes('hanging') ||
    lower.includes('stuck') || lower.includes('failed to load') || lower.includes('not loading') ||
    lower.includes('timeout') || lower.includes('server down') || lower.includes('500') || lower.includes('404') ||
    ['क्रैश', 'बग', 'एरर', 'लोड नहीं हो रहा', 'अटक गया', 'खराबी'].some((w) => raw.includes(w));

  // Account / SSO / Password / Login
  const isAccount =
    lower.includes('login') || lower.includes('password') || lower.includes('log in') ||
    lower.includes('sign in') || lower.includes('signin') || lower.includes('locked out') ||
    lower.includes('reset password') || lower.includes('forgot password') || lower.includes('otp') ||
    lower.includes('2fa') || lower.includes('mfa') || lower.includes('access denied') || lower.includes('sso') ||
    ['लॉगिन', 'पासवर्ड', 'अकाउंट', 'खुल नहीं रहा', 'ओटीपी'].some((w) => raw.includes(w));

  // Product Defect / Damaged / Return
  const isDefect =
    lower.includes('defective') || lower.includes('damaged') || lower.includes('broken') ||
    lower.includes('faulty') || lower.includes('tampered') || lower.includes('replace') ||
    lower.includes('replacement') || lower.includes('return') ||
    ['टूटा', 'खराब सामान', 'वापस', 'बदलना', 'डैमेज'].some((w) => raw.includes(w));

  // Pricing & Volume Licensing
  const isPricing =
    lower.includes('discount') || lower.includes('pricing') || lower.includes('seats') ||
    lower.includes('upgrade') || lower.includes('plan') || lower.includes('cost') ||
    lower.includes('quote') || lower.includes('quota') || lower.includes('enterprise') ||
    ['डिस्काउंट', 'छूट', 'कीमत', 'दाम', 'प्लान', 'सीट', 'अपग्रेड'].some((w) => raw.includes(w)) ||
    ['விலை', 'தள்ளுபடி'].some((w) => raw.includes(w)) ||
    ['ధర', 'తగ్గింపు'].some((w) => raw.includes(w)) ||
    ['ಬೆಲೆ', 'ರಿಯಾಯಿತಿ'].some((w) => raw.includes(w)) ||
    ['വില', 'കിഴിവ്'].some((w) => raw.includes(w)) ||
    ['দাম', 'ছাড়'].some((w) => raw.includes(w));

  // Setup / How-To / Configuration
  const isSetup =
    lower.includes('how to') || lower.includes('how do i') || lower.includes('how can i') ||
    lower.includes('setup') || lower.includes('set up') || lower.includes('configure') ||
    lower.includes('install') || lower.includes('guide') || lower.includes('tutorial') ||
    lower.includes('integration') || lower.includes('webhook') ||
    ['कैसे करें', 'सेटअप', 'इंस्टॉल', 'शुरू करें'].some((w) => raw.includes(w));

  if (isCancel) {
    return { category: 'cancel', intentLabel: 'Cancellation & Retention', sentiment: 'negative', urgency: 'high', risk: 'high', isFollowUp };
  }
  if (isPayment) {
    return { category: 'payment', intentLabel: 'Payment & Refund', sentiment: 'negative', urgency: 'high', risk: 'high', isFollowUp };
  }
  if (isHardware) {
    return { category: 'hardware', intentLabel: 'Device & Hardware', sentiment: 'negative', urgency: 'medium', risk: 'low', isFollowUp };
  }
  if (isNetwork) {
    return { category: 'network', intentLabel: 'Network & Internet', sentiment: 'negative', urgency: 'high', risk: 'medium', isFollowUp };
  }
  if (isBilling) {
    return { category: 'billing', intentLabel: 'Billing & Invoicing', sentiment: 'neutral', urgency: 'medium', risk: 'low', isFollowUp };
  }
  if (isDelivery) {
    return { category: 'delivery', intentLabel: 'Order & Delivery', sentiment: 'negative', urgency: 'high', risk: 'medium', isFollowUp };
  }
  if (isTechnical) {
    return { category: 'technical', intentLabel: 'Technical / Bug', sentiment: 'negative', urgency: 'high', risk: 'medium', isFollowUp };
  }
  if (isAccount) {
    return { category: 'account', intentLabel: 'Account & Security', sentiment: 'negative', urgency: 'high', risk: 'medium', isFollowUp };
  }
  if (isDefect) {
    return { category: 'defect', intentLabel: 'Product Defect & Return', sentiment: 'negative', urgency: 'high', risk: 'medium', isFollowUp };
  }
  if (isPricing) {
    return { category: 'pricing', intentLabel: 'Pricing & Plans', sentiment: 'neutral', urgency: 'medium', risk: 'low', isFollowUp };
  }
  if (isSetup) {
    return { category: 'setup', intentLabel: 'Product Support / Setup', sentiment: 'neutral', urgency: 'medium', risk: 'low', isFollowUp };
  }

  if (inheritedCategory) {
    return {
      category: inheritedCategory,
      intentLabel: `${inheritedCategory.charAt(0).toUpperCase() + inheritedCategory.slice(1)} Inquiry`,
      sentiment: isFollowUp ? 'negative' : 'neutral',
      urgency: isFollowUp ? 'high' : 'medium',
      risk: 'low',
      isFollowUp,
    };
  }

  return {
    category: 'general',
    intentLabel: isFollowUp ? 'Customer Follow-Up' : 'Customer Inquiry',
    sentiment: isFollowUp ? 'negative' : 'neutral',
    urgency: isFollowUp ? 'high' : 'medium',
    risk: 'low',
    isFollowUp,
  };
}

function getSuggestedReply(issueType, language, customerName, isFirstMessage, customerMessage = '', isFollowUp = false) {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';

  const replies = {
    network: {
      initial: {
        hindi:     `${greetPart}इंटरनेट व नेटवर्क कनेक्टिविटी समस्या के कारण आपको हुई असुविधा के लिए हमें खेद है। हम इसे तुरंत ठीक करने में आपकी सहायता करेंगे। क्या आप देख सकते हैं कि आपके राउटर पर 'Internet/PON' लाइट हरी जल रही है या लाल ब्लिंक कर रही है? कृपया राउटर को 30 सेकंड के लिए अनप्लग करके पुनः चालू करें। साथ ही, मैं यहाँ से आपकी लाइन की डायग्नोस्टिक जाँच शुरू कर रहा हूँ।`,
        tamil:     `${greetPart}இணைய இணைப்பு பிரச்சனையால் உங்களுக்கு ஏற்பட்ட சிரமத்திற்கு வருந்துகிறோம். உங்கள் ரூட்டரில் Internet/PON விளக்கு பச்சையாக எரிகிறதா அல்லது சிவப்பாக ஒளிர்கிறதா என சரிபார்க்க முடியுமா? ரூட்டரை 30 வினாடிகள் ஆஃப் செய்துவிட்டு மீண்டும் ஆன் செய்யவும். நான் இங்கிருந்து நேரடி நெட்வொர்க் சோதனையை தொடங்குகிறேன்.`,
        telugu:    `${greetPart}ఇంటర్నెట్ కనెక్టివిటీ సమస్య వల్ల మీకు కలిగిన అసౌకర్యానికి మేము చింతిస్తున్నాము. మీ రౌటర్‌లోని Internet/PON లైట్ ఆకుపచ్చగా స్థిరంగా ఉందా లేదా ఎరుపు రంగులో బ్లింక్ అవుతుందో చూడగలరా? రౌటర్‌ను 30 సెకన్ల పాటు రీస్టార్ట్ చేయండి. నేను సిస్టమ్ ద్వారా మీ కనెక్షన్ డయాగ్నస్టిక్స్ పరిశీలిస్తున్నాను.`,
        kannada:   `${greetPart}ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ತೊಂದರೆಗೆ ವಿಷಾದಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ರೂಟರ್‌ನಲ್ಲಿ Internet/PON ದೀಪವು ಹಸಿರಾಗಿದೆಯೇ ಅಥವಾ ಕೆಂಪಾಗಿ ಮಿಟುಕಿಸುತ್ತಿದೆಯೇ ಎಂದು ತಿಳಿಸಿ. ರೂಟರ್ ಅನ್ನು 30 ಸೆಕೆಂಡುಗಳ ಕಾಲ ರೀಸ್ಟಾರ್ಟ್ ಮಾಡಿ ಪರಿಶೀಲಿಸಿ. ನಾನು ಸಿಸ್ಟಮ್ ಮೂಲಕ ಲೈನ್ ಚೆಕ್ ಮಾಡುತ್ತಿದ್ದೇನೆ.`,
        malayalam: `${greetPart}ഇന്റർനെറ്റ് കണക്ഷൻ തകരാറിൽ ഞങ്ങൾ ഖേദിക്കുന്നു. റൂട്ടറിലെ Internet/PON ലൈറ്റ് പച്ചയാണോ അതോ ചുവപ്പായി മിന്നുന്നുണ്ടോ എന്ന് പരിശോധിക്കാമോ? റൂട്ടർ 30 സെക്കൻഡ് ഓഫ് ചെയ്ത് വീണ്ടും ഓൺ ചെയ്യുക. ഞാൻ ഇവിടെനിന്ന് ലൈൻ ഡയഗ്നോസ്റ്റിക്സ് നടത്തുന്നുണ്ട്.`,
        bengali:   `${greetPart}ইন্টারনেট ও নেটওয়ার্ক সমস্যার জন্য আমরা দুঃখিত। আপনার রাউটারে Internet/PON লাইট সবুজ জ্বলছে নাকি লাল ব্লিঙ্ক করছে তা অনুগ্রহ করে জানাবেন? রাউটারটি ৩০ সেকেন্ডের জন্য রিস্টার্ট করে দেখুন, আমি দূর থেকে আপনার সংযোগ পরীক্ষা করছি।`,
        english:   `${greetPart}I apologize for the trouble with your internet connection. Reliable connectivity is critical, and I will assist you in resolving this promptly. Could you please check if the Internet/PON LED on your router is solid green or blinking red/amber? In addition, please restart the router by unplugging the power adapter for 30 seconds while I run a line diagnostic from our end.`,
      },
      followUp: {
        hindi:     `राउटर जाँच पूरी करने की पुष्टि के लिए धन्यवाद। चूँकि कनेक्टिविटी समस्या अभी भी बनी हुई है, मैंने इसे हमारी नेटवर्क इंजीनियरिंग टीम को एस्केलेट कर दिया है। मैं आपकी लाइन पर सिग्नल व पैकेट-लॉस डायग्नोस्टिक चला रहा हूँ, और आवश्यकता पड़ने पर हम तकनीशियन विज़िट भी निर्धारित कर सकते हैं। क्या आप चाहते हैं कि मैं अभी यहाँ से त्वरित पोर्ट रीसेट शुरू करूँ?`,
        tamil:     `ரூட்டர் சோதனைகளை முடித்ததை உறுதிப்படுத்தியதற்கு நன்றி. இணைய பிரச்சனை தொடர்வதால், இதை மூத்த நெட்வொர்க் பொறியியல் குழுவிற்கு அனுப்பியுள்ளேன். நான் இப்போது உங்கள் லைனில் முழுமையான சிக்னல் சோதனையை மேற்கொள்கிறேன், தேவைப்பட்டால் தொழில்நுட்ப வல்லுநரின் நேரடி வருகையை ஏற்பாடு செய்கிறேன்.`,
        telugu:    `రౌటర్ తనిఖీలను పూర్తి చేసినట్లు ధృవీకరించినందుకు ధన్యవాదాలు. కనెక్టివిటీ సమస్య ఇంకా కొనసాగుతున్నందున, నేను దీనిని మా నెట్‌వర్క్ ఇంజనీరింగ్ బృందానికి ఎస్కలేట్ చేసాను. నేను లైన్ సిగ్నల్ పరీక్షను నిర్వహిస్తున్నాను మరియు అవసరమైతే టెక్నీషియన్ సందర్శనను ఏర్పాటు చేస్తాను.`,
        kannada:   `ರೂಟರ್ ತಪಾಸಣೆಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಸಂಪರ್ಕ ಸಮಸ್ಯೆ ಮುಂದುವರಿದಿರುವುದರಿಂದ, ನಾನು ಇದನ್ನು ನೆಟ್‌ವರ್ಕ್ ಎಂಜಿನಿಯರಿಂಗ್ ತಂಡಕ್ಕೆ ವರ್ಗಾಯಿಸಿದ್ದೇನೆ. ಅಗತ್ಯವಿದ್ದಲ್ಲಿ ಆನ್-ಸೈಟ್ ತಂತ್ರಜ್ಞರ ಭೇಟಿಯನ್ನು ವ್ಯವಸ್ಥೆ ಮಾಡುತ್ತೇನೆ.`,
        malayalam: `റൂട്ടർ പരിശോധനകൾ പൂർത്തിയാക്കിയതായി അറിയിച്ചതിന് നന്ദി. കണക്റ്റിവിറ്റി തകരാർ തുടരുന്നതിനാൽ, ഞാൻ ഇത് സീനിയർ നെറ്റ്‌വർക്ക് എഞ്ചിനീയറിംഗ് ടീമിന് കൈമാറി. ആവശ്യമെങ്കിൽ ഓൺ-സൈറ്റ് ടെക്നീഷ്യൻ സന്ദർശനം ക്രമീകരിക്കാം.`,
        bengali:   `রাউটার পরীক্ষা সম্পন্ন করার বিষয়টি নিশ্চিত করার জন্য ধন্যবাদ। যেহেতু ইন্টারনেট সমস্যা এখনও কাটেনি, আমি বিষয়টি আমাদের সিনিয়র নেটওয়ার্ক ইঞ্জিনিয়ারিং টিমের কাছে পাঠিয়েছি এবং প্রয়োজনে একজন টেকনিশিয়ান ভিজিটের ব্যবস্থা করছি।`,
        english:   `Thank you for confirming that you have completed those checks. Since the connection issue persists, I have escalated this for deeper investigation. Our diagnostic indicates an active signal impairment on the line. I can initiate a port reset and optical circuit reprovisioning immediately, or schedule an on-site technician visit if physical maintenance is required. Please let me know if you would like me to trigger the reset right now.`,
      },
    },
    technical: {
      initial: {
        hindi:     `${greetPart}तकनीकी समस्या के कारण आपको हुई असुविधा के लिए खेद है। क्या आप कृपया बता सकते हैं कि स्क्रीन पर कोई विशेष एरर कोड या मैसेज दिखाई दे रहा है? आप किस ब्राउज़र या डिवाइस का उपयोग कर रहे हैं? हार्ड रिफ्रेश (Ctrl+F5) या ब्राउज़र कैशे क्लियर करने से यह अक्सर तुरंत ठीक हो जाता है।`,
        tamil:     `${greetPart}தொழில்நுட்ப கோளாறுக்கு வருந்துகிறோம். திரையில் ஏதேனும் குறிப்பிட்ட பிழை குறியீடு (Error Code) காட்டப்படுகிறதா? நீங்கள் எந்த உலாவி (Browser) பயன்படுத்துகிறீர்கள்? கேச் (Cache) அழித்து மீண்டும் முயற்சித்தால் இது சரியாகிவிடும்.`,
        telugu:    `${greetPart}సాంకేతిక సమస్యకు మేము చింతిస్తున్నాము. స్క్రీన్‌పై ఏదైనా నిర్దిష్ట ఎర్రర్ కోడ్ లేదా మెసేజ్ కనిపిస్తోందా? మీరు ఏ బ్రౌజర్ లేదా పరికరాన్ని ఉపయోగిస్తున్నారు? పేజీని రిఫ్రెష్ చేయడం లేదా క్యాచీని క్లియర్ చేయడం ద్వారా ఇది త్వరగా పరిష్కారం కావచ్చు.`,
        kannada:   `${greetPart}ತಾಂತ್ರಿಕ ದೋಷಕ್ಕೆ ವಿಷಾದಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ಪರದೆಯ ಮೇಲೆ ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ದೋಷ ಕೋಡ್ ಕಾಣಿಸುತ್ತಿದೆಯೇ? ನೀವು ಯಾವ ಬ್ರೌಸರ್ ಬಳಸುತ್ತಿದ್ದೀರಿ? ಕ್ಯಾಶ್ ತೆರವುಗೊಳಿಸಿ ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ ನೋಡಿ.`,
        malayalam: `${greetPart}സാങ്കേതിക തകരാറിൽ ഞങ്ങൾ ഖേദിക്കുന്നു. സ്ക്രീനിൽ എന്തെങ്കിലും പ്രത്യേക പിശക് കോഡ് കാണിക്കുന്നുണ്ടോ? ബ്രൗസർ കാഷെ ക്ലിയർ ചെയ്ത് റീഫ്രെഷ് ചെയ്യുന്നത് പലപ്പോഴും ഈ പ്രശ്നം പരിഹരിക്കും.`,
        bengali:   `${greetPart}কারিগরি ত্রুটির জন্য আমরা দুঃখিত। স্ক্রিনে কোনো নির্দিষ্ট এরর কোড দেখাচ্ছে কি? আপনি কোন ব্রাউজার ব্যবহার করছেন? ব্রাউজার ক্যাশ ক্লিয়ার করে পেজ রিফ্রেশ করলে সাধারণত এটি সমাধান হয়ে যায়।`,
        english:   `${greetPart}I apologize for the technical issue you are experiencing. To help us resolve this as quickly as possible, could you please share your operating system, browser, and any error code displayed on your screen? In the meantime, performing a hard refresh (Ctrl+F5) or testing in an Incognito window can often bypass cached session errors.`,
      },
      followUp: {
        hindi:     `उन चरणों का परीक्षण करने की पुष्टि के लिए धन्यवाद। चूँकि तकनीकी समस्या अभी भी बनी हुई है, मैं आपकी सेशन लॉग्स के साथ इस टिकट को सीधे हमारी इंजीनियरिंग सहायता टीम को एस्केलेट कर रहा हूँ। मैं इसकी व्यक्तिगत निगरानी करूँगा।`,
        tamil:     `அந்த வழிமுறைகளை முயற்சித்ததை உறுதிப்படுத்தியதற்கு நன்றி. தொழில்நுட்ப சிக்கல் தொடர்வதால், உங்கள் அமர்வுப் பதிவுகளுடன் இந்த கோரிக்கையை நேரடியாக தொழில்நுட்பக் குழுவிற்கு அனுப்புகிறேன்.`,
        telugu:    `ఆ దశలను పరీక్షించినందుకు ధన్యవాదాలు. సాంకేతిక సమస్య ఇంకా కొనసాగుతున్నందున, నేను మీ సెషన్ లాగ్‌లతో ఈ టిక్కెట్‌ను ఇంజనీరింగ్ బృందానికి ఎస్కలేట్ చేస్తున్నాను.`,
        kannada:   `ಆ ಹಂತಗಳನ್ನು ಪರೀಕ್ಷಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ತಾಂತ್ರಿಕ ಸಮಸ್ಯೆ ಮುಂದುವರಿದಿರುವುದರಿಂದ, ನಾನು ಈ ಸಮಸ್ಯೆಯನ್ನು ನೇರವಾಗಿ ಎಂಜಿನಿಯರಿಂಗ್ ತಂಡಕ್ಕೆ ವರ್ಗಾಯಿಸುತ್ತಿದ್ದೇನೆ.`,
        malayalam: `ആ ഘട്ടങ്ങൾ പരീക്ഷിച്ചതായി അറിയിച്ചതിന് നന്ദി. സാങ്കേതിക തകരാർ തുടരുന്നതിനാൽ, ലോഗുകൾ സഹിതം ഞാൻ ഈ ടിക്കറ്റ് എഞ്ചിനീയറിംഗ് ടീമിന് കൈമാറുന്നു.`,
        bengali:   `ধাপগুলো পরীক্ষা করার জন্য ধন্যবাদ। প্রযুক্তিগত ত্রুটি এখনও থাকায়, আমি আপনার সেশন লগ সহ বিষয়টি সরাসরি আমাদের ইঞ্জিনিয়ারিং টিমের কাছে পাঠাচ্ছি।`,
        english:   `Thank you for confirming that you have tested those steps. Since the technical issue remains unresolved, I am escalating this ticket directly to our engineering support team with your session diagnostic logs. Could you confirm if this occurs across different browsers or devices, and I will continue to investigate immediately.`,
      },
    },
    account: {
      initial: {
        hindi:     `${greetPart}खाता लॉगिन व प्रमाणीकरण समस्या के लिए खेद है। हम तुरंत आपके खाते की सुरक्षित रिकवरी में सहायता करेंगे। क्या आप अपना पंजीकृत ईमेल या यूज़रनेम साझा कर सकते हैं? मैं तुरंत आपके सत्यापित ईमेल पर पासवर्ड रीसेट लिंक या नया सत्यापन कोड भेज देता हूँ।`,
        tamil:     `${greetPart}கணக்கு உள்நுழைவு சிக்கலுக்கு வருந்துகிறோம். உங்கள் கணக்கை மீட்டெடுக்க உடனடியாக உதவுகிறோம். உங்கள் பதிவுசெய்த மின்னஞ்சல் முகவரியை உறுதிப்படுத்த முடியுமா? உடனடி கடவுச்சொல் மீட்டமைப்பு இணைப்பை அனுப்புகிறேன்.`,
        telugu:    `${greetPart}ఖాతా లాగిన్ సమస్యకు మేము చింతిస్తున్నాము. మీ ఖాతాను సురక్షితంగా పునరుద్ధరించడానికి మేము సహాయం చేస్తాము. దయచేసి మీ రిజిస్టర్డ్ ఇమెయిల్ ఐడీని నిర్ధారించగలరా? వెంటనే పాస్‌వర్డ్ రీసెట్ లింక్‌ను పంపుతాము.`,
        kannada:   `${greetPart}ಖಾತೆ ಲಾಗಿನ್ ತೊಂದರೆಗೆ ವಿಷಾದಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಮರುಪಡೆಯಲು ನಾವು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ತಿಳಿಸಿ, ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸುತ್ತೇವೆ.`,
        malayalam: `${greetPart}അക്കൗണ്ട് ലോഗിൻ പ്രശ്നത്തിൽ ഖേദിക്കുന്നു. അക്കൗണ്ട് വീണ്ടെടുക്കാൻ സഹായിക്കാം. താങ്കളുടെ രജിസ്റ്റർ ചെയ്ത ഇമെയിൽ വിലാസം പങ്കുവെക്കാമോ? ഉടൻ പാസ്‌വേഡ് റീസെറ്റ് ലിങ്ക് അയക്കാം.`,
        bengali:   `${greetPart}অ্যাকাউন্ট লগইন সমস্যার জন্য আমরা দুঃখিত। আমরা দ্রুত আপনার অ্যাকাউন্ট পুনরুদ্ধার করতে সাহায্য করব। আপনার নিবন্ধিত ইমেল ঠিকানা শেয়ার করুন, আমি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাচ্ছি।`,
        english:   `${greetPart}I understand the urgency of regaining access to your account and will assist you immediately. Could you please confirm your registered email address or username? I will initiate a secure verification link and guide you through resetting your credentials.`,
      },
      followUp: {
        hindi:     `खाता विवरण की पुष्टि के लिए धन्यवाद। मैंने आपकी प्रोफ़ाइल सत्यापित कर ली है और आपके पंजीकृत ईमेल पते पर एक सुरक्षित रीसेट लिंक भेज दिया है। कृपया उस ईमेल के निर्देशों का पालन करें और पूरा होने पर मुझे बताएं।`,
        tamil:     `கணக்கு விவரங்களை உறுதிப்படுத்தியதற்கு நன்றி. உங்கள் சுயவிவரத்தை சரிபார்த்து, உங்கள் மின்னஞ்சலுக்கு பாதுகாப்பான இணைப்பை அனுப்பியுள்ளேன். தயவுசெய்து வழிமுறைகளைப் பின்பற்றவும்.`,
        telugu:    `ఖాతా వివరాలను ధృవీకరించినందుకు ధన్యవాదాలు. మీ ప్రొఫైల్‌ను ధృవీకరించి, మీ ఇమెయిల్‌కు సురక్షిత లింక్‌ను పంపాము. దయచేసి సూచనలను అనుసరించండి.`,
        kannada:   `ಖಾತೆ ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಸುರಕ್ಷಿತ ಲಿಂಕ್ ಕಳುಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಸೂಚನೆಗಳನ್ನು ಪಾಲಿಸಿ.`,
        malayalam: `അക്കൗണ്ട് വിവരങ്ങൾ സ്ഥിരീകരിച്ചതിന് നന്ദി. രജിസ്റ്റർ ചെയ്ത ഇമെയിലിലേക്ക് സുരക്ഷിതമായ റീസെറ്റ് ലിങ്ക് അയച്ചിട്ടുണ്ട്. ദയവായി നിർദ്ദേശങ്ങൾ പാലിക്കുക.`,
        bengali:   `অ্যাকাউন্টের বিবরণ নিশ্চিত করার জন্য ধন্যবাদ। নিবন্ধিত ইমেলে নিরাপদ রিসেট লিঙ্ক পাঠানো হয়েছে। নির্দেশাবলী অনুসরণ করার অনুরোধ জানাচ্ছি।`,
        english:   `Thank you for confirming your account details. I have verified your profile and dispatched a secure time-sensitive reset link to your registered email address. Please follow the instructions in that email, and let me know once completed so I can verify that full account access has been restored.`,
      },
    },
    setup: {
      initial: {
        hindi:     `${greetPart}सेटअप और कॉन्फ़िगरेशन में आपकी सहायता करने में मुझे खुशी होगी। आप कौन सा फ़ीचर या एकीकरण (Integration) सेट करना चाहते हैं? मैं आपको चरण-दर-चरण सही तरीका समझा देता हूँ।`,
        tamil:     `${greetPart}அமைவு மற்றும் உள்ளமைவில் உங்களுக்கு உதவ தயாராக உள்ளேன். நீங்கள் எந்த அம்சத்தை கட்டமைக்க விரும்புகிறீர்கள்? நான் உங்களுக்கு படிப்படியான வழிகாட்டலை வழங்குகிறேன்.`,
        telugu:    `${greetPart}సెటప్ మరియు కాన్ఫిగరేషన్‌లో మీకు సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను. మీరు ఏ ఫీచర్‌ను కాన్ఫిగర్ చేయాలనుకుంటున్నారు? నేను మీకు దశలవారీ మార్గదర్శకత్వాన్ని అందిస్తాను.`,
        kannada:   `${greetPart}ಸೆಟಪ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಿದ್ದೇನೆ. ನೀವು ಯಾವ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇನೆ.`,
        malayalam: `${greetPart}സെറ്റപ്പ് ചെയ്യുന്നതിൽ സഹായിക്കാൻ സന്തോഷമുണ്ട്. ഏത് ഫീച്ചറാണ് താങ്കൾ ക്രമീകരിക്കാൻ ആഗ്രഹിക്കുന്നത്? ഘട്ടം ഘട്ടമായുള്ള നിർദ്ദേശങ്ങൾ നൽകാം.`,
        bengali:   `${greetPart}সেটআপ এবং কনফিগারেশনে আপনাকে সাহায্য করতে প্রস্তুত। আপনি কোন ফিচারটি কনফিগার করতে চান? আমি আপনাকে ধাপে ধাপে নির্দেশনা দিচ্ছি।`,
        english:   `${greetPart}I will be glad to assist you with the setup and configuration process. Which specific integration, feature, or platform component are you configuring? I will guide you through each prerequisite and installation step.`,
      },
      followUp: {
        hindi:     `अपडेट प्रदान करने के लिए धन्यवाद। चूँकि आपने शुरुआती सेटअप चरण पूरे कर लिए हैं, आइए एंडपॉइंट कनेक्शन और कॉन्फ़िगरेशन पैरामीटर सत्यापित करें। कृपया साझा करें कि सिस्टम में क्या स्थिति कोड दिखाई दे रहा है ताकि हम इसे तुरंत अंतिम रूप दे सकें।`,
        tamil:     `தகவலை பகிர்ந்ததற்கு நன்றி. ஆரம்ப அமைவு படிகளை முடித்துள்ளதால், உள்ளமைவு அளவுருக்களை சரிபார்ப்போம். ஏதேனும் பிழை குறியீடு இருந்தால் பகிரவும்.`,
        telugu:    `అప్‌డేట్ అందించినందుకు ధన్యవాదాలు. మీరు ప్రారంభ దశలను పూర్తి చేసినందున, కాన్ఫిగరేషన్ వివరాలను ధృవీకరిద్దాం. ఏదైనా ఎర్రర్ కోడ్ ఉంటే తెలియజేయండి.`,
        kannada:   `ಮಾಹಿತಿಗಾಗಿ ಧನ್ಯವಾದಗಳು. ಪ್ರಾಥಮಿಕ ಸೆಟಪ್ ಮುಗಿದಿರುವುದರಿಂದ, ಕಾನ್ಫಿಗರೇಶನ್ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸೋಣ.`,
        malayalam: `വിവരം നൽകിയതിന് നന്ദി. പ്രാരംഭ ഘട്ടങ്ങൾ കഴിഞ്ഞതിനാൽ, കോൺഫിഗറേഷൻ വിവരങ്ങൾ പരിശോധിക്കാം.`,
        bengali:   `আপডেট জানানোর জন্য ধন্যবাদ। প্রাথমিক ধাপগুলো সম্পন্ন হওয়ায়, কনফিগারেশন প্যারামিটারগুলো পরীক্ষা করে দেখা যাক।`,
        english:   `Thank you for providing the update. Since you have completed the initial setup steps, let us verify the endpoint connection and configuration parameters. Please check if your authentication credentials match our documentation, and share any status code you receive so we can finalize the configuration.`,
      },
    },
    hardware: {
      initial: {
        hindi:     `${greetPart}डिवाइस व हार्डवेयर समस्या के समाधान के लिए मैं यहाँ हूँ। कृपया सुनिश्चित करें कि डिवाइस पर्याप्त चार्ज है और पेयरिंग मोड में है। ब्लूटूथ सेटिंग्स में डिवाइस को अनपेयर करके पुनः कनेक्ट करें और सिस्टम रीस्टार्ट करें।`,
        tamil:     `${greetPart}சாதன பிரச்சனைக்கு உதவ நான் தயாராக உள்ளேன். சாதனம் சார்ஜ் செய்யப்பட்டுள்ளதா என உறுதிப்படுத்தவும். புளூடூத் அமைப்பில் சாதனத்தை நீக்கிவிட்டு மீண்டும் இணைத்து ரீஸ்டார்ட் செய்யவும்.`,
        telugu:    `${greetPart}పరికర హార్డ్‌వేర్ సమస్యకు సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను. పరికరానికి తగినంత ఛార్జింగ్ ఉందని నిర్ధారించుకోండి. బ్లూటూత్ సెట్టింగ్‌లలో అన్‌పెయిర్ చేసి మళ్ళీ కనెక్ట్ చేయండి.`,
        kannada:   `${greetPart}ಸಾಧನದ ಹಾರ್ಡ್‌ವೇರ್ ಸಮಸ್ಯೆಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಸಿದ್ಧನಿದ್ದೇನೆ. ಸಾಧನವು ಚಾರ್ಜ್ ಆಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ. ಬ್ಲೂಟೂತ್ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಅನ್‌ಪೇರ್ ಮಾಡಿ ಮತ್ತೆ ಕನೆಕ್ಟ್ ಮಾಡಿ.`,
        malayalam: `${greetPart}ഡിവൈസ് പ്രശ്നം പരിഹരിക്കാൻ സഹായിക്കാം. ഡിവൈസിൽ മതിയായ ചാർജ്ജ് ഉണ്ടെന്ന് ഉറപ്പാക്കുക. ബ്ലൂടൂത്ത് റീസെറ്റ് ചെയ്ത് വീണ്ടും കണക്ട് ചെയ്യാൻ ശ്രമിക്കുക.`,
        bengali:   `${greetPart}ডিভাইস হার্ডওয়্যারের সমস্যায় সাহায্য করতে আমি প্রস্তুত। ডিভাইসটি চার্জ করা আছে কিনা নিশ্চিত করুন। ব্লুটুথ সেটিংসে আনপেয়ার করে পুনরায় কানেক্ট করুন।`,
        english:   `${greetPart}I apologize for the difficulty with your hardware device. Please verify that the device is adequately charged and placed in pairing mode. Removing the device from your Bluetooth paired list, restarting both the device and host system, and reconnecting typically resolves the issue.`,
      },
      followUp: {
        hindi:     `हार्डवेयर जाँच पूरी करने की पुष्टि के लिए धन्यवाद। चूँकि डिवाइस अभी भी ठीक से काम नहीं कर रहा है, यह हार्डवेयर या फर्मवेयर खराबी का संकेत देता है। मैं तुरंत आपकी वारंटी स्थिति सत्यापित करके एक्सप्रेस रिप्लेसमेंट प्रक्रिया शुरू कर सकता हूँ। कृपया डिवाइस का सीरियल नंबर साझा करें।`,
        tamil:     `வன்பொருள் சோதனைகளை முடித்ததற்கு நன்றி. சாதனம் இன்னும் செயல்படாததால், இது வன்பொருள் குறைபாடாக இருக்கலாம். மாற்று சாதனத்தை வழங்க நான் உத்தரவாதத்தை சரிபார்க்கிறேன். சாதனத்தின் வரிசை எண்ணை (Serial Number) பகிரவும்.`,
        telugu:    `హార్డ్‌వేర్ తనిఖీలను పూర్తి చేసినందుకు ధన్యవాదాలు. పరికరం ఇంకా పనిచేయకపోతే, ఇది హార్డ్‌వేర్ లోపం కావచ్చు. రీప్లేస్‌మెంట్ ప్రాసెస్ చేయడానికి దయచేసి సీరియల్ నంబర్‌ను భాగస్వామ్యం చేయండి.`,
        kannada:   `ಹಾರ್ಡ್‌ವೇರ್ ತಪಾಸಣೆ ಪೂರ್ಣಗೊಳಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಸಾಧನದ ಸರಣಿ ಸಂಖ್ಯೆಯನ್ನು (Serial Number) ತಿಳಿಸಿ, ನಾವು ಬದಲಿ ಉತ್ಪನ್ನ ಪ್ರಕ್ರಿಯೆ ಆರಂಭಿಸುತ್ತೇವೆ.`,
        malayalam: `ഹാർഡ്‌വെയർ പരിശോധനകൾ പൂർത്തിയാക്കിയതിന് നന്ദി. ഡിവൈസ് തകരാറിലായതിനാൽ പുതിയത് നൽകാനായി സീരിയൽ നമ്പർ പങ്കുവെക്കുക.`,
        bengali:   `হার্ডওয়্যার পরীক্ষা সম্পন্ন করার জন্য ধন্যবাদ। ডিভাইসটি এখনও কাজ না করায় রিপ্লেসমেন্ট প্রক্রিয়ার জন্য অনুগ্রহ করে সিরিয়াল নম্বরটি প্রদান করুন।`,
        english:   `Thank you for confirming that you have completed those hardware checks. Because the device is still not functioning as expected, this indicates a hardware or firmware fault. I can verify your warranty status immediately to initiate an express replacement or repair order. Please confirm the device serial number located on the back of the unit.`,
      },
    },
    billing: {
      initial: {
        hindi:     `${greetPart}आपके बिलिंग व इनवॉइस अनुरोध के लिए मैं पूरी सहायता करूँगा। आप 'Settings > Billing History' से आधिकारिक जीएसटी इनवॉइस डाउनलोड कर सकते हैं। यदि आपको कंसोलिडेटेड स्टेटमेंट चाहिए या टैक्स विवरण अपडेट कराना है, तो कृपया अकाउंट आईडी बताएं, मैं तुरंत तैयार करके भेज देता हूँ।`,
        tamil:     `${greetPart}உங்கள் பில்லிங் மற்றும் இன்வாய்ஸ் கோரிக்கைக்கு உதவ தயாராக உள்ளேன். நீங்கள் 'Settings > Billing History' பிரிவில் ஜிஎஸ்டி இன்வாய்ஸ்களை பதிவிறக்கம் செய்யலாம். கூடுதல் விவரங்கள் தேவைப்பட்டால் கணக்கு ஐடியை உறுதிப்படுத்தவும்.`,
        telugu:    `${greetPart}మీ బిల్లింగ్ మరియు ఇన్‌వాయిస్ అభ్యర్థనకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను. మీరు 'Settings > Billing History' లో జీఎస్టీ ఇన్‌వాయిస్‌లను డౌన్‌లోడ్ చేసుకోవచ్చు. మీకు స్టేట్‌మెంట్ కావాలంటే ఖాతా ఐడీని తెలియజేయండి.`,
        kannada:   `${greetPart}ನಿಮ್ಮ ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ಇನ್‌ವಾಯ್ಸ್ ವಿಚಾರದಲ್ಲಿ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧ. ನೀವು 'Settings > Billing History' ನಲ್ಲಿ ಜಿಎಸ್‌ಟಿ ಇನ್‌ವಾಯ್ಸ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದು.`,
        malayalam: `${greetPart}നിങ്ങളുടെ ബില്ലിംഗ്, ഇൻവോയ്സ് ആവശ്യങ്ങൾക്ക് സഹായിക്കാം. 'Settings > Billing History' എന്നതിൽ നിന്ന് ജിഎസ്ടി ഇൻവോയ്സ് ഡൗൺലോഡ് ചെയ്യാം.`,
        bengali:   `${greetPart}আপনার বিলিং এবং ইনভয়েস অনুরোধে সাহায্য করতে প্রস্তুত। আপনি 'Settings > Billing History' থেকে অফিশিয়াল জিএসটি ইনভয়েস ডাউনলোড করতে পারেন।`,
        english:   `${greetPart}I will be glad to assist you with your billing and invoice inquiry. Official GST-compliant tax invoices are available for download under Settings > Billing History. If you require an itemized statement or need to update your company billing entity, please let me know and I will generate it for you.`,
      },
      followUp: {
        hindi:     `बिलिंग विवरण प्रदान करने के लिए धन्यवाद। मैंने आपके खाते के रिकॉर्ड की समीक्षा कर ली है। मैं आवश्यक समायोजन कर रहा हूँ, और अद्यतन विवरण सीधे आपके पंजीकृत ईमेल पर भेज दिया जाएगा।`,
        tamil:     `பில்லிங் விவரங்களை பகிர்ந்ததற்கு நன்றி. உங்கள் கணக்குப் பதிவுகளை மதிப்பாய்வு செய்துவிட்டேன். புதுப்பிக்கப்பட்ட அறிக்கை உங்கள் மின்னஞ்சலுக்கு அனுப்பப்படும்.`,
        telugu:    `బిల్లింగ్ వివరాలను అందించినందుకు ధన్యవాదాలు. మీ ఖాతా రికార్డులను పరిశీలించాను. సరిచేసిన వివరాలు మీ ఇమెయిల్‌కు పంపబడతాయి.`,
        kannada:   `ಬಿಲ್ಲಿಂಗ್ ವಿವರಗಳನ್ನು ನೀಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನವೀಕರಿಸಿದ ವಿವರಗಳನ್ನು ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.`,
        malayalam: `ബില്ലിംഗ് വിവരങ്ങൾ നൽകിയതിന് നന്ദി. തിരുത്തിയ ഇൻവോയ്സ് താങ്കളുടെ ഇമെയിലിലേക്ക് അയക്കുന്നതാണ്.`,
        bengali:   `বিলিং বিবরণ জানানোর জন্য ধন্যবাদ। সংশোধিত স্টেটমেন্টটি আপনার ইমেলে সরাসরি পাঠিয়ে দেওয়া হবে।`,
        english:   `Thank you for providing those billing details. I have accessed your account records and reviewed the statement in question. I am applying the necessary billing adjustments now, and I will send an updated itemized breakdown directly to your registered email address.`,
      },
    },
    defect: {
      initial: {
        hindi:     `${greetPart}सामान में खराबी या क्षति के लिए हमें बहुत खेद है। हमने तुरंत प्राथमिकता पर रिप्लेसमेंट का अनुरोध दर्ज कर लिया है और आपके ईमेल पर प्रीपेड रिटर्न लेबल भेज दिया है। वापसी का कोई शुल्क नहीं लगेगा। क्या आप नया रिप्लेसमेंट चाहते हैं या पूरा रिफंड?`,
        tamil:     `${greetPart}பொருளில் ஏற்பட்ட குறைபாட்டிற்கு வருந்துகிறோம். உங்கள் மின்னஞ்சலுக்கு இலவச ரிட்டர்ன் லேபிளை அனுப்பியுள்ளோம். உங்களுக்கு மாற்றுப் பொருள் வேண்டுமா அல்லது முழு ரீஃபண்ட் வேண்டுமா?`,
        telugu:    `${greetPart}వస్తువు పాడైపోయినందుకు మేము చింతిస్తున్నాము. మీ ఇమెయిల్‌కు ఉచిత రిటర్న్ షిప్పింగ్ లేబుల్‌ను పంపాము. మీకు రీప్లేస్‌మెంట్ కావాలా లేదా పూర్తి రీఫండ్ కావాలా?`,
        kannada:   `${greetPart}ಉತ್ಪನ್ನದಲ್ಲಿನ ದೋಷಕ್ಕೆ ನಾವು ವಿಷಾದಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಉಚಿತ ರಿಟರ್ನ್ ಲೇಬಲ್ ಕಳುಹಿಸಲಾಗಿದೆ. ನಿಮಗೆ ಬದಲಿ ಉತ್ಪನ್ನ ಬೇಕೇ ಅಥವಾ ಪೂರ್ಣ ಮರುಪಾವತಿಯೇ?`,
        malayalam: `${greetPart}ഉൽപ്പന്നത്തിലെ തകരാറിൽ ഞങ്ങൾ ഖേദിക്കുന്നു. സൗജന്യ റിട്ടേൺ ലേബൽ ഇമെയിലിലേക്ക് അയച്ചിട്ടുണ്ട്. പുതിയ സാധനം വേണമോ അതോ മുഴുവൻ റീഫണ്ട് വേണമോ?`,
        bengali:   `${greetPart}ত্রুটিপূর্ণ পণ্যের জন্য আমরা আন্তরিকভাবে দুঃখিত। আমরা ইমেলে একটি প্রিপেইড রিটার্ন লেবেল পাঠিয়েছি। আপনি কি রিপ্লেসমেন্ট চান নাকি সম্পূর্ণ রিফান্ড?`,
        english:   `${greetPart}I sincerely apologize that your order arrived damaged or defective. We maintain strict quality standards and will rectify this promptly. I have created a priority replacement record and sent a prepaid return shipping label to your email. Would you prefer an express replacement dispatched or a complete refund?`,
      },
      followUp: {
        hindi:     `अपनी प्राथमिकता की पुष्टि करने के लिए धन्यवाद। मैंने सिस्टम में अनुरोध को अधिकृत कर दिया है, और आपका रिप्लेसमेंट बिना किसी अतिरिक्त शुल्क के तुरंत तैयार किया जा रहा है। कूरियर द्वारा पार्सल स्कैन होते ही आपको ईमेल पर ट्रैकिंग विवरण प्राप्त होगा।`,
        tamil:     `உங்கள் விருப்பத்தை உறுதிசெய்ததற்கு நன்றி. கோரிக்கையை கணினியில் அங்கீகரித்துள்ளேன், மாற்றுப் பொருள் விரைவாக அனுப்பப்படும்.`,
        telugu:    `మీ ఎంపికను ధృవీకరించినందుకు ధన్యవాదాలు. మీ రీప్లేస్‌మెంట్ ఆర్డర్ వెంటనే ప్రాసెస్ చేయబడుతోంది. ట్రాకింగ్ వివరాలు ఇమెయిల్ చేయబడతాయి.`,
        kannada:   `ನಿಮ್ಮ ಆಯ್ಕೆಯನ್ನು ಖಚಿತಪಡಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಬದಲಿ ಉತ್ಪನ್ನವನ್ನು ತಕ್ಷಣವೇ ಕಳುಹಿಸಲು ವ್ಯವಸ್ಥೆ ಮಾಡಲಾಗಿದೆ.`,
        malayalam: `തീരുമാനം അറിയിച്ചതിന് നന്ദി. റീപ്ലേസ്‌മെന്റ് ഓർഡർ തയ്യാറാക്കിവരുന്നു. ട്രാക്കിംഗ് വിവരങ്ങൾ ഉടൻ ലഭിക്കും.`,
        bengali:   `পছন্দ নিশ্চিত করার জন্য ধন্যবাদ। কোনো অতিরিক্ত খরচ ছাড়াই আপনার নতুন পণ্যটি পাঠানোর ব্যবস্থা করা হচ্ছে।`,
        english:   `Thank you for confirming your preference. I have authorized the request in our system, and your replacement shipment is being prepared with expedited delivery at no charge to you. You will receive tracking details via email as soon as the courier scans the package.`,
      },
    },
    delivery: {
      initial: {
        hindi:     `${greetPart}आपके ऑर्डर की स्थिति जानने के लिए मैं आपकी पूरी सहायता करूँगा। क्या आप कृपया अपनी ऑर्डर आईडी साझा कर सकते हैं? मैं अभी सिस्टम में लाइव ट्रैकिंग चेक करके आपको सटीक स्थिति और डिलीवरी का समय तुरंत बताता हूँ।`,
        tamil:     `${greetPart}உங்கள் ஆர்டர் நிலையை சரிபார்க்க நான் உடனடியாக உதவுகிறேன். தயவுசெய்து உங்கள் ஆர்டர் ஐடியை பகிர முடியுமா? நான் நேரடி டிராக்கிங் செய்து சரியான டெலிவரி விவரங்களை வழங்குகிறேன்.`,
        telugu:    `${greetPart}మీ ఆర్డర్ స్థితిని తనిఖీ చేయడానికి నేను మీకు సహాయం చేస్తాను. దయచేసి మీ ఆర్డర్ ఐడీని తెలియజేయగలరా? నేను లైవ్ ట్రాకింగ్ చెక్ చేసి సరైన డెలివరీ వివరాలను మీకు అందిస్తాను.`,
        kannada:   `${greetPart}ನಿಮ್ಮ ಆರ್ಡರ್ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆರ್ಡರ್ ಐಡಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ, ನಾನು ನಿಖರವಾದ ಡೆಲಿವರಿ ವಿವರಗಳನ್ನು ನೀಡುತ್ತೇನೆ.`,
        malayalam: `${greetPart}നിങ്ങളുടെ ഓർഡർ നില പരിശോധിക്കാൻ ഞാൻ സഹായിക്കാം. ദയവായി താങ്കളുടെ ഓർഡർ ഐഡി പങ്കുവെക്കാമോ? കൃത്യമായ ഡെലിവറി വിവരം അറിയിക്കാം.`,
        bengali:   `${greetPart}আপনার অর্ডারের স্থিতি পরীক্ষা করতে আমি সম্পূর্ণ সাহায্য করব। দয়া করে আপনার অর্ডার আইডি শেয়ার করুন, আমি এখনই সঠিক ডেলিভারির তথ্য জানাচ্ছি।`,
        english:   `${greetPart}I apologize for the delay and concern regarding your delivery. I will investigate the shipment status immediately. Could you please confirm your Order ID or tracking number so I can check the live transit status with our logistics carrier?`,
      },
      followUp: {
        hindi:     `अपनी ऑर्डर आईडी की पुष्टि करने के लिए धन्यवाद। मैंने आपके पार्सल को ट्रैक करने के लिए सीधे हमारे लॉजिस्टिक्स हब से संपर्क किया है। शिपमेंट को आज प्राथमिकता डिलीवरी के लिए चिह्नित किया गया है, और मैं डिलीवरी पूरी होने तक इसकी निगरानी करूँगा।`,
        tamil:     `ஆர்டர் ஐடியை உறுதிப்படுத்தியதற்கு நன்றி. உங்கள் பார்சலை கண்காணிக்க தளவாடக் குழுவை தொடர்பு கொண்டுள்ளேன். இது விரைவு டெலிவரிக்கு ஒதுக்கப்பட்டு கண்காணிக்கப்படுகிறது.`,
        telugu:    `ఆర్డర్ ఐడీని ధృవీకరించినందుకు ధన్యవాదాలు. డెలివరీ స్థితిని తెలుసుకోవడానికి లాజిస్టిక్స్ బృందాన్ని సంప్రదించాను. ప్రాధాన్యత డెలివరీ పూర్తయ్యే వరకు పర్యవేక్షిస్తాను.`,
        kannada:   `ಆರ್ಡರ್ ಐಡಿ ಖಚಿತಪಡಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಪಾರ್ಸೆಲ್ ಶೀಘ್ರದಲ್ಲೇ ತಲುಪಲು ಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗಿದೆ.`,
        malayalam: `ഓർഡർ ഐഡി നൽകിയതിന് നന്ദി. പാഴ്സൽ വേഗത്തിൽ എത്തിക്കാൻ ലോജിസ്റ്റിക്സ് ടീമുമായി ബന്ധപ്പെട്ടിട്ടുണ്ട്.`,
        bengali:   `অর্ডার আইডি নিশ্চিত করার জন্য ধন্যবাদ। পার্সেলটির দ্রুত ডেলিভারি নিশ্চিত করতে আমি লজিস্টিকস টিমের সাথে সরাসরি যোগাযোগ করেছি।`,
        english:   `Thank you for confirming your Order ID. I have contacted our logistics dispatch hub directly to trace your parcel. The shipment is currently out for final transit, and I have flagged it for priority delivery today. I will monitor this shipment until delivery confirmation is received.`,
      },
    },
    payment: {
      initial: {
        hindi:     `${greetPart}भुगतान से जुड़ी असुविधा के लिए हमें गहरा खेद है। हमने आपके खाते के लेनदेन की जाँच शुरू कर दी है। यदि कोई दोहरी या असफल कटौती हुई है, तो हम तुरंत आपके मूल भुगतान माध्यम पर पूर्ण रिफंड जारी करेंगे।`,
        tamil:     `${greetPart}ஏற்பட்ட சிரமத்திற்கு நாங்கள் மிகவும் வருந்துகிறோம். உங்கள் கணக்கை நாங்கள் சரிபார்த்து வருகிறோம் — உடனடி ரீபண்ட் செய்ய நடவடிக்கை எடுக்கப்படும்.`,
        telugu:    `${greetPart}మీకు కలిగిన అసౌకర్యానికి మేము చింతిస్తున్నాము. మీ లావాదేవీని మేము పరిశీలిస్తున్నాము — ధృవీకరించిన వెంటనే పూర్తి రీఫండ్ జారీ చేస్తాము.`,
        kannada:   `${greetPart}ನಿಮಗುಂಟಾದ ತೊಂದರೆಗೆ ನಾವು ಕ್ಷಮೆಯಾಚಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ — ದೃಢಪಟ್ಟ ತಕ್ಷಣ ಪೂರ್ಣ ಮರುಪಾವತಿ ನೀಡಲಾಗುತ್ತದೆ.`,
        malayalam: `${greetPart}നിങ്ങൾക്കുണ്ടായ അസൗകര്യത്തിൽ ഞങ്ങൾ ഖേദിക്കുന്നു. ഇടപാട് പരിശോധിച്ച് ഉടൻ തന്നെ തുക റീഫണ്ട് ചെയ്യുന്നതാണ്.`,
        bengali:   `${greetPart}পেমেন্ট সংক্রান্ত অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। আমরা লেনদেনটি যাচাই করছি এবং অবিলম্বে মূল মাধ্যমে রিফান্ড প্রক্রিয়া সম্পন্ন করব।`,
        english:   `${greetPart}I sincerely apologize for the payment discrepancy and understand your concern. I have initiated a review of the transaction logs on your account. If duplicate or unauthorized charges occurred, we will issue a full refund immediately to your original payment method.`,
      },
      followUp: {
        hindi:     `लेनदेन सत्यापन के दौरान आपके धैर्य के लिए धन्यवाद। भुगतान वापसी अधिकृत कर दी गई है और आपके बैंक के अनुसार यह राशि 3 से 5 कार्य दिवसों में आपके खाते में आ जाएगी। एक पुष्टिकरण रसीद आपके ईमेल पर भेज दी गई है।`,
        tamil:     `பரிவர்த்தனை சரிபார்ப்பின் போது பொறுமை காத்தமைக்கு நன்றி. ரீபண்ட் அங்கீகரிக்கப்பட்டுள்ளது மற்றும் 3-5 வேலை நாட்களில் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.`,
        telugu:    `ధృవీకరణ సమయంలో వేచి ఉన్నందుకు ధన్యవాదాలు. రీఫండ్ ప్రాసెస్ చేయబడింది మరియు 3-5 పని దినాలలో మీ ఖాతాలో జమ అవుతుంది.`,
        kannada:   `ಪರಿಶೀಲನೆಯ ಸಮಯದಲ್ಲಿ ಸಹಕರಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಮರುಪಾವತಿ ಪ್ರಕ್ರಿಯೆ ಪೂರ್ಣಗೊಂಡಿದ್ದು, 3-5 ದಿನಗಳಲ್ಲಿ ಖಾತೆಗೆ ಜಮೆಯಾಗಲಿದೆ.`,
        malayalam: `റീഫണ്ട് അംഗീകരിച്ചു. 3-5 പ്രവൃത്തി ദിവസങ്ങൾക്കുള്ളിൽ ബാങ്ക് അക്കൗണ്ടിൽ ലഭ്യമാകുന്നതാണ്.`,
        bengali:   `ধৈর্য ধরার জন্য ধন্যবাদ। রিফান্ড অনুমোদিত হয়েছে এবং ৩-৫ কার্যদিবসের মধ্যে আপনার মূল অ্যাকাউন্টে জমা হবে।`,
        english:   `Thank you for your patience while we verified the transaction. The payment reversal has been authorized and submitted to our payment gateway. The funds will reflect in your account within 3 to 5 business days, depending on your banking institution. A confirmation receipt has been sent to your email.`,
      },
    },
    pricing: {
      initial: {
        hindi:     `${greetPart}हमारी सेवाओं में रुचि दिखाने के लिए धन्यवाद। हम वार्षिक बिलिंग पर 15+ सीटों के लिए 18% और 25+ सीटों पर 22% की छूट प्रदान करते हैं। क्या मैं आपकी टीम के लिए एक कस्टम कोटेशन तैयार करूँ या हमारे खाता विशेषज्ञ के साथ संक्षिप्त चर्चा तय करूँ?`,
        tamil:     `${greetPart}எங்கள் திட்டங்களில் ஆர்வம் காட்டியதற்கு நன்றி. வருடாந்திர கட்டணத்தில் 15+ பயனர்களுக்கு 18% மற்றும் 25+ பயனர்களுக்கு 22% தள்ளுபடி வழங்குகிறோம். உங்கள் குழுவிற்கான சிறந்த திட்டத்தை தேர்வு செய்ய உதவவா?`,
        telugu:    `${greetPart}మా సేవలపై ఆసక్తి చూపినందుకు ధన్యవాదాలు. వార్షిక బిల్లింగ్‌లో 15+ సీట్లకు 18% మరియు 25+ సీట్లకు 22% తగ్గింపును మేము అందిస్తున్నాము. మీ కోసం ప్రత్యేక కోట్ సిద్ధం చేయమంటారా?`,
        kannada:   `${greetPart}ನಮ್ಮ ಸೇವೆಗಳಲ್ಲಿ ಆಸಕ್ತಿ ತೋರಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ವಾರ್ಷಿಕ ಬಿಲ್ಲಿಂಗ್‌ನಲ್ಲಿ ರಿಯಾಯಿತಿ ಲಭ್ಯವಿದೆ. ಸೂಕ್ತ ಕೊಡುಗೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಬೇಕೆ?`,
        malayalam: `${greetPart}ഞങ്ങളുടെ പ്ലാനുകളിൽ താൽപ്പര്യം പ്രകടിപ്പിച്ചതിന് നന്ദി. വാർഷിക ബില്ലിംഗിൽ പ്രത്യേക കിഴിവുകൾ ലഭ്യമാണ്.`,
        bengali:   `${greetPart}আমাদের সেবায় আগ্রহ দেখানোর জন্য ধন্যবাদ। বার্ষিক বিলিংয়ে বিশেষ ছাড় পাওয়া যাবে। আপনার জন্য কাস্টম কোটেশন তৈরি করব কি?`,
        english:   `${greetPart}Thank you for your interest in our plans. We offer structured volume discounts for teams, including 18% off for 15+ seats and 22% off for 25+ seats on annual billing. Would you like me to prepare a tailored quote or arrange a brief consultation with our accounts specialist?`,
      },
      followUp: {
        hindi:     `अपनी टीम की आवश्यकताओं को साझा करने के लिए धन्यवाद। आपकी सीटों की संख्या और विनिर्देशों के आधार पर, मैंने अधिकतम पात्र छूट के साथ एक कस्टम प्रस्ताव तैयार किया है, जिसे आपके ईमेल पर भेजा जा रहा है।`,
        tamil:     `உங்கள் தேவைகளை பகிர்ந்ததற்கு நன்றி. உங்கள் குழுவிற்கு தகுதியான அதிகபட்ச தள்ளுபடியுடன் கூடிய திட்ட வரைவை உங்கள் மின்னஞ்சலுக்கு அனுப்புகிறேன்.`,
        telugu:    `మీ అవసరాలను తెలిపినందుకు ధన్యవాదాలు. గరిష్ట తగ్గింపుతో కూడిన అధికారిక ప్రతిపాదనను మీ ఇమెయిల్‌కు పంపుతున్నాను.`,
        kannada:   `ವಿವರಗಳನ್ನು ನೀಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ರಿಯಾಯಿತಿ ಸಹಿತ ಪ್ರಸ್ತಾವನೆಯನ್ನು ಇಮೇಲ್ ಮಾಡಲಾಗುತ್ತದೆ.`,
        malayalam: `വിവരങ്ങൾ പങ്കുവെച്ചതിന് നന്ദി. പ്രത്യേക കിഴിവോടെയുള്ള നിർദ്ദേശം ഇമെയിലിലേക്ക് അയക്കാം.`,
        bengali:   `প্রয়োজনীয় তথ্য জানানোর জন্য ধন্যবাদ। সর্বোচ্চ যোগ্য ডিসকাউন্ট সহ একটি কাস্টম প্রস্তাবনা আপনার ইমেলে পাঠানো হচ্ছে।`,
        english:   `Thank you for sharing your team requirements. Based on your seat count and feature specifications, I have drafted a custom enterprise proposal reflecting the maximum eligible volume discount. I will send the proposal document to your email for your review.`,
      },
    },
    cancel: {
      initial: {
        hindi:     `${greetPart}यह जानकर हमें खेद है कि आप सेवा रद्द करने पर विचार कर रहे हैं। आगे बढ़ने से पहले, यदि कोई समस्या आई है, तो कृपया साझा करें ताकि हम तुरंत समाधान कर सकें या आपकी आवश्यकतानुसार प्लान समायोजित कर सकें।`,
        tamil:     `${greetPart}நீங்கள் சேவையை ரத்து செய்ய விரும்புவது அறிந்து வருந்துகிறோம். ஏதேனும் சிக்கல் இருந்தால் நாங்கள் உடனே சரிசெய்கிறோம் அல்லது பொருத்தமான திட்ட மாற்றங்களை வழங்குகிறோம்.`,
        telugu:    `${greetPart}మీరు సర్వీస్ రద్దు చేయాలనుకుంటున్నారని తెలిసి విచారిస్తున్నాము. సమస్యను వెంటనే పరిష్కరించడానికి లేదా ప్లాన్ మార్పును పరిశీలించడానికి మేము సిద్ధంగా ఉన్నాము.`,
        kannada:   `${greetPart}ನೀವು ಚಂದಾದಾರಿಕೆ ರದ್ದುಗೊಳಿಸಲು ಬಯಸಿದ್ದಕ್ಕೆ ನಮಗೆ ವಿಷಾದವಿದೆ. ಯಾವುದೇ ತೊಂದರೆ ಇದ್ದಲ್ಲಿ ನಾವು ಅದನ್ನು ಸರಿಪಡಿಸಲು ಸಿದ್ಧರಿದ್ದೇವೆ.`,
        malayalam: `${greetPart}താങ്കൾ സർവീസ് റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നു എന്നറിഞ്ഞതിൽ വിഷമമുണ്ട്. പ്രശ്നമുണ്ടെങ്കിൽ ഉടനടി പരിಹരിക്കാൻ ഞങ്ങൾ തയ്യാറാണ്.`,
        bengali:   `${greetPart}আপনি সাবস্ক্রিপশন বাতিল করতে চাইছেন জেনে আমরা দুঃখিত। কোনো সমস্যা থাকলে জানান, আমরা অবিলম্বে সমাধান করতে সচেষ্ট হব।`,
        english:   `${greetPart}I am sorry to hear that you are considering canceling your service. Before proceeding, I would appreciate the opportunity to address any issues you have encountered. Could you share what has led to this decision so we can see if a suitable resolution or plan adjustment is possible?`,
      },
      followUp: {
        hindi:     `अपनी प्रतिक्रिया के लिए धन्यवाद। मैं आपकी स्थिति को समझता हूँ। आपके अनुरोध के अनुसार रद्दीकरण प्रक्रिया दर्ज कर ली गई है, और आगे कोई शुल्क नहीं लिया जाएगा। आपकी सेवा वर्तमान बिलिंग चक्र के अंत तक सक्रिय रहेगी।`,
        tamil:     `உங்கள் கருத்துக்கு நன்றி. உங்கள் கோரிக்கையின்படி ரத்து செய்யும் நடவடிக்கை எடுக்கப்பட்டுள்ளது, மேலும் கட்டணங்கள் எதுவும் வசூலிக்கப்படாது.`,
        telugu:    `మీ అభిప్రాయానికి ధన్యవాదాలు. మీ అభ్యర్థన మేరకు రద్దు ప్రక్రియ పూర్తయింది. ఇకపై ఎలాంటి అదనపు ఛార్జీలు ఉండవు.`,
        kannada:   `ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಧನ್ಯವಾದಗಳು. ರದ್ದತಿ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗಿದೆ.`,
        malayalam: `അഭിപ്രായത്തിന് നന്ദಿ. അഭ്യർത്ഥന പ്രകാരം നടപടി സ്വീകരിച്ചിട്ടുണ്ട്.`,
        bengali:   `আপনার মতামতের জন্য ধন্যবাদ। অনুরোধ অনুযায়ী বাতিলকরণ প্রক্রিয়া সম্পন্ন হয়েছে এবং পরবর্তীতে কোনো চার্জ প্রযোজ্য হবে না।`,
        english:   `Thank you for your candid feedback. I completely understand your position and appreciate you bringing these points to our attention. I have processed your cancellation request as requested, with no further charges. Your service will remain active through the end of the current billing cycle.`,
      },
    },
    general: {
      initial: {
        hindi:     `${greetPart}नमस्ते। आपकी सहायता करने में मुझे प्रसन्नता होगी। आपकी समस्या की त्वरित व सटीक जाँच के लिए, क्या आप थोड़ा विवरण साझा कर सकते हैं? मैं अभी सिस्टम में देखकर सर्वोत्तम समाधान प्रदान करूँगा।`,
        tamil:     `${greetPart}வணக்கம். உங்கள் விசாரணைக்கு உதவ நான் தயாராக உள்ளேன். இதை விரைவாக தீர்க்க, கூடுதல் விவரங்களை பகிர முடியுமா?`,
        telugu:    `${greetPart}నమస్కారం. మీ విచారణకు సంబంధించి మీకు సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను. దీనిని త్వరగా పరిష్కరించడానికి మరింత సమాచారం పంచుకోగలరా?`,
        kannada:   `${greetPart}ನಮಸ್ಕಾರ. ನಿಮ್ಮ ವಿಚಾರದಲ್ಲಿ ಸಹಾಯ ಮಾಡಲು ನಾನು ಸಿದ್ಧನಿದ್ದೇನೆ. ಸೂಕ್ತ ಪರಿಹಾರ ನೀಡಲು ದಯವಿಟ್ಟು ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.`,
        malayalam: `${greetPart}നമസ്കാരം. താങ്കളുടെ ആവശ്യത്തിന് സഹായിക്കാൻ ഞാൻ സദാ തയ്യാറാണ്. ഇത് വേഗത്തിൽ പരിഹരിക്കാൻ കുറച്ച് കൂടുതൽ വിവരങ്ങൾ പങ്കുവെക്കാമോ?`,
        bengali:   `${greetPart}নমস্কার। আপনার বিষয়ে সাহায্য করতে আমি প্রস্তুত। সঠিক সমাধান দিতে দয়া করে একটু বিস্তারিত তথ্য জানান।`,
        english:   `${greetPart}Hello. I will be glad to assist you with your inquiry. To help me investigate and provide the most effective resolution swiftly, could you please share any relevant details or context regarding your request?`,
      },
      followUp: {
        hindi:     `यह पुष्टि करने के लिए धन्यवाद कि आपने वे चरण पूरे कर लिए हैं। चूँकि समस्या अभी भी बनी हुई है, मैं इसे त्वरित समाधान हेतु प्राथमिकता दे रहा हूँ। मैं आपके मामले की व्यक्तिगत निगरानी करूँगा ताकि इसका शीघ्र समाधान हो सके।`,
        tamil:     `நீங்கள் அந்தப் படிகளை முடித்ததை உறுதிப்படுத்தியதற்கு நன்றி. பிரச்சனை இன்னும் நீடிப்பதால், நான் இதை உடனடியாக முன்னுரிமை கொடுத்து தீர்க்க நடவடிக்கை எடுக்கிறேன்.`,
        telugu:    `మీరు ఆ దశలను పూర్తి చేసినట్లు ధృవీకరించినందుకు ధన్యవాదాలు. సమస్య ఇంకా కొనసాగుతున్నందున, తక్షణ పరిష్కారం కోసం నేను దీనికి ప్రాధాన్యత ఇస్తున్నాను.`,
        kannada:   `ನೀವು ಆ ಹಂತಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿದ್ದನ್ನು ದೃಢಪಡಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಸಮಸ್ಯೆ ಇನ್ನೂ ಮುಂದುವರಿದಿರುವುದರಿಂದ, ತಕ್ಷಣದ ಪರಿಹಾರಕ್ಕಾಗಿ ನಾನು ಇದಕ್ಕೆ ಆದ್ಯತೆ ನೀಡುತ್ತಿದ್ದೇನೆ.`,
        malayalam: `ആ ഘട്ടങ്ങൾ പൂർത്തിയാക്കിയതായി അറിയിച്ചതിന് നന്ദി. പ്രശ്നം ഇപ്പോഴും നിലനിൽക്കുന്നതിനാൽ, ഉടനടി പരിഹാരത്തിനായി ഞാൻ ഇതിന് മുൻഗണന നൽകുന്നു.`,
        bengali:   `ধাপগুলো সম্পন্ন করার বিষয়টি নিশ্চিত করার জন্য ধন্যবাদ। যেহেতু সমস্যা এখনও সমাধান হয়নি, আমি অবিলম্বে এটি সমাধানের জন্য সর্বোচ্চ অগ্রাধিকার দিচ্ছি।`,
        english:   `Thank you for confirming that you have completed those steps. Since the issue is still persisting, I am prioritizing this for immediate investigation. I have noted the details in your ticket and will take direct ownership to resolve this for you.`,
      },
    },
  };

  const langReplies = replies[issueType] || replies.general;
  const branch = isFollowUp ? (langReplies.followUp || langReplies.initial || langReplies) : (langReplies.initial || langReplies);
  return branch[language] || branch.english || replies.general.initial.english;
}

"""

# Part 1: replace getGreeting through getSuggestedReply
content = content[:idx1] + new_section_1 + content[idx2:]

# Part 2: analyzeCustomerMessage
m3 = 'async analyzeCustomerMessage(customerMessage, customerName, turnsCount = 0) {'
m4 = 'async sendCoachTurn({ agentMessage, customerMessage, sessionId, customerName, customer }) {'
p3 = content.find(m3)
p4 = content.find(m4)
assert p3 != -1 and p4 != -1, "Markers m3 or m4 not found"

new_analyze = """async analyzeCustomerMessage(customerMessage, customerName, turnsCount = 0, conversationHistory = [], sessionContext = null) {
    const isFirstMessage = turnsCount === 0;
    const lang = detectLanguage(customerMessage);
    const isFollowUp = isFollowUpMessage(customerMessage);
    const detected = detectCustomerIntent(customerMessage, lang, conversationHistory, sessionContext);
    const keyIssue = extractShortIssue(customerMessage, conversationHistory, sessionContext);

    if (detected.category === 'gratitude') {
      return {
        analysis: {
          sentiment: 'positive',
          urgency: 'low',
          escalation_risk: 'low',
          intent: 'Gratitude & Closure',
          key_issue: keyIssue || 'Customer expressing gratitude / closing conversation',
        },
        feedback: {
          tone_score: 10,
          empathy_score: 10,
          clarity_score: 10,
          coaching_tip: 'Warmly acknowledge the customer, reinforce the positive resolution, and invite future contact.',
          knowledge_suggestion: '',
        },
        compliance: { violation: false, issue: '', suggestion: '' },
        suggested_reply: getThankYouReply(lang, customerName, isFirstMessage),
        detected_language: lang,
        latency_seconds: (0.12 + Math.random() * 0.08).toFixed(2),
      };
    }

    const sentiment = detected.sentiment;
    const urgency = detected.urgency;
    const risk = detected.risk;
    const issueType = detected.category;

    const suggestedReply = getSuggestedReply(issueType, lang, customerName, isFirstMessage, customerMessage, detected.isFollowUp || isFollowUp);
    const coachingTip  = getCoachingTip(issueType, lang);
    const knowledgeTip = getKnowledgeTip(issueType, lang);

    const tone    = sentiment === 'positive' ? 9 : 8;
    const empathy = sentiment === 'negative' ? 9 : 8;
    const clarity = 9;

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
        sentiment,
        urgency,
        escalation_risk: risk,
        intent: detected.intentLabel,
        key_issue: keyIssue,
      },
      feedback: {
        tone_score: tone,
        empathy_score: empathy,
        clarity_score: clarity,
        coaching_tip: coachingTip,
        knowledge_suggestion: knowledgeTip,
      },
      compliance: { violation: false, issue: '', suggestion: '' },
      suggested_reply: suggestedReply,
      detected_language: lang,
      latency_seconds: (0.16 + Math.random() * 0.08).toFixed(2),
      burnout,
    };
  },

  // Process turn through coaching API
  """

content = content[:p3] + new_analyze + content[p4:]

# Part 3: sendCoachTurn improvements
# Update extractShortIssue & detectCustomerIntent inside sendCoachTurn
old_sc1 = "result.analysis.key_issue = extractShortIssue(result.analysis.key_issue || customerMessage);"
new_sc1 = "result.analysis.key_issue = extractShortIssue(result.analysis.key_issue || customerMessage, sessions[sessionId]?.turns, sessions[sessionId]);"
content = content.replace(old_sc1, new_sc1)

old_sc2 = "const detectedIntent = detectCustomerIntent(customerMessage, lang);"
new_sc2 = "const detectedIntent = detectCustomerIntent(customerMessage, lang, sessions[sessionId]?.turns, sessions[sessionId]);"
content = content.replace(old_sc2, new_sc2)

# Offline fallback in sendCoachTurn
old_sc3 = "intent: detectCustomerIntent(customerMessage, lang).intentLabel,\n        key_issue: extractShortIssue(customerMessage),"
new_sc3 = "intent: detectCustomerIntent(customerMessage, lang, sessions[sessionId]?.turns, sessions[sessionId]).intentLabel,\n        key_issue: extractShortIssue(customerMessage, sessions[sessionId]?.turns, sessions[sessionId]),"
content = content.replace(old_sc3, new_sc3)

old_sc4 = "    let issueType = 'general';"
new_sc4 = """    let issueType = 'general';
    if (isFollowUpMessage(customerMessage)) {
      const inherited = detectCategoryFromText(sessions[sessionId]?.title) ||
        detectCategoryFromText(sessions[sessionId]?.customer?.initial_msg) ||
        detectCategoryFromText((sessions[sessionId]?.turns || []).map(t => `${t.customer_message || ''} ${t.agent_message || ''}`).join(' '));
      if (inherited) {
        issueType = inherited;
      }
    }"""
content = content.replace(old_sc4, new_sc4, 1)

with open(client_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Client.js patched successfully!")
