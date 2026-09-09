import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import LiveQueue from './pages/LiveQueue';
import Tickets from './pages/Tickets';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import AgentPerformance from './pages/AgentPerformance';
import TeamManagement from './pages/TeamManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import SidebarContext from './components/SidebarContext';
import ConversationCanvas from './components/ConversationCanvas';
import CopilotSidebar from './components/CopilotSidebar';
import CustomUserModal from './components/CustomUserModal';
import { api } from './api/client';
import { saveConversationRecord, isFirebaseConfigured } from './api/firebase';

function WorkspaceView({ initialCustomer = null, onClearCustomer = null }) {
  const [engineName, setEngineName]         = useState('Groq Hybrid Engine');
  const [sessions, setSessions]             = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [activeSession, setActiveSession]   = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [turns, setTurns]                   = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [customerInput, setCustomerInput]   = useState('');
  const [agentInput, setAgentInput]         = useState('');
  const [isProcessing, setIsProcessing]     = useState(false);
  const [isAnalyzing, setIsAnalyzing]       = useState(false);
  const [copilotFeedback, setCopilotFeedback] = useState(null);
  const [latency, setLatency]               = useState('Ready');
  const [supervisorStats, setSupervisorStats] = useState(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [coachingReady, setCoachingReady]   = useState(false);
  const [mobilePanel, setMobilePanel]       = useState('chat'); // 'sessions' | 'chat' | 'copilot'
  const [freshNotice, setFreshNotice]       = useState(null);
  const [sidebarWidth, setSidebarWidth]     = useState(260);
  const isSidebarDragging = useRef(false);
  const sidebarDragStartX = useRef(0);
  const sidebarDragStartW = useRef(0);

  const [copilotWidth, setCopilotWidth]     = useState(360);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  const debounceRef = useRef(null);

    const onDragStart = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = copilotWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onSidebarDragStart = (e) => {
    isSidebarDragging.current = true;
    sidebarDragStartX.current = e.clientX;
    sidebarDragStartW.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (isDragging.current) {
        const delta = dragStartX.current - e.clientX;
        const newW = Math.min(600, Math.max(260, dragStartW.current + delta));
        setCopilotWidth(newW);
      }
      if (isSidebarDragging.current) {
        const delta = e.clientX - sidebarDragStartX.current;
        const newW = Math.min(420, Math.max(180, sidebarDragStartW.current + delta));
        setSidebarWidth(newW);
      }
    };
    const onUp = () => {
      if (isDragging.current || isSidebarDragging.current) {
        isDragging.current = false;
        isSidebarDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    const msg = customerInput.trim();
    if (!msg || isProcessing) {
      if (!msg) { setCoachingReady(false); }
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsAnalyzing(true); setCoachingReady(false);
      try {
        const result = await api.analyzeCustomerMessage(msg, activeCustomer?.name, turns.length);
        setCopilotFeedback(result); setCoachingReady(true);
        if (result.suggested_reply) setAgentInput(result.suggested_reply);
        if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      } catch (err) { console.error('Auto-analysis failed:', err); }
      finally { setIsAnalyzing(false); }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customerInput, currentSessionId, isProcessing, activeCustomer, turns.length]);

  const loadStatus = async () => {
    try {
      const data = await api.getStatus();
      if (data.coach_type === 'groq')        setEngineName('Groq Engine (groq/compound-mini)');
      else if (data.coach_type === 'claude') setEngineName('Claude Engine (Sonnet)');
      else                                   setEngineName('HuggingFace Offline');
    } catch { setEngineName('AI Engine Ready'); }
  };

  const loadSessions = useCallback(async (selectId = null) => {
    try {
      const data  = await api.getSessions();
      let sList = data.sessions || [];
      if (sList.length === 0) {
        const created = await api.createSession();
        if (created?.session) sList = [created.session];
      }
      setSessions(sList);
      const targetId = selectId || currentSessionId || (sList.length > 0 ? sList[0].id : null);
      if (targetId) loadSessionDetails(targetId);
      else if (!sList.length) { setActiveSession(null); setActiveCustomer(null); setTurns([]); setCopilotFeedback(null); }
    } catch (err) { console.error('Failed to load sessions:', err); }
  }, [currentSessionId]);

  const loadSessionDetails = async (sessionId) => {
    try {
      const s = await api.getSession(sessionId);
      setCurrentSessionId(s.id); setActiveSession(s); setActiveCustomer(s.customer || null); setTurns(s.turns || []);
      const initMsg = s.customer?.initial_msg || '';
      setInitialMessage(initMsg);
      if (!s.turns || s.turns.length === 0) { setCustomerInput(initMsg); }
      else { setCustomerInput(''); }
      setAgentInput(''); setCoachingReady(false);
      if (s.turns?.length > 0) {
        const latest = s.turns[s.turns.length - 1];
        if (latest.result) { setCopilotFeedback(latest.result); if (latest.result.latency_seconds) setLatency(`${latest.result.latency_seconds}s`); }
      } else { setCopilotFeedback(null); setLatency('Ready'); }
      loadSupervisorStats();
    } catch (err) { console.error('Failed to load session details:', err); }
  };

  const loadSupervisorStats = async () => {
    try { setSupervisorStats(await api.getSupervisorStats()); } catch (err) {}
  };

  const startFreshSession = useCallback(async (agentUser = null) => {
    try {
      const res = await api.createFreshSession(agentUser);
      if (res?.session) {
        const s = res.session;
        setCurrentSessionId(s.id);
        setActiveSession(s);
        setActiveCustomer(s.customer || null);
        setTurns([]);
        const initMsg = s.customer?.initial_msg || '';
        setInitialMessage(initMsg);
        setCustomerInput(initMsg);
        setAgentInput('');
        setCopilotFeedback(null);
        setLatency('Ready');
        setCoachingReady(false);
        const data = await api.getSessions();
        if (data?.sessions) setSessions(data.sessions);
        const agentName = agentUser?.displayName || (agentUser?.email ? agentUser.email.split('@')[0] : 'Support Specialist');
        setFreshNotice(`Fresh live session #${s.id} initialized for ${agentName}`);
        setTimeout(() => setFreshNotice(null), 5000);
        loadSupervisorStats();
      }
    } catch (err) {
      console.error('Failed to start fresh session:', err);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Check if fresh session is required (e.g. following sign in or user switch)
    const freshRequired = localStorage.getItem('carebot_fresh_session_required');
    if (freshRequired === 'true') {
      localStorage.removeItem('carebot_fresh_session_required');
      let localUser = null;
      try {
        const raw = localStorage.getItem('carebot_local_user');
        if (raw) localUser = JSON.parse(raw);
      } catch (e) {}
      startFreshSession(localUser);
    } else {
      loadSessions();
    }

    const handleFreshLogin = (e) => {
      localStorage.removeItem('carebot_fresh_session_required');
      startFreshSession(e.detail);
    };

    window.addEventListener('omnidesk-fresh-login', handleFreshLogin);
    return () => {
      window.removeEventListener('omnidesk-fresh-login', handleFreshLogin);
    };
  }, [loadSessions, startFreshSession]);

  useEffect(() => {
    if (!initialCustomer) return;
    const activateCustomerSession = async () => {
      try {
        const data = await api.getSessions();
        const sList = data.sessions || [];
        const existing = sList.find(
          (s) => s.customer_name?.toLowerCase() === initialCustomer.name?.toLowerCase()
        );
        if (existing) {
          await loadSessionDetails(existing.id);
          await loadSessions(existing.id);
        } else {
          const res = await api.createSession({
            name: initialCustomer.name,
            email: initialCustomer.email,
            plan: initialCustomer.plan,
            value: initialCustomer.ltv ? `${initialCustomer.ltv} / yr` : (initialCustomer.value || '$1,200 / yr'),
            company: initialCustomer.company,
            initial_message: initialCustomer.initialMessage || `Hello, I'm reaching out regarding our ${initialCustomer.plan || 'account'} subscription.`,
            title: `${initialCustomer.name} — Support Session`,
          });
          if (res.session) {
            await loadSessionDetails(res.session.id);
            await loadSessions(res.session.id);
          }
        }
        if (onClearCustomer) onClearCustomer();
      } catch (err) {
        console.error('Failed to activate customer session:', err);
      }
    };
    activateCustomerSession();
  }, [initialCustomer]);

  const handleSelectSession = (id) => loadSessionDetails(id);
  const handleNewSession = () => setIsCustomModalOpen(true);
  const handleCreateCustomSession = async (customData) => {
    try {
      const data = await api.createSession(customData);
      setIsCustomModalOpen(false);
      if (data.session) await loadSessions(data.session.id);
    } catch (err) { alert('Error creating custom session: ' + err.message); }
  };

  const handleDeleteSession = async (sessionIdToDelete = null) => {
    const id = sessionIdToDelete || currentSessionId;
    if (!id) return;
    try {
      const data = await api.deleteSession(id);
      if (data.next_id) { await loadSessions(data.next_id); }
      else { setCurrentSessionId(null); setActiveSession(null); setActiveCustomer(null); setTurns([]); setInitialMessage(''); setCopilotFeedback(null); setSessions([]); await loadSessions(); }
    } catch (err) { alert('Error deleting session: ' + err.message); }
  };

  const handleResetSession = async () => {
    if (!currentSessionId) return;
    try { await api.resetSession(currentSessionId); await loadSessionDetails(currentSessionId); await loadSessions(); }
    catch (err) { alert('Error clearing session: ' + err.message); }
  };

  const handleSendTurn = async () => {
    if (isProcessing || isAnalyzing || !agentInput.trim()) return;
    const sessId = currentSessionId || (sessions.length > 0 ? sessions[0].id : 'TK-8492');
    if (!currentSessionId) setCurrentSessionId(sessId);
    const currentCustomerMsg = customerInput.trim() ||
      (turns.length > 0 ? turns[turns.length - 1].customer_message : initialMessage) ||
      'Customer inquiry';
    const currentAgentMsg = agentInput.trim();
    const newTurn = { customer_message: currentCustomerMsg, agent_message: currentAgentMsg, timestamp: 'Just now', result: copilotFeedback };
    setTurns((prev) => [...prev, newTurn]);
    setCustomerInput(''); setAgentInput(''); setCoachingReady(false); setIsProcessing(true);
    try {
      const result = await api.sendCoachTurn({
        agentMessage: currentAgentMsg,
        customerMessage: currentCustomerMsg,
        sessionId: sessId,
        customerName: activeCustomer?.name,
        customer: activeCustomer,
      });
      setIsProcessing(false); setCopilotFeedback(result);
      if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      loadSupervisorStats(); loadSessions(sessId);

      // Persist conversation turn, AI coaching feedback & metrics to Firestore
      if (isFirebaseConfigured()) {
        saveConversationRecord({
          sessionId: sessId,
          ticketId: activeSession?.id || sessId,
          customerName: activeCustomer?.name || 'Customer',
          agentName: 'Support Specialist',
          customerMessage: currentCustomerMsg,
          agentMessage: currentAgentMsg,
          sentiment: result?.analysis?.sentiment || 'neutral',
          intent: result?.analysis?.key_issue || result?.clv_risk?.issue_type || 'general',
          urgency: result?.analysis?.urgency || 'low',
          escalationRisk: result?.analysis?.escalation_risk || 'low',
          aiCoachingFeedback: {
            coachingTip: result?.feedback?.coaching_tip || '',
            knowledgeSuggestion: result?.feedback?.knowledge_suggestion || '',
            toneScore: result?.feedback?.tone_score ?? 8,
            empathyScore: result?.feedback?.empathy_score ?? 7,
            clarityScore: result?.feedback?.clarity_score ?? 8,
            suggestedReply: result?.suggested_reply || '',
          },
          detectedLanguage: result?.detected_language || 'english',
        });
      }
    } catch (err) { setIsProcessing(false); alert('Error sending reply: ' + err.message); }
  };

  const handleApplySnippet = (snippetText) => setAgentInput(snippetText);

  return (
    <div className="workspace-root">
      <div className="workspace-topbar">
        <div className="workspace-topbar-left">
          <div className="ticket-breadcrumb">
            <span>Ticket</span>
            <span className="ticket-id" id="top-ticket-id">{activeSession ? `#${activeSession.id}` : '#---'}</span>
            <span id="top-ticket-title">{activeSession?.title || 'Workspace Ready — Start a Session'}</span>
            {activeSession && <span className="priority-pill">Priority High</span>}
            {activeSession?.isFresh && (
              <span className="priority-pill" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                ✨ Fresh Inbound Ticket
              </span>
            )}
          </div>
        </div>
        <div className="nav-right">
          {freshNotice && (
            <div
              className="fresh-notice-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ecfdf5',
                border: '1px solid #10b981',
                color: '#065f46',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.15)',
              }}
            >
              <span>⚡</span> {freshNotice}
            </div>
          )}
          <button className="action-btn btn-new-ticket" onClick={handleNewSession} title="Start a new ticket">
            <span style={{ fontSize: 13 }}>+</span> <span>New Session</span>
          </button>
          <button className="action-btn" onClick={handleResetSession} title="Reset conversation transcript" disabled={!activeSession}>
            <span>↺</span> <span>Clear Chat</span>
          </button>
          <button className="action-btn btn-danger-action" onClick={() => handleDeleteSession(currentSessionId)} title="Delete current session" disabled={!activeSession}>
            <span>✕</span> <span>Delete Session</span>
          </button>
        </div>
      </div>
      <div className="workspace-mobile-tabs" role="tablist" aria-label="Workspace Views">
        <button
          className={`workspace-mobile-tab-btn ${mobilePanel === 'chat' ? 'active' : ''}`}
          onClick={() => setMobilePanel('chat')}
          role="tab"
          aria-selected={mobilePanel === 'chat'}
        >
          💬 Chat {turns.length > 0 ? `(${turns.length})` : ''}
        </button>
        <button
          className={`workspace-mobile-tab-btn ${mobilePanel === 'sessions' ? 'active' : ''}`}
          onClick={() => setMobilePanel('sessions')}
          role="tab"
          aria-selected={mobilePanel === 'sessions'}
        >
          📋 Customer & Sessions
        </button>
        <button
          className={`workspace-mobile-tab-btn ${mobilePanel === 'copilot' ? 'active' : ''}`}
          onClick={() => setMobilePanel('copilot')}
          role="tab"
          aria-selected={mobilePanel === 'copilot'}
        >
          🤖 AI Copilot {coachingReady ? '• Ready' : ''}
        </button>
      </div>
      <div className="app-workbench-flex">
        <SidebarContext
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSessionById={(id) => handleDeleteSession(id)}
          activeCustomer={activeCustomer}
          width={sidebarWidth}
          className={mobilePanel === 'sessions' ? 'panel-visible-mobile' : ''}
        />
        <div
          className="panel-resize-handle"
          onMouseDown={onSidebarDragStart}
          title="Drag to resize Sessions Sidebar"
        >
          <span className="panel-resize-dots" />
        </div>
        <ConversationCanvas
          turns={turns}
          initialMessage={initialMessage}
          activeCustomer={activeCustomer}
          customerInput={customerInput}
          setCustomerInput={setCustomerInput}
          agentInput={agentInput}
          setAgentInput={setAgentInput}
          isProcessing={isProcessing}
          isAnalyzing={isAnalyzing}
          coachingReady={coachingReady}
          onSendTurn={handleSendTurn}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
          className={mobilePanel === 'chat' ? 'panel-visible-mobile' : ''}
        />
        <div
          className="panel-resize-handle"
          onMouseDown={onDragStart}
          title="Drag to resize AI Coaching Panel"
        >
          <span className="panel-resize-dots" />
        </div>
        <CopilotSidebar
          copilotFeedback={copilotFeedback}
          latency={latency}
          isAnalyzing={isAnalyzing}
          supervisorStats={supervisorStats}
          onApplySnippet={handleApplySnippet}
          width={copilotWidth}
          className={mobilePanel === 'copilot' ? 'panel-visible-mobile' : ''}
        />
      </div>

      <CustomUserModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCreateCustomSession}
      />
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [authTab, setAuthTab] = useState('login');
  const [workspaceCustomer, setWorkspaceCustomer] = useState(null);

  const navigate = (page, extra = null) => {
    setCurrentPage(page);
    if (typeof extra === 'string') {
      setAuthTab(extra);
    } else if (extra && extra.customer) {
      setWorkspaceCustomer(extra.customer);
    }
  };

  const isAuthenticated = !['landing', 'auth'].includes(currentPage);

  if (currentPage === 'landing') {
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentPage === 'auth') {
    return <AuthPage onNavigate={navigate} initialTab={authTab} />;
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={navigate}>
      {currentPage === 'dashboard'   && <Dashboard onNavigate={navigate} />}
      {currentPage === 'workspace'   && (
        <WorkspaceView
          initialCustomer={workspaceCustomer}
          onClearCustomer={() => setWorkspaceCustomer(null)}
        />
      )}
      {currentPage === 'live-queue'  && <LiveQueue onNavigate={navigate} />}
      {currentPage === 'tickets'     && <Tickets onNavigate={navigate} />}
      {currentPage === 'customers'   && <Customers onNavigate={navigate} />}
      {currentPage === 'analytics'   && <Analytics />}
      {currentPage === 'agent-perf'  && <AgentPerformance />}
      {currentPage === 'team'        && <TeamManagement />}
      {currentPage === 'reports'     && <Reports />}
      {currentPage === 'settings'    && <Settings />}
    </AppShell>
  );
}
