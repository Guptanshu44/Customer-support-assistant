/**
 * OmniDesk API Client
 * Supports both relative '/api' (Vite proxy) and absolute VITE_API_BASE_URL (Production)
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
  getStatus() {
    return fetchJson('/api/status');
  },

  // Get list of all conversation sessions
  getSessions() {
    return fetchJson('/api/sessions');
  },

  // Get full session details & turn history
  getSession(id) {
    return fetchJson(`/api/session/${id}`);
  },

  // Create new session (either preset or custom)
  createSession(customData = null) {
    return fetchJson('/api/session/new', {
      method: 'POST',
      body: JSON.stringify(customData || {}),
    });
  },

  // Delete session by ID
  deleteSession(id) {
    return fetchJson(`/api/session/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset/clear turns for a session
  resetSession(sessionId) {
    return fetchJson('/api/session/reset', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  // Send turn for real-time AI coaching & analysis
  sendCoachTurn({ agentMessage, customerMessage, sessionId }) {
    return fetchJson('/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        agent_message: agentMessage,
        customer_message: customerMessage,
        session_id: sessionId,
      }),
    });
  },

  // Search vector knowledge base
  searchKnowledge(query, limit = 2) {
    return fetchJson('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  // Get supervisor quality aggregate KPIs
  getSupervisorStats() {
    return fetchJson('/api/supervisor/stats');
  },
};
