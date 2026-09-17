/**
 * demoData.js — Curated demo scenarios, tickets, and metrics for unauthenticated preview mode.
 * Ensures visitors exploring the demo workspace/dashboard/tickets/reports without sign-in
 * only see clean, realistic demo data and never leak private internal records.
 */

export const DEMO_TICKETS = [
  {
    id: 'TK-DEMO-BILLING',
    subject: 'Double Charge Dispute ($1,240 renewal)',
    customer: 'David Miller',
    customerName: 'David Miller',
    email: 'david.miller@techflowinc.com',
    company: 'TechFlow Inc.',
    plan: 'Enterprise',
    status: 'open',
    channel: 'chat',
    priority: 'high',
    agent: 'AI Copilot (Demo)',
    created: 'Today at 22:38',
    last_message: 'Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately and issue a refund.',
    tags: ['billing', 'refund', 'enterprise'],
    isDemo: true,
  },
  {
    id: 'TK-DEMO-TRACKING',
    subject: 'Delivery Tracking & Delayed Order #48291',
    customer: 'Priya Sharma',
    customerName: 'Priya Sharma',
    email: 'priya.sharma@retaildirect.com',
    company: 'RetailDirect',
    plan: 'Pro',
    status: 'open',
    channel: 'chat',
    priority: 'high',
    agent: 'AI Copilot (Demo)',
    created: 'Today at 21:15',
    last_message: 'Hi, my shipment #48291 was supposed to arrive two days ago according to the tracking portal. What is the delay?',
    tags: ['shipping', 'logistics', 'tracking'],
    isDemo: true,
  },
  {
    id: 'TK-DEMO-HINDI',
    subject: 'क्षेत्रीय पूछताछ — मेरा ऑर्डर कहाँ है? (Order Status)',
    customer: 'Rahul Verma',
    customerName: 'Rahul Verma',
    email: 'rahul.verma@quickcart.in',
    company: 'QuickCart India',
    plan: 'Standard',
    status: 'open',
    channel: 'chat',
    priority: 'medium',
    agent: 'AI Copilot (Demo)',
    created: 'Today at 20:45',
    last_message: 'मेरा ऑर्डर कहाँ है? मैंने तीन दिन पहले ऑर्डर किया था लेकिन अभी तक कोई डिलीवरी अपडेट नहीं मिला।',
    tags: ['hindi', 'delivery', 'multilingual'],
    isDemo: true,
  },
  {
    id: 'TK-DEMO-RESOLUTION',
    subject: 'Enterprise API Rate Limit Upgrade Approved',
    customer: 'Sarah Jenkins',
    customerName: 'Sarah Jenkins',
    email: 'sarah.j@cloudscale.io',
    company: 'CloudScale Labs',
    plan: 'Enterprise',
    status: 'resolved',
    channel: 'chat',
    priority: 'high',
    agent: 'AI Copilot (Demo)',
    created: 'Yesterday at 18:20',
    last_message: 'Thank you for upgrading our rate limit tiers so quickly. Our batch ingestion is running smoothly now.',
    tags: ['api', 'enterprise', 'resolved'],
    isDemo: true,
  },
];

export const DEMO_CONVERSATIONS = [
  {
    id: 'demo-conv-billing',
    ticketId: 'TK-DEMO-BILLING',
    customerName: 'David Miller',
    agentName: 'AI Copilot (Demo)',
    agentEmail: 'demo.agent@omnidesk.ai',
    customerMessage: 'Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately and issue a refund.',
    agentMessage: 'I sincerely apologize for the duplicate charge! I have verified the transaction log and initiated an immediate refund of $1,240 back to your original payment card (3–5 business days). A confirmation receipt has been emailed.',
    sentiment: 'negative',
    intent: 'Duplicate Billing Charge ($1,240)',
    urgency: 'high',
    escalationRisk: 'high',
    aiCoachingFeedback: {
      toneScore: 9,
      empathyScore: 9,
      clarityScore: 8,
      coachingTip: 'Lead with sincere acknowledgment of the billing error and provide the exact refund timeline (3–5 business days).',
      knowledgeSuggestion: 'Billing Policy: Duplicate charges qualify for expedited refund within 3–5 business days.',
      suggestedReply: 'I sincerely apologize for the duplicate charge! I have verified the transaction log and initiated an immediate refund of $1,240 back to your original payment card (3–5 business days).',
    },
    timestamp: new Date().toISOString(),
    detectedLanguage: 'english',
    isDemo: true,
  },
  {
    id: 'demo-conv-tracking',
    ticketId: 'TK-DEMO-TRACKING',
    customerName: 'Priya Sharma',
    agentName: 'AI Copilot (Demo)',
    agentEmail: 'demo.agent@omnidesk.ai',
    customerMessage: 'Hi, my shipment #48291 was supposed to arrive two days ago according to the tracking portal. What is the delay?',
    agentMessage: 'I have contacted FedEx regarding shipment #48291. The scan shows it cleared customs and is on the vehicle for delivery today before 5 PM. I will monitor it until delivered.',
    sentiment: 'neutral',
    intent: 'Shipment Tracking & Delay',
    urgency: 'high',
    escalationRisk: 'medium',
    aiCoachingFeedback: {
      toneScore: 9,
      empathyScore: 8,
      clarityScore: 9,
      coachingTip: 'Provide the exact courier tracking link and assure proactive delivery monitoring.',
      knowledgeSuggestion: 'Shipping SLA: Orders delayed >48h qualify for expedited dispatch voucher.',
      suggestedReply: 'I have contacted FedEx regarding shipment #48291. It is out for delivery today before 5 PM.',
    },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    detectedLanguage: 'english',
    isDemo: true,
  },
  {
    id: 'demo-conv-hindi',
    ticketId: 'TK-DEMO-HINDI',
    customerName: 'Rahul Verma',
    agentName: 'AI Copilot (Demo)',
    agentEmail: 'demo.agent@omnidesk.ai',
    customerMessage: 'मेरा ऑर्डर कहाँ है? मैंने तीन दिन पहले ऑर्डर किया था लेकिन अभी तक कोई डिलीवरी अपडेट नहीं मिला।',
    agentMessage: 'नमस्ते राहुल, असुविधा के लिए खेद है। मैंने आपका ऑर्डर चेक किया है, यह ट्रांजिट में है और कल शाम तक आपके पते पर डिलीवर हो जाएगा।',
    sentiment: 'neutral',
    intent: 'क्षेत्रीय ऑर्डर स्थिति पूछताछ',
    urgency: 'medium',
    escalationRisk: 'low',
    aiCoachingFeedback: {
      toneScore: 9,
      empathyScore: 9,
      clarityScore: 9,
      coachingTip: 'ग्राहक की क्षेत्रीय भाषा (हिंदी) में उत्तर दें और सटीक डिलीवरी तिथि बताएं।',
      knowledgeSuggestion: 'रीजनल सपोर्ट: उत्तर-भारतीय क्षेत्रों में 24-48 घंटे मानक डिलीवरी समय है।',
      suggestedReply: 'नमस्ते राहुल, आपका ऑर्डर कल शाम तक आपके पते पर डिलीवर हो जाएगा।',
    },
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    detectedLanguage: 'hindi',
    isDemo: true,
  },
  {
    id: 'demo-conv-resolution',
    ticketId: 'TK-DEMO-RESOLUTION',
    customerName: 'Sarah Jenkins',
    agentName: 'AI Copilot (Demo)',
    agentEmail: 'demo.agent@omnidesk.ai',
    customerMessage: 'Thank you for upgrading our rate limit tiers so quickly. Our batch ingestion is running smoothly now.',
    agentMessage: 'You are very welcome Sarah! We are thrilled to hear the batch ingestion is performing well. Please reach out if you need further scale adjustments.',
    sentiment: 'positive',
    intent: 'Enterprise API Tier Upgrade Confirmation',
    urgency: 'low',
    escalationRisk: 'low',
    aiCoachingFeedback: {
      toneScore: 10,
      empathyScore: 10,
      clarityScore: 10,
      coachingTip: 'Reinforce partnership and invite proactive feedback for future scaling needs.',
      knowledgeSuggestion: 'API Scaling: Enterprise tier permits up to 10,000 req/min with dedicated burst buffer.',
      suggestedReply: 'You are very welcome Sarah! Please reach out if you need further scale adjustments.',
    },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    detectedLanguage: 'english',
    isDemo: true,
  },
];

export const DEMO_TEAM_USERS = [
  {
    uid: 'demo-agent-spec',
    displayName: 'Demo Copilot Specialist',
    email: 'demo.agent@omnidesk.ai',
    role: 'Support Specialist (Demo)',
    status: 'online',
    isDemo: true,
  },
  {
    uid: 'demo-agent-ai',
    displayName: 'Groq LPU Copilot',
    email: 'copilot@omnidesk.ai',
    role: 'AI In-Flight Assistant',
    status: 'online',
    isDemo: true,
  }
];

export const DEMO_TICKETS_STORAGE_KEY = 'carebot_demo_tickets_v1';

export function getStoredDemoTickets() {
  try {
    const raw = localStorage.getItem(DEMO_TICKETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEMO_TICKETS;
}

export function saveStoredDemoTickets(tickets) {
  try {
    localStorage.setItem(DEMO_TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch {}
}
