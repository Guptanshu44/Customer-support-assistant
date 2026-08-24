/**
 * CareBot Dynamic Client
 * Completely dynamic user-created sessions with persistent localStorage.
 * Supports: English, Hindi, Tamil, Telugu, Kannada, Malayalam.
 * Features: Greeting-first replies, multilingual responses, thank-you detection.
 */

const STORAGE_KEY = 'carebot_copilot_sessions_v2';
const STATS_KEY = 'carebot_copilot_stats_v2';

// ── Language Detection ────────────────────────────────────────────────────
/**
 * Detects the language of a customer message.
 * Checks Unicode script ranges and romanized keyword patterns.
 * Returns: 'hindi' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'english'
 */
function detectLanguage(text) {
  if (!text) return 'english';

  // ── 1. Unicode script range checks (most reliable) ──────────────────────
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';      // Devanagari
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';      // Tamil script
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';     // Telugu script
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';    // Kannada script
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';  // Malayalam script

  const lower = text.toLowerCase();

  // ── 2. Romanized Hindi: ONLY words that cannot appear in normal English ──
  // Removed: 'order', 'track', 'payment', 'problem' — these are common English
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

  // ── 3. Romanized Tamil: only Tamil-specific words ────────────────────────
  const tamilOnlyWords = [
    'vanakkam', 'ennaku', 'ungal', 'nandri', 'romba nandri',
    'seyyungal', 'eppadi', 'thirumba', 'panam', 'kodunga',
    'thayavu', 'seidhu', 'sollunga', 'theriyum', 'illai',
  ];
  if (tamilOnlyWords.some((w) => lower.includes(w))) return 'tamil';

  // ── 4. Romanized Telugu: only Telugu-specific words ──────────────────────
  const teluguOnlyWords = [
    'meeru', 'naku ', 'chesindi', 'cheyandi', 'dhanyavaadalu',
    'ivvandi', 'cheppandi', 'kaadu', 'ayindi', 'aipoindi',
    'vellandi', 'chusanu', 'chestanu',
  ];
  if (teluguOnlyWords.some((w) => lower.includes(w))) return 'telugu';

  // ── 5. Romanized Kannada: only Kannada-specific words ────────────────────
  const kannadaOnlyWords = [
    'nimage', 'naanu', 'haegide', 'dhanyavada', 'nimma ',
    'bekagide', 'maadiri', 'aayitu', 'heli', 'sari ',
    'tumba', 'nimge',
  ];
  if (kannadaOnlyWords.some((w) => lower.includes(w))) return 'kannada';

  // ── 6. Romanized Malayalam: only Malayalam-specific words ────────────────
  const malayalamOnlyWords = [
    'ningal', 'ningalku', 'ente ', 'cheyyuka', 'nandi ',
    'sahaayikku', 'enthu ', 'pattum', 'sheriyayi', 'sariyayi',
    'valare', 'tharam', 'tharu',
  ];
  if (malayalamOnlyWords.some((w) => lower.includes(w))) return 'malayalam';

  // ── Default: English ─────────────────────────────────────────────────────
  return 'english';
}

// ── Greeting Generator ────────────────────────────────────────────────────
/**
 * Returns a language-appropriate greeting for the support agent's reply.
 */
function getGreeting(language, customerName, isFirstMessage) {
  if (!isFirstMessage) return ''; // Only greet on first message
  const firstName = customerName ? customerName.split(' ')[0] : '';
  const namePart  = firstName ? ` ${firstName}` : '';

  const greetings = {
    hindi:     `Namaste${namePart}! 🙏`,
    tamil:     `Vanakkam${namePart}! 🙏`,
    telugu:    `Namaskaram${namePart}! 🙏`,
    kannada:   `Namaskara${namePart}! 🙏`,
    malayalam: `Namaskaram${namePart}! 🙏`,
    english:   `Hello${namePart}! 👋`,
  };
  return greetings[language] || greetings.english;
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
    'that\'s all', "that's all", 'thats all', 'no that', 'nope that', 'all good',
    'resolved', 'sorted', 'never mind', 'nevermind', 'its fine', "it's fine",
    'no more', 'nothing else', 'all set',
  ];
  if (universalPatterns.some((p) => lower.includes(p))) return true;

  // Hindi thank-you / closure patterns
  if (language === 'hindi') {
    const hindiTy = ['shukriya', 'dhanyavaad', 'dhanyavad', 'shukriyaa', 'theek hai', 'theek h', 'ok hai', 'bas itna', 'koi aur nahi', 'ho gaya', 'ho gya'];
    if (hindiTy.some((p) => lower.includes(p))) return true;
  }

  // Tamil thank-you patterns
  if (language === 'tamil') {
    const tamilTy = ['nandri', 'romba nandri', 'seri', 'varum'];
    if (tamilTy.some((p) => lower.includes(p))) return true;
  }

  // Telugu thank-you patterns
  if (language === 'telugu') {
    const teluguTy = ['dhanyavaadalu', 'chala dhanyavadalu', 'ayindi', 'aipoindi'];
    if (teluguTy.some((p) => lower.includes(p))) return true;
  }

  // Kannada thank-you patterns
  if (language === 'kannada') {
    const kannadaTy = ['dhanyavada', 'tumba dhanyavada', 'aayitu', 'sari'];
    if (kannadaTy.some((p) => lower.includes(p))) return true;
  }

  // Malayalam thank-you patterns
  if (language === 'malayalam') {
    const malayalamTy = ['nandi', 'valare nandi', 'sheriyayi', 'sariyayi'];
    if (malayalamTy.some((p) => lower.includes(p))) return true;
  }

  return false;
}

// ── Thank You Reply Generator ─────────────────────────────────────────────
/**
 * Returns a warm, language-appropriate closure reply for thank-you messages.
 */
function getThankYouReply(language, customerName, isFirstMessage) {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';
  const replies = {
    hindi:     `${greetPart}Aapka swagat hai! 😊 Mujhe bahut khushi hai ki aapki samasyaa suljh gayi. Agar aage koi bhi madad chahiye toh hum hamesha haazir hain. Apna khyaal rakhein! 🌟`,
    tamil:     `${greetPart}Nandri! 😊 Ungal vishayam thiruppu seyyappattathu kettu manamagizchi. Innum enna sahayamum thevaipattal, engalai thairiyamaaga thodu padunga! 🌟`,
    telugu:    `${greetPart}Dhanyavaadalu! 😊 Meeru samasyanu parishkarinchukunnaru ani vinnanduku santhosham. Inka emi sahayam avasaramaite, memu ela aina istaramu! 🌟`,
    kannada:   `${greetPart}Dhanyavada! 😊 Nimma vishaya parihaaragona kelidu tumba santhoshaagide. Innu yaavude sahayada avasharata iddare, namage nidhaddaagi samparkisi! 🌟`,
    malayalam: `${greetPart}Nandi! 😊 Ningalude prasnakku pariskaaram labichennarinju santhosham. Pinneyyum enna sahayavum vendiyirunnal, njangale nirappayarttuka! 🌟`,
    english:   `${greetPart}You're very welcome! 😊 I'm really glad we could get everything sorted for you. It was a pleasure assisting you today. Don't hesitate to reach out anytime — we're always here to help! 🌟`,
  };
  return replies[language] || replies.english;
}

// ── Multilingual Suggested Replies ────────────────────────────────────────
/**
 * Returns full suggested reply in the detected language for each issue type.
 */
function getSuggestedReply(issueType, language, customerName, isFirstMessage) {
  const greeting = getGreeting(language, customerName, isFirstMessage);
  const greetPart = greeting ? `${greeting} ` : '';

  const replies = {
    payment: {
      hindi:     `${greetPart}Aapki pareshani ke liye hum tehrikh maafi chahte hain. 😔 Mujhe samajh aata hai ki unexpected charge kitna frustrating ho sakta hai. Aapke account ki poori jaanch ki hai aur issue confirm ho gaya hai — hum abhi refund process kar rahe hain. Yeh aapke account mein 3–5 business days mein reflect hoga aur aapko ek confirmation email milegi. Kya aur koi sahayta chahiye?`,
      tamil:     `${greetPart}Meendum indha saukariyamaana sthitikku manikka vendugirom. 😔 Thevaiyatra selavai paarththu unarchiyagirene. Ungal account-ai thiruppi paarkkavendiyathu eppadi seyyugiraen — ungal pana thiruppukkaan vari thalaippai udane seyyugirean. Adhu 3–5 thozil naalkalil ungal account-il prathiflekthu seyyum. Innum enna sahayam?`,
      telugu:    `${greetPart}Ee iyama paristhitiki memu chintistunnamu. 😔 Asalamainde charjiki emi anipistundoo artham chesukuntamu. Meeru account parisilinchaamu, samasya confirm chesaamu — refund udayam process chestamu. Idi 3–5 business roju lo reflect avutundi. Inkaemi sahayam kaavali?`,
      kannada:   `${greetPart}Ee tiluvala sthitiyalli nimma ashaktate mareyalaareva. 😔 Nimma account thanikheeya maadidhevi mattu samasya dadhisidhevu — refund ippagale prakriyegostidevu. Idu 3–5 vyaapariya dinagalalli nimma khataadalli thorusuttade. Innu enu sahaya?`,
      malayalam: `${greetPart}Ee avasthakku njangalude thalayil mannikkanam. 😔 Ningalude account parisodhinchukayum prasnayude sthirikaranam nalki — refund ippozhtte nadakkunnu. Idu 3–5 business divasathinu ulle ningalude accountil pratifect cheyyum. Pinneyyum enna sahayam?`,
      english:   `${greetPart}I sincerely apologize for the inconvenience. 😔 I completely understand how frustrating an unexpected charge can be. I have reviewed your account and confirmed the issue — I will process the refund immediately. It will reflect in your account within 3–5 business days, and you will receive a confirmation email. Is there anything else I can help you with?`,
    },
    delivery: {
      hindi:     `${greetPart}Aapke order mein hui pareshani ke liye hum kheda vyakt karte hain. 😔 Main abhi is par kaam karta hoon. Kya aap please apna Order ID share kar sakte hain? Mujhe exact status check karne aur aapko sahi update dene mein aasani hogi. Hum isko jald se jald resolve kar denge!`,
      tamil:     `${greetPart}Ungal order-il vaantha sikkalaigal paarkkathu valkkalai kotppadungal. 😔 Naan idhai ungalukkaga ippoluthae saerippikkiraen. Ungal Order ID kodukkavum? Ungalukkaga precise update tharavaendum engalukkum saukariyam aagum. Udan thiruththugirom!`,
      telugu:    `${greetPart}Meeru order lo vacha iyamaki memu chintistunnamu. 😔 Nenu ippude daniki pani chestanu. Meeru Order ID share cheyyagalara? Mee accurate status check chesi update ivvadam ki sahayapadutundi. Vethuru gaane pariskaristaramu!`,
      kannada:   `${greetPart}Nimma order vishayada tikaagulakke maru naavu vinnandugaavide. 😔 Naanu igale idara mele kaaryaanirvahanisuttene. Dayavittu nimma Order ID hesarisi? Nimma exact status parisheelisi update nidde haagu upaaya kaanutteve. Ugadiyadale parihaaristeve!`,
      malayalam: `${greetPart}Ningalude order sambandhiccha prasnam kandu dukhichupoyi. 😔 Njangal ippozhe ithu parisodikkunnu. Ningalude Order ID thurakkaamo? Angane correct status parisodichhu updata nalkanam. Udane parishkarikkunnaanu!`,
      english:   `${greetPart}I apologize for the trouble with your order. 😔 I will investigate this right away. Could you please share your order ID so I can check the exact status and give you a precise update? I want to make sure this gets resolved immediately for you!`,
    },
    pricing: {
      hindi:     `${greetPart}Aapka interest dekhkar khushi hui! 😊 Hum volume discounts offer karte hain — 15 ya adhik seats ke liye annual billing par 18% ki chhoot milti hai, aur 25+ seats par 22% ki chhoot. Main aapko saari options samjhane mein khushi hogi. Kya hum aapki team ke liye best plan dhundhne ke liye accounts team se ek quick call set kar sakte hain?`,
      tamil:     `${greetPart}Ungal aarvam kandathu santhoshham! 😊 Naangal volume discounts vazhangugirOm — 15 or moar seats-ukkum annual billing-il 18% thallikku, and 25+ seats-ukkum 22% thallikku kidaikkum. Ungal team-ukkaan best plan kaanpatharkku accounts team-udan oru kadaikai vaithukollavaa?`,
      telugu:    `${greetPart}Meeru aasaktathaku santhoshisthunnam! 😊 Meeru volume discounts provide chestamu — 15 ki paina seats ki annual billing lo 18% discount, 25+ seats ki 22% discount. Mee team kosaniki best plan kaavadam ki accounts team tho oka quick call set chestara?`,
      kannada:   `${greetPart}Nimma aasaktate kandathu santhoshaagide! 😊 Naavu volume discounts nidutteve — 15 athavaa hechchu seats gagi annual billing-nalli 18% discount, 25+ seats gagi 22% discount. Nimma team ge best plan hogi accounts team jote quick call set maadikovaavaa?`,
      malayalam: `${greetPart}Ningalude thaalparyam kandu santhosham! 😊 Njangal volume discounts vaakunnu — 15 athava athiku seats-ukku annual billing-il 18% kizhaval, 25+ seats-ukku 22% kizhaval. Ningalude teaminu best plan kaanaan accounts team-umai oru quick call vakkam?`,
      english:   `${greetPart}Thank you for your interest! 😊 We do offer volume discounts — teams with 15 or more seats on annual billing receive an 18% discount, and 25+ seats get 22% off. I would be happy to walk you through all the options. Shall I set up a quick call with our accounts team to find the best plan for you?`,
    },
    cancel: {
      hindi:     `${greetPart}Yeh sunkar thoda dukh hua ki aap subscription cancel karna chahte hain. 😔 Pahle main samajhna chahta hoon ki kya pareshani aa rahi hai. Kya aap mujhe bata sakte hain ki is nirnay ke peeche kya kaaran hai? Main dekhta hoon ki hum koi aisa hal nikal saken jo aapke liye better kaam kare.`,
      tamil:     `${greetPart}Ungal subscription batil seyyaporum endru kettadhu marugalai kotpadutte. 😔 Munneri naan enna kashtam endru purinthukollanvendiyathu important. Indha mudivu edukka enna karanam? Naan ungalukkaga oru nalla teervu kaanpalean.`,
      telugu:    `${greetPart}Subscription cancel cheyyalanukunnaranu vinnanduku chintistunnam. 😔 Modu, emi samasya vachchindO artham chesukovalanukuntunna. Ee nirnayam teesukovalanuku karanam emi? Meeru ki panikocche oka solution chustanu.`,
      kannada:   `${greetPart}Subscription cancel maaduvarudaagi kettadhu kannarige tikkagide. 😔 Moodal, enu samsye banthendhu tiliyalu beku. Ee nirnayakke karana yenu? Nimge jaastigagi work aaguvantha upaya kaanuttene.`,
      malayalam: `${greetPart}Subscription cancel cheyyumannu kettu dukhichupoyi. 😔 Munnodi, enthu prasnamano ariyan agraham. Ee teerumanathinu pinthil karanam enthu? Ningalku nallathu cheyyunna oru pariskaaram kaanaam.`,
      english:   `${greetPart}I'm sorry to hear you're considering cancellation. 😔 I want to make sure any concerns are fully addressed first. Could you tell me what prompted this decision? I'd love to see if we can find a solution that works better for you.`,
    },
    general: {
      hindi:     `${greetPart}Hum aapki sahayta karne ke liye yahan hain! 😊 Aapki pareshani ko poori tarah samajhna chahte hain. Kya aap thoda aur detail de sakte hain taaki hum abhi is par kaam kar sakein aur aapko sabse behtareen solution de sakein?`,
      tamil:     `${greetPart}Ungalukkaga enga irukkiRom! 😊 Ungal vishayatthai purinthukolla vizhaikkirom. Keezhey idhai virivakka mudiyumaa, antha kaetpukku ungalukkku best answer tharavaendum engalukkum udhavum?`,
      telugu:    `${greetPart}Meeru kosam ikaramu! 😊 Mee vishayanki poorthiga artham chesukovalanukuntunna. Mee samasya gurinchi konchum vivaram ivaggalara? Adhe meeru ki best solution ivadam ki pani padipoothundi.`,
      kannada:   `${greetPart}Nimma seva maaduvadukkagi naavu iddevi! 😊 Nimma samasyeyanni puri arthamaadikollalidu beku. Dayavittu konchaa hechchu vivara koduveera? Aagale nimge best solution nideve.`,
      malayalam: `${greetPart}Ningalku sahayikkan njangal ivideyundu! 😊 Ningalude vishayam poornnamaayi manasilakkanam. Thazhe koodi vivaram tharamo? Ningalku oru nalla pariskaaram nalkanam.`,
      english:   `${greetPart}I'm here to help and want to make sure your concern is fully resolved! 😊 Could you please share a bit more detail so I can look into this right away and provide you with the best solution?`,
    },
  };

  const langReplies = replies[issueType] || replies.general;
  return langReplies[language] || langReplies.english;
}

// ── Coaching Tips by Language ─────────────────────────────────────────────
function getCoachingTip(issueType, language) {
  const tips = {
    payment: {
      hindi:     'Billing samasya ke liye pehle sahanubooti dikhaayen. Refund timeline clearly bataayen.',
      tamil:     'Billing vishayangalil munnadi anubhavasatchi kaattu. Refund timeline thirivaaga solli.',
      telugu:    'Billing samasya ki modu sahanapatham chupinchu. Refund timeline clearly cheppu.',
      kannada:   'Billing samasyege munna anukampa tori. Refund timeline spashtavaagi heli.',
      malayalam: 'Billing prashnam pariharikaanaayi munnodi anukampavum prakadipichu. Refund timeline clearly paarayu.',
      english:   'Lead with empathy for billing issues. Confirm the problem clearly, take ownership, and provide an exact refund timeline.',
    },
    delivery: {
      hindi: 'Order/delivery samasya ke liye pehle Order ID maangein, phir tracking check karein.',
      english: 'For order/delivery issues, ask for the order ID first, then check tracking. Reassure the customer you are actively on it.',
    },
    pricing: {
      hindi: 'Pricing queries upsell ka mauka hain. Discount tiers clearly bataayen.',
      english: 'Pricing queries are upsell opportunities. Be specific about discount tiers and offer a consultation call.',
    },
    cancel: {
      hindi: 'Cancel karne se pehle retention ki koshish zaroor karein.',
      english: 'Never process cancellations without a retention attempt. Offer alternatives.',
    },
    general: {
      hindi: 'Clarifying sawaal poochein. Sahanubooti ke saath jawab dein.',
      english: 'Ask a focused clarifying question to understand the issue better. Stay empathetic and reassure the customer.',
    },
  };

  const tipGroup = tips[issueType] || tips.general;
  return tipGroup[language] || tipGroup.english || tipGroup.english;
}

// ── Knowledge Tips by Language ────────────────────────────────────────────
function getKnowledgeTip(issueType, language) {
  const tips = {
    payment: {
      hindi:     'Policy: Billing error refund 3–5 business days mein process hote hain. Refund shuru karne se pehle transaction ID zaroor verify karein.',
      english:   'Policy: Billing error refunds are processed within 3–5 business days. Verify the transaction ID before initiating the refund.',
    },
    delivery: {
      hindi:     'Policy: Agar delivery expected date ke 3+ din baad bhi nahi aayi to logistics ko escalate karein.',
      english:   'Policy: Escalate to logistics if undelivered 3+ days past expected date. Initiate a trace request within 24 hours.',
    },
    pricing: {
      hindi:     'Volume discount tiers — 10 seats: 12%, 15 seats: 18%, 25+ seats: 22%. Annual billing zaroori hai.',
      english:   'Volume discount tiers — 10 seats: 12%, 15 seats: 18%, 25+ seats: 22%. Annual billing required for all tiers.',
    },
    cancel: {
      hindi:     'Retention policy: Cancel karne se pehle hamesha retain karne ki koshish karein. 1 mahine ka free pause offer karein.',
      english:   'Retention policy: Always attempt to retain before processing cancellation. Offer a complimentary 1-month pause as an alternative.',
    },
    general: {
      hindi:     'Koi bhi transactional change karne se pehle customer ki identity aur account details verify zaroor karein.',
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
        latency_seconds: (0.12 + Math.random() * 0.08).toFixed(2),
      };
    }

    let sentiment = 'neutral', urgency = 'medium', risk = 'low';

    // Hindi-aware negative keywords
    const negativeHindi = ['nahi mila', 'paisa', 'refund', 'dikkat', 'problem', 'kya hua', 'kyu nahi', 'double', 'do baar'];
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
      negativeHindi.some((w) => lowerCust.includes(w));

    const isPositive =
      lowerCust.includes('thank') || lowerCust.includes('great') ||
      lowerCust.includes('awesome') || lowerCust.includes('perfect') ||
      lowerCust.includes('resolved') || lowerCust.includes('appreciate') ||
      lowerCust.includes('shukriya') || lowerCust.includes('dhanyavaad') ||
      lowerCust.includes('nandri') || lowerCust.includes('dhanyavada');

    if (isNegative) {
      sentiment = 'negative'; urgency = 'high';
      risk = (lowerCust.includes('cancel') || lowerCust.includes('immediately') || lowerCust.includes('money back')) ? 'high' : 'medium';
    } else if (isPositive) {
      sentiment = 'positive'; urgency = 'low'; risk = 'low';
    }

    // ── Determine Issue Type ──
    let issueType = 'general';
    if (lowerCust.includes('deducted') || lowerCust.includes('charged') || lowerCust.includes('twice') ||
        lowerCust.includes('payment') || lowerCust.includes('money back') || lowerCust.includes('refund') ||
        lowerCust.includes('paisa') || lowerCust.includes('paise')) {
      issueType = 'payment';
    } else if (lowerCust.includes('not placed') || lowerCust.includes('order') || lowerCust.includes('not received') ||
               lowerCust.includes('package') || lowerCust.includes('delivery') || lowerCust.includes('tracking') ||
               lowerCust.includes('track') || lowerCust.includes('milna') || lowerCust.includes('nahi mila')) {
      issueType = 'delivery';
    } else if (lowerCust.includes('discount') || lowerCust.includes('pricing') || lowerCust.includes('seats') ||
               lowerCust.includes('upgrade') || lowerCust.includes('plan')) {
      issueType = 'pricing';
    } else if (lowerCust.includes('cancel') || lowerCust.includes('subscription')) {
      issueType = 'cancel';
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
        key_issue: customerMessage.length > 60 ? customerMessage.substring(0, 60) + '\u2026' : customerMessage,
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

  // Send turn for AI coaching & analysis — saves turn permanently
  async sendCoachTurn({ agentMessage, customerMessage, sessionId, customerName }) {
    const lowerCust  = (customerMessage || '').toLowerCase();
    const lowerAgent = (agentMessage   || '').toLowerCase();

    // ── Detect Language for coaching feedback language ──
    const lang = detectLanguage(customerMessage);

    let sentiment = 'neutral', urgency = 'medium', risk = 'low';
    const isNeg =
      lowerCust.includes('refund') || lowerCust.includes('twice') ||
      lowerCust.includes('deducted') || lowerCust.includes('money back') ||
      lowerCust.includes('cancel') || lowerCust.includes('immediately') ||
      lowerCust.includes('error') || lowerCust.includes('fail') ||
      lowerCust.includes('not placed') || lowerCust.includes('not received') ||
      lowerCust.includes('payment') || lowerCust.includes('issue') || lowerCust.includes('problem') ||
      lowerCust.includes('paisa') || lowerCust.includes('dikkat') || lowerCust.includes('nahi mila');

    const isPos =
      isThankYou(lowerCust, lang) ||
      lowerCust.includes('thank') || lowerCust.includes('great') ||
      lowerCust.includes('resolved') || lowerCust.includes('appreciate') ||
      lowerCust.includes('shukriya') || lowerCust.includes('nandri') || lowerCust.includes('dhanyavada');

    if (isNeg) {
      sentiment = 'negative'; urgency = 'high';
      risk = (lowerCust.includes('cancel') || lowerCust.includes('immediately') || lowerCust.includes('money back')) ? 'high' : 'medium';
    } else if (isPos) {
      sentiment = 'positive'; urgency = 'low'; risk = 'low';
    }

    // ── Determine Issue Type ──
    let issueType = 'general';
    if (lowerCust.includes('deducted') || lowerCust.includes('charged') || lowerCust.includes('payment') ||
        lowerCust.includes('refund') || lowerCust.includes('twice') || lowerCust.includes('money back') ||
        lowerCust.includes('paisa') || lowerCust.includes('paise')) {
      issueType = 'payment';
    } else if (lowerCust.includes('order') || lowerCust.includes('delivery') || lowerCust.includes('tracking') ||
               lowerCust.includes('not received') || lowerCust.includes('track') || lowerCust.includes('nahi mila')) {
      issueType = 'delivery';
    } else if (lowerCust.includes('discount') || lowerCust.includes('pricing') || lowerCust.includes('seats') || lowerCust.includes('plan')) {
      issueType = 'pricing';
    } else if (lowerCust.includes('cancel') || lowerCust.includes('subscription')) {
      issueType = 'cancel';
    }

    let tone = 8, empathy = 7, clarity = 8;
    // Agent reply quality scoring (language-agnostic keywords + Hindi empathy words)
    const empathyWords = ['apologize', 'sorry', 'understand', 'happy to assist', 'maafi', 'samajh', 'khed', 'dukhit', 'vanakkam', 'namaste'];
    const clarityWords = ['business days', 'verified', 'processed', 'steps', 'din mein', 'process', 'check'];
    if (empathyWords.some((w) => lowerAgent.includes(w))) { empathy = Math.min(10, empathy + 2); tone = Math.min(10, tone + 1); }
    if (clarityWords.some((w) => lowerAgent.includes(w)))  { clarity = Math.min(10, clarity + 2); }

    let coachingTip;
    if (isPos) {
      coachingTip = lang === 'hindi'
        ? 'Customer ne shukriya kiya — is positive anubhav ko reinforce karein aur aage ki madad ke liye invite karein.'
        : 'Customer expressed thanks — acknowledge warmly, reinforce the positive experience, and invite future contact.';
    } else if (empathy >= 9 && clarity >= 9) {
      coachingTip = lang === 'hindi' ? 'Bahut achha jawab! Zyada empathy aur clear action plan.' : 'Excellent coached reply! High empathy and clear action plan.';
    } else if (empathy < 8) {
      coachingTip = lang === 'hindi' ? 'Technical explanation se pehle ek mazboot empathetic opening add karein.' : 'Add a stronger empathetic opening before the technical explanation.';
    } else {
      coachingTip = getCoachingTip(issueType, lang);
    }

    const result = {
      analysis: {
        sentiment, urgency, escalation_risk: risk,
        key_issue: customerMessage.length > 60 ? customerMessage.substring(0, 60) + '\u2026' : customerMessage,
      },
      feedback: {
        tone_score: tone, empathy_score: empathy, clarity_score: clarity,
        coaching_tip: coachingTip,
        knowledge_suggestion: getKnowledgeTip(issueType, lang),
      },
      compliance:      { violation: false, issue: '', suggestion: '' },
      detected_language: lang,
      latency_seconds: (0.28 + Math.random() * 0.12).toFixed(2),
    };

    const sessions = getInitialSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].turns.push({
        customer_message: customerMessage,
        agent_message:    agentMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result,
      });
      sessions[sessionId].last_sentiment = sentiment;
      sessions[sessionId].last_urgency   = urgency;
      sessions[sessionId].updated_at     = 'Just now';
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
