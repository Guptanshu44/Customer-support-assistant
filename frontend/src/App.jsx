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

// ── Existing Workspace Components ──
import SidebarContext from './components/SidebarContext';
import ConversationCanvas from './components/ConversationCanvas';
import CopilotSidebar from './components/CopilotSidebar';
import CustomUserModal from './components/CustomUserModal';
import { api } from './api/client';

// ── Workspace View (the original app, kept intact) ──
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
  // Resizable AI panel
  const [copilotWidth, setCopilotWidth]     = useState(360);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  const debounceRef = useRef(null);

  // ── Resize handlers ──
  const onDragStart = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = copilotWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX; // drag left = wider
      const newW = Math.min(600, Math.max(260, dragStartW.current + delta));
      setCopilotWidth(newW);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    const msg = customerInput.trim();
    if (!msg || !currentSessionId || isProcessing) {
      if (!msg) { setCoachingReady(false); setCopilotFeedback(null); setAgentInput(''); }
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
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customerInput, currentSessionId]);

  const loadStatus = async () => {
    try {
      const data = await api.getStatus();
      if (data.coach_type === 'groq')        setEngineName('Groq Engine (Llama-3.3)');
      else if (data.coach_type === 'claude') setEngineName('Claude Engine (Sonnet)');
      else                                   setEngineName('HuggingFace Offline');
    } catch { setEngineName('AI Engine Ready'); }
  };

  const loadSessions = useCallback(async (selectId = null) => {
    try {
      const data  = await api.getSessions();
      const sList = data.sessions || [];
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
    try { setSupervisorStats(await api.getSupervisorStats()); } catch { /* ignore */ }
  };

  useEffect(() => { loadStatus(); loadSessions(); }, []);

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
    if (isProcessing || isAnalyzing || !customerInput.trim() || !agentInput.trim() || !currentSessionId) return;
    const currentCustomerMsg = customerInput.trim(); const currentAgentMsg = agentInput.trim();
    const newTurn = { customer_message: currentCustomerMsg, agent_message: currentAgentMsg, timestamp: 'Just now', result: copilotFeedback };
    setTurns((prev) => [...prev, newTurn]);
    setCustomerInput(''); setAgentInput(''); setCoachingReady(false); setIsProcessing(true);
    try {
      const result = await api.sendCoachTurn({ agentMessage: currentAgentMsg, customerMessage: currentCustomerMsg, sessionId: currentSessionId, customerName: activeCustomer?.name });
      setIsProcessing(false); setCopilotFeedback(result);
      if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      loadSupervisorStats(); loadSessions(currentSessionId);
    } catch (err) { setIsProcessing(false); alert('Error sending reply: ' + err.message); }
  };

  const handleApplySnippet = (snippetText) => setAgentInput(snippetText);

  return (
    <div className="workspace-root">
      {/* Workspace top bar */}
      <div className="workspace-topbar">
        <div className="workspace-topbar-left">
          <div className="ticket-breadcrumb">
            <span>Ticket</span>
            <span className="ticket-id" id="top-ticket-id">{activeSession ? `#${activeSession.id}` : '#---'}</span>
            <span id="top-ticket-title">{activeSession?.title || 'Workspace Ready — Start a Session'}</span>
            {activeSession && <span className="priority-pill">Priority High</span>}
          </div>
        </div>
        <div className="nav-right">
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

      {/* Workspace body — resizable flex */}
      <div className="app-workbench-flex">
        <SidebarContext
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSessionById={(id) => handleDeleteSession(id)}
          activeCustomer={activeCustomer}
        />
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
        />
        {/* Drag handle */}
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

// ── Root App ──
export default function App() {
  // 'landing' | 'auth' | 'dashboard' | 'workspace' | 'live-queue' | 'tickets' | 'customers' | 'analytics' | 'agent-perf' | 'team' | 'reports' | 'settings'
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
