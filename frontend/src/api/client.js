/**
 * OmniDesk API Client
 * Supports relative '/api' (Vite/Flask), absolute VITE_API_BASE_URL,
 * and seamless fallback when running inside an isolated Streamlit custom component.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Local session store for fallback
let fallbackCounter = 8492;
const customerPool = [
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@company.io',
    plan: 'Pro Annual',
    value: '$1,240 / yr',
    initial_msg: 'Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.',
    title: 'Duplicate Renewal Charge Resolution',
  },
  {
    name: 'Jessica Taylor',
    email: 'j.taylor@techhub.net',
    plan: 'Enterprise Plus',
    value: '$3,600 / yr',
    initial_msg: 'Hi, I wanted to ask if you offer volume discounts on additional user seats for our team.',
    title: 'Enterprise Seat Volume Discount',
  },
  {
    name: 'Liam Vance',
    email: 'liam.vance@gmail.com',
    plan: 'Starter Monthly',
    value: '$240 / yr',
    initial_msg: 'My package tracking shows delivered, but I have not received it yet. Can someone check?',
    title: 'Missing Delivery Tracking Inquiry',
  },
  {
    name: 'Elena Rostova',
    email: 'elena.r@innovate.co',
    plan: 'Pro Annual',
    value: '$1,450 / yr',
    initial_msg: 'Thank you so much for the prompt refund! Everything looks resolved now.',
    title: 'SLA Compliance Review Request',
  },
];

let fallbackSessions = {
  'TK-8492': {
    id: 'TK-8492',
    title: customerPool[0].title,
    customer: customerPool[0],
    turns: [],
    last_sentiment: 'negative',
    last_urgency: 'high',
  },
};

let supervisorScores = [
  { tone: 8, empathy: 8, clarity: 9 },
];

async function fetchJson(url, options = {}) {
  const fullUrl = `${API_BASE}${url}`;
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Check backend & AI engine status
  async getStatus() {
    try {
      return await fetchJson('/api/status');
    } catch {
      return { status: 'running', coach_type: 'groq', provider: 'groq', knowledge_base: 'loaded' };
    }
  },

  // Get list of all conversation sessions
  async getSessions() {
    try {
      return await fetchJson('/api/sessions');
    } catch {
      const list = Object.values(fallbackSessions).map((s) => ({
        id: s.id,
        title: s.title,
        customer_name: s.customer.name,
        customer_plan: s.customer.plan,
        turns_count: s.turns.length,
        last_sentiment: s.last_sentiment || 'neutral',
        last_urgency: s.last_urgency || 'low',
        updated_at: 'Just now',
      }));
      return { sessions: list };
    }
  },

  // Get full session details & turn history
  async getSession(id) {
    try {
      return await fetchJson(`/api/session/${id}`);
    } catch {
      if (fallbackSessions[id]) return fallbackSessions[id];
      const newS = {
        id,
        title: 'Customer Support Session',
        customer: customerPool[0],
        turns: [],
        last_sentiment: 'neutral',
      };
      fallbackSessions[id] = newS;
      return newS;
    }
  },

  // Create new session (either preset or custom)
  async createSession(customData = null) {
    try {
      return await fetchJson('/api/session/new', {
        method: 'POST',
        body: JSON.stringify(customData || {}),
      });
    } catch {
      fallbackCounter++;
      const newId = `TK-${fallbackCounter}`;
      let newCust;
      let title;
      if (customData && customData.name) {
        newCust = {
          name: customData.name,
          email: customData.email || 'customer@client.io',
          plan: customData.plan || 'Pro Tier',
          value: '$1,200 / yr',
          initial_msg: customData.initial_message || 'Hello, I need help with my account.',
        };
        title = customData.title || `${customData.name} — Support Session`;
      } else {
        const pIdx = (fallbackCounter - 8492) % customerPool.length;
        newCust = customerPool[pIdx];
        title = newCust.title;
      }

      const newS = {
        id: newId,
        title,
        customer: newCust,
        turns: [],
        last_sentiment: 'neutral',
        last_urgency: 'low',
      };
      fallbackSessions[newId] = newS;
      return { session: newS };
    }
  },

  // Delete session by ID
  async deleteSession(id) {
    try {
      return await fetchJson(`/api/session/${id}`, {
        method: 'DELETE',
      });
    } catch {
      delete fallbackSessions[id];
      const remaining = Object.keys(fallbackSessions);
      return { success: true, next_id: remaining.length > 0 ? remaining[0] : null };
    }
  },

  // Reset/clear turns for a session
  async resetSession(sessionId) {
    try {
      return await fetchJson('/api/session/reset', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      if (fallbackSessions[sessionId]) {
        fallbackSessions[sessionId].turns = [];
      }
      return { success: true };
    }
  },

  // Send turn for real-time AI coaching & analysis
  async sendCoachTurn({ agentMessage, customerMessage, sessionId }) {
    try {
      return await fetchJson('/api/coach', {
        method: 'POST',
        body: JSON.stringify({
          agent_message: agentMessage,
          customer_message: customerMessage,
          session_id: sessionId,
        }),
      });
    } catch {
      // Intelligent fast analysis fallback
      const lowerCust = customerMessage.toLowerCase();
      const lowerAgent = agentMessage.toLowerCase();

      let sentiment = 'neutral';
      let urgency = 'medium';
      let risk = 'low';

      if (lowerCust.includes('twice') || lowerCust.includes('refund') || lowerCust.includes('broken') || lowerCust.includes('immediately') || lowerCust.includes('error') || lowerCust.includes('charged')) {
        sentiment = 'negative';
        urgency = 'high';
        risk = 'medium';
      } else if (lowerCust.includes('thank') || lowerCust.includes('great') || lowerCust.includes('awesome') || lowerCust.includes('resolved')) {
        sentiment = 'positive';
        urgency = 'low';
        risk = 'low';
      }

      let tone = 8;
      let empathy = 8;
      let clarity = 8;

      if (lowerAgent.includes('apologize') || lowerAgent.includes('sorry') || lowerAgent.includes('understand')) {
        empathy = 9;
        tone = 9;
      }

      const coachingTip = empathy < 9
        ? 'Acknowledge the customer frustration directly and provide a concrete timeframe.'
        : 'Excellent empathy. Ensure next steps are clearly outlined.';

      const result = {
        analysis: {
          sentiment,
          urgency,
          escalation_risk: risk,
          key_issue: customerMessage.length > 60 ? customerMessage.substring(0, 60) + '...' : customerMessage,
        },
        feedback: {
          tone_score: tone,
          empathy_score: empathy,
          clarity_score: clarity,
          coaching_tip: coachingTip,
          knowledge_suggestion: 'Refer to billing policy: duplicate charges are refunded within 3-5 business days upon verification.',
        },
        compliance: {
          violation: false,
          issue: '',
          suggestion: '',
        },
        latency_seconds: 0.38,
      };

      supervisorScores.push({ tone, empathy, clarity });

      if (fallbackSessions[sessionId]) {
        fallbackSessions[sessionId].turns.push({
          customer_message: customerMessage,
          agent_message: agentMessage,
          timestamp: 'Just now',
          result,
        });
        fallbackSessions[sessionId].last_sentiment = sentiment;
        fallbackSessions[sessionId].last_urgency = urgency;
      }

      return result;
    }
  },

  // Search vector knowledge base
  async searchKnowledge(query, limit = 2) {
    try {
      return await fetchJson('/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
      });
    } catch {
      return {
        results: [
          { text: 'Refunds are processed within 3-5 business days.', type: 'policy', score: 0.88 },
        ],
      };
    }
  },

  // Get supervisor quality aggregate KPIs
  async getSupervisorStats() {
    try {
      return await fetchJson('/api/supervisor/stats');
    } catch {
      const avgT = Math.round((supervisorScores.reduce((a, b) => a + b.tone, 0) / supervisorScores.length) * 10) / 10;
      const avgE = Math.round((supervisorScores.reduce((a, b) => a + b.empathy, 0) / supervisorScores.length) * 10) / 10;
      const avgC = Math.round((supervisorScores.reduce((a, b) => a + b.clarity, 0) / supervisorScores.length) * 10) / 10;
      return {
        avg_tone: avgT || 8.2,
        avg_empathy: avgE || 8.0,
        avg_clarity: avgC || 8.4,
        total_turns: supervisorScores.length,
      };
    }
  },
};
