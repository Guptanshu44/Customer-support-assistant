import React, { useState, useEffect, useCallback, useRef } from 'react';
import TopNav from './components/TopNav';
import SidebarContext from './components/SidebarContext';
import ConversationCanvas from './components/ConversationCanvas';
import CopilotSidebar from './components/CopilotSidebar';
import CustomUserModal from './components/CustomUserModal';
import { api } from './api/client';

export default function App() {
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
  const [isAnalyzing, setIsAnalyzing]       = useState(false);   // lightweight pre-analysis
  const [copilotFeedback, setCopilotFeedback] = useState(null);
  const [latency, setLatency]               = useState('Ready');
  const [supervisorStats, setSupervisorStats] = useState(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [coachingReady, setCoachingReady]   = useState(false);

  // Debounce ref — auto-trigger analysis 700ms after customer stops typing
  const debounceRef = useRef(null);

  // ── Auto-coaching: fires 700ms after customer input changes ──
  useEffect(() => {
    const msg = customerInput.trim();
    if (!msg || !currentSessionId || isProcessing) {
      if (!msg) {
        setCoachingReady(false);
        setCopilotFeedback(null);
        setAgentInput('');
      }
      return;
    }

    // Clear any previous debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only pre-analyze if agent hasn't already typed a response
    debounceRef.current = setTimeout(async () => {
      setIsAnalyzing(true);
      setCoachingReady(false);
      try {
        const result = await api.analyzeCustomerMessage(msg, activeCustomer?.name, turns.length);
        setCopilotFeedback(result);
        setCoachingReady(true);
        // Auto-fill agent reply with AI suggestion
        if (result.suggested_reply) {
          setAgentInput(result.suggested_reply);
        }
        if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      } catch (err) {
        console.error('Auto-analysis failed:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customerInput, currentSessionId]);

  // ── Load Status & Initial Sessions ──
  const loadStatus = async () => {
    try {
      const data = await api.getStatus();
      if (data.coach_type === 'groq')        setEngineName('Groq Engine (Llama-3.3)');
      else if (data.coach_type === 'claude') setEngineName('Claude Engine (Sonnet)');
      else                                   setEngineName('HuggingFace Offline');
    } catch {
      setEngineName('AI Engine Ready');
    }
  };

  const loadSessions = useCallback(async (selectId = null) => {
    try {
      const data  = await api.getSessions();
      const sList = data.sessions || [];
      setSessions(sList);
      const targetId = selectId || currentSessionId || (sList.length > 0 ? sList[0].id : null);
      if (targetId)        loadSessionDetails(targetId);
      else if (!sList.length) { setActiveSession(null); setActiveCustomer(null); setTurns([]); setCopilotFeedback(null); }
    } catch (err) { console.error('Failed to load sessions:', err); }
  }, [currentSessionId]);

  const loadSessionDetails = async (sessionId) => {
    try {
      const s = await api.getSession(sessionId);
      setCurrentSessionId(s.id);
      setActiveSession(s);
      setActiveCustomer(s.customer || null);
      setTurns(s.turns || []);
      setInitialMessage(s.customer?.initial_msg || 'Hello, I need assistance with my account.');
      setCustomerInput('');
      setAgentInput('');
      setCoachingReady(false);

      if (s.turns?.length > 0) {
        const latest = s.turns[s.turns.length - 1];
        if (latest.result) {
          setCopilotFeedback(latest.result);
          if (latest.result.latency_seconds) setLatency(`${latest.result.latency_seconds}s`);
        }
      } else {
        setCopilotFeedback(null);
        setLatency('Ready');
      }
      loadSupervisorStats();
    } catch (err) { console.error('Failed to load session details:', err); }
  };

  const loadSupervisorStats = async () => {
    try { setSupervisorStats(await api.getSupervisorStats()); } catch { /* ignore */ }
  };

  useEffect(() => { loadStatus(); loadSessions(); }, []);

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
      if (data.next_id) {
        await loadSessions(data.next_id);
      } else {
        setCurrentSessionId(null); setActiveSession(null); setActiveCustomer(null);
        setTurns([]); setInitialMessage(''); setCopilotFeedback(null); setSessions([]);
        await loadSessions();
      }
    } catch (err) { alert('Error deleting session: ' + err.message); }
  };

  const handleResetSession = async () => {
    if (!currentSessionId) return;
    try { await api.resetSession(currentSessionId); await loadSessionDetails(currentSessionId); await loadSessions(); }
    catch (err) { alert('Error clearing session: ' + err.message); }
  };

  // ── Send Reply — saves the turn permanently ──
  const handleSendTurn = async () => {
    if (isProcessing || isAnalyzing || !customerInput.trim() || !agentInput.trim() || !currentSessionId) return;

    const currentCustomerMsg = customerInput.trim();
    const currentAgentMsg    = agentInput.trim();

    // Optimistically show in chat
    const newTurn = { customer_message: currentCustomerMsg, agent_message: currentAgentMsg, timestamp: 'Just now', result: copilotFeedback };
    setTurns((prev) => [...prev, newTurn]);
    setCustomerInput('');
    setAgentInput('');
    setCoachingReady(false);
    setIsProcessing(true);

    try {
      const result = await api.sendCoachTurn({
        agentMessage:    currentAgentMsg,
        customerMessage: currentCustomerMsg,
        sessionId:       currentSessionId,
        customerName:    activeCustomer?.name,
      });
      setIsProcessing(false);
      setCopilotFeedback(result);
      if (result.latency_seconds) setLatency(`${result.latency_seconds}s`);
      loadSupervisorStats();
      loadSessions(currentSessionId);
    } catch (err) {
      setIsProcessing(false);
      alert('Error sending reply: ' + err.message);
    }
  };

  const handleApplySnippet = (snippetText) => setAgentInput(snippetText);

  return (
    <div className="app-root">
      <TopNav
        activeSession={activeSession}
        engineName={engineName}
        onNewSession={handleNewSession}
        onResetSession={handleResetSession}
        onDeleteSession={() => handleDeleteSession(currentSessionId)}
      />

      <div className="app-workbench">
        <SidebarContext
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
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

        <CopilotSidebar
          copilotFeedback={copilotFeedback}
          latency={latency}
          isAnalyzing={isAnalyzing}
          supervisorStats={supervisorStats}
          onApplySnippet={handleApplySnippet}
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
