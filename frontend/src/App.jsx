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
import { api, sanitizeBurnout } from './api/client';
import { saveConversationRecord, isFirebaseConfigured, onAuthChange, getCurrentAuthUser } from './api/firebase';

function WorkspaceView({ initialCustomer = null, onClearCustomer = null, currentUser = null }) {
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
  const lastAnalyzedRef = useRef('');
  const currentSessionIdRef = useRef(currentSessionId);
  const handledCustomerRef = useRef(null);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

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
    const analyzeKey = `${currentSessionId}:${msg}`;
    if (lastAnalyzedRef.current === analyzeKey) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastAnalyzedRef.current = analyzeKey;
      setIsAnalyzing(true); setCoachingReady(false);
      try {
        const result = await api.analyzeCustomerMessage(msg, activeCustomer?.name, turns.length, turns, activeSession);
        setCopilotFeedback(result); setCoachingReady(true);
        if (result.suggested_reply) setAgentInput(result.suggested_reply);
        if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      } catch (err) { console.error('Auto-analysis failed:', err); }
      finally { setIsAnalyzing(false); }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customerInput, currentSessionId, isProcessing, activeCustomer?.name, turns, activeSession]);

  const loadStatus = async () => {
    try {
      const data = await api.getStatus();
      if (data.coach_type === 'groq')        setEngineName('Groq Engine (Llama 3.3 70B)');
      else if (data.coach_type === 'claude') setEngineName('Claude Engine (Sonnet)');
      else                                   setEngineName('HuggingFace Offline');
    } catch { setEngineName('AI Engine Ready'); }
  };

  const loadSupervisorStats = useCallback(async () => {
    try { setSupervisorStats(await api.getSupervisorStats()); } catch (err) {}
  }, []);

  const loadSessionDetails = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const s = await api.getSession(sessionId);
      if (!s) return;
      currentSessionIdRef.current = s.id;
      setCurrentSessionId(s.id); setActiveSession(s); setActiveCustomer(s.customer || null); setTurns(s.turns || []);
      const initMsg = s.customer?.initial_msg || '';
      setInitialMessage(initMsg);
      if (!s.turns || s.turns.length === 0) { setCustomerInput(initMsg); }
      else { setCustomerInput(''); }
      setAgentInput(''); setCoachingReady(false);
      if (s.turns?.length > 0) {
        const latest = s.turns[s.turns.length - 1];
        if (latest.result) {
          let fb = latest.result;
          if (fb.burnout) {
            const emp = fb.feedback?.empathy_score ?? 8;
            const ton = fb.feedback?.tone_score ?? 8;
            fb = { ...fb, burnout: sanitizeBurnout(fb.burnout, emp, ton, latest.agent_message) };
          }
          setCopilotFeedback(fb);
          if (latest.result.latency_seconds) setLatency(`${latest.result.latency_seconds}s`);
        }
      } else { setCopilotFeedback(null); setLatency('Ready'); }
      loadSupervisorStats();
    } catch (err) { console.error('Failed to load session details:', err); }
  }, [loadSupervisorStats]);

  const loadSessions = useCallback(async (selectId = null) => {
    try {
      const data  = await api.getSessions();
      const sList = data.sessions || [];
      setSessions(sList);
      const targetId = selectId || currentSessionIdRef.current || (sList.length > 0 ? sList[0].id : null);
      if (targetId && sList.some(s => s.id === targetId)) {
        await loadSessionDetails(targetId);
      } else if (selectId) {
        await loadSessionDetails(selectId);
      } else if (!targetId) {
        currentSessionIdRef.current = null;
        setCurrentSessionId(null);
        setActiveSession(null);
        setActiveCustomer(null);
        setTurns([]);
        setCopilotFeedback(null);
      }
    } catch (err) { console.error('Failed to load sessions:', err); }
  }, [loadSessionDetails]);

  useEffect(() => {
    loadStatus();
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      if (!initialCustomer) {
        loadSessions();
      }
    }
  }, [loadSessions]);

  useEffect(() => {
    if (!initialCustomer) return;
    const customerKey = initialCustomer.sessionId || initialCustomer.ticketId || initialCustomer.name;
    if (!customerKey || handledCustomerRef.current === customerKey) return;
    handledCustomerRef.current = customerKey;

    const activateCustomerSession = async () => {
      try {
        const data = await api.getSessions();
        const sList = data.sessions || [];
        const existing = sList.find(
          (s) => (initialCustomer.sessionId && (s.id === initialCustomer.sessionId || s.session_id === initialCustomer.sessionId)) ||
                 (initialCustomer.ticketId && (s.id === initialCustomer.ticketId || s.session_id === initialCustomer.ticketId)) ||
                 s.customer_name?.toLowerCase() === initialCustomer.name?.toLowerCase()
        );
        let targetId = null;
        if (existing) {
          targetId = existing.id;
        } else {
          const targetSessionId = initialCustomer.sessionId || initialCustomer.ticketId;
          const res = await api.createSession({
            session_id: targetSessionId,
            id: targetSessionId,
            name: initialCustomer.name,
            email: initialCustomer.email,
            plan: initialCustomer.plan,
            value: initialCustomer.ltv ? `${initialCustomer.ltv} / yr` : (initialCustomer.value || '$1,200 / yr'),
            company: initialCustomer.company,
            initial_message: initialCustomer.initialMessage || `Hello, I'm reaching out regarding our ${initialCustomer.plan || 'account'} subscription.`,
            title: initialCustomer.ticketId ? `#${initialCustomer.ticketId}: ${initialCustomer.name}` : `${initialCustomer.name} — Support Session`,
          });
          if (res && res.session) {
            targetId = res.session.id;
          }
        }
        if (targetId) {
          await loadSessions(targetId);
        }
        if (onClearCustomer) onClearCustomer();
      } catch (err) {
        console.error('Failed to activate customer session:', err);
      }
    };
    activateCustomerSession();
  }, [initialCustomer, loadSessions, onClearCustomer]);

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
    const sessId = currentSessionId || (sessions.length > 0 ? sessions[0].id : `TK-${Math.floor(2000 + Math.random() * 7000)}`);
    if (!currentSessionId) setCurrentSessionId(sessId);
    const currentCustomerMsg = customerInput.trim() ||
      (turns.length > 0 ? turns[turns.length - 1].customer_message : initialMessage) ||
      'Customer inquiry';
    const currentAgentMsg = agentInput.trim();
    const activeAuth = currentUser || getCurrentAuthUser();
    const activeAgentName = activeAuth?.displayName || (activeAuth?.email ? activeAuth.email.split('@')[0] : 'Support Specialist');
    const exactTurnTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTurn = { customer_message: currentCustomerMsg, agent_message: currentAgentMsg, timestamp: exactTurnTime, result: copilotFeedback, agent_name: activeAgentName };
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
          agentName: activeAgentName,
          agentEmail: activeAuth?.email || '',
          customerMessage: currentCustomerMsg,
          agentMessage: currentAgentMsg,
          sentiment: result?.analysis?.sentiment || 'neutral',
          intent: result?.analysis?.key_issue || 'general',
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
          currentUser={currentUser}
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
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setCurrentUser(user);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const isAdmin = Boolean(
    currentUser && (
      ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(String(currentUser.email || '').toLowerCase().trim()) ||
      String(currentUser.role || '').toLowerCase().includes('admin') ||
      String(currentUser.role || '').toLowerCase().includes('supervisor') ||
      (Array.isArray(currentUser.roles) && currentUser.roles.some(r => String(r).toLowerCase().includes('admin') || String(r).toLowerCase().includes('supervisor')))
    )
  );

  const navigate = (page, extra = null) => {
    setCurrentPage(page);
    if (typeof extra === 'string') {
      setAuthTab(extra);
    } else if (extra && extra.customer) {
      setWorkspaceCustomer(extra.customer);
    }
  };

  const handleClearWorkspaceCustomer = useCallback(() => {
    setWorkspaceCustomer(null);
  }, []);

  const isAuthenticated = !['landing', 'auth'].includes(currentPage);

  if (currentPage === 'landing') {
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentPage === 'auth') {
    return <AuthPage onNavigate={navigate} initialTab={authTab} />;
  }

  // Route Guard: Restrict admin-only pages from standard agents
  const adminOnlyPages = ['team', 'analytics', 'agent-perf', 'customers', 'live-queue'];
  const activePage = (!isAdmin && adminOnlyPages.includes(currentPage)) ? 'dashboard' : currentPage;

  return (
    <AppShell currentPage={activePage} onNavigate={navigate}>
      {activePage === 'dashboard'   && <Dashboard onNavigate={navigate} />}
      {activePage === 'workspace'   && (
        <WorkspaceView
          initialCustomer={workspaceCustomer}
          onClearCustomer={handleClearWorkspaceCustomer}
          currentUser={currentUser}
        />
      )}
      {activePage === 'live-queue'  && <LiveQueue onNavigate={navigate} />}
      {activePage === 'tickets'     && <Tickets onNavigate={navigate} currentUser={currentUser} isAdmin={isAdmin} />}
      {activePage === 'customers'   && <Customers onNavigate={navigate} />}
      {activePage === 'analytics'   && <Analytics />}
      {activePage === 'agent-perf'  && <AgentPerformance />}
      {activePage === 'team'        && <TeamManagement />}
      {activePage === 'reports'     && <Reports />}
      {activePage === 'settings'    && <Settings />}
    </AppShell>
  );
}
