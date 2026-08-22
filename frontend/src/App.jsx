import React, { useState, useEffect, useCallback } from 'react';
import TopNav from './components/TopNav';
import SidebarContext from './components/SidebarContext';
import ConversationCanvas from './components/ConversationCanvas';
import CopilotSidebar from './components/CopilotSidebar';
import CustomUserModal from './components/CustomUserModal';
import { api } from './api/client';

export default function App() {
  const [engineName, setEngineName] = useState('Groq Hybrid Engine');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [turns, setTurns] = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copilotFeedback, setCopilotFeedback] = useState(null);
  const [latency, setLatency] = useState('Ready');
  const [supervisorStats, setSupervisorStats] = useState(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Load Status & Initial Sessions
  const loadStatus = async () => {
    try {
      const data = await api.getStatus();
      if (data.coach_type === 'groq') {
        setEngineName('Groq Engine (Llama-3.3)');
      } else if (data.coach_type === 'claude') {
        setEngineName('Claude Engine (Sonnet)');
      } else {
        setEngineName('HuggingFace Offline');
      }
    } catch {
      setEngineName('AI Engine Ready');
    }
  };

  const loadSessions = useCallback(async (selectId = null) => {
    try {
      const data = await api.getSessions();
      const sList = data.sessions || [];
      setSessions(sList);

      const targetId = selectId || currentSessionId || (sList.length > 0 ? sList[0].id : null);
      if (targetId) {
        loadSessionDetails(targetId);
      } else if (sList.length === 0) {
        setActiveSession(null);
        setActiveCustomer(null);
        setTurns([]);
        setCopilotFeedback(null);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [currentSessionId]);

  const loadSessionDetails = async (sessionId) => {
    try {
      const s = await api.getSession(sessionId);
      setCurrentSessionId(s.id);
      setActiveSession(s);
      setActiveCustomer(s.customer || null);
      setTurns(s.turns || []);
      setInitialMessage(s.customer?.initial_msg || 'Hello, I need assistance with my account.');

      if (s.turns && s.turns.length > 0) {
        const latestTurn = s.turns[s.turns.length - 1];
        if (latestTurn.result) {
          setCopilotFeedback(latestTurn.result);
          if (latestTurn.result.latency_seconds) {
            setLatency(`${latestTurn.result.latency_seconds}s`);
          }
        }
      } else {
        setCopilotFeedback(null);
        setLatency('Ready');
      }

      loadSupervisorStats();
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const loadSupervisorStats = async () => {
    try {
      const stats = await api.getSupervisorStats();
      setSupervisorStats(stats);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus();
    loadSessions();
  }, []);

  const handleSelectSession = (id) => {
    loadSessionDetails(id);
  };

  const handleNewSession = () => {
    setIsCustomModalOpen(true);
  };

  const handleCreateCustomSession = async (customData) => {
    try {
      const data = await api.createSession(customData);
      setIsCustomModalOpen(false);
      if (data.session) {
        await loadSessions(data.session.id);
      }
    } catch (err) {
      alert('Error creating custom session: ' + err.message);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete = null) => {
    const id = sessionIdToDelete || currentSessionId;
    if (!id) return;

    try {
      const data = await api.deleteSession(id);
      if (data.next_id) {
        await loadSessions(data.next_id);
      } else {
        // Cleanly reset without automatically creating any session
        setCurrentSessionId(null);
        setActiveSession(null);
        setActiveCustomer(null);
        setTurns([]);
        setInitialMessage('');
        setCopilotFeedback(null);
        setSessions([]);
        await loadSessions();
      }
    } catch (err) {
      alert('Error deleting session: ' + err.message);
    }
  };

  const handleResetSession = async () => {
    if (!currentSessionId) return;
    try {
      await api.resetSession(currentSessionId);
      await loadSessionDetails(currentSessionId);
      await loadSessions();
    } catch (err) {
      alert('Error clearing session: ' + err.message);
    }
  };

  const handleSendTurn = async () => {
    if (isProcessing || !customerInput.trim() || !agentInput.trim() || !currentSessionId) return;

    const currentCustomerMsg = customerInput.trim();
    const currentAgentMsg = agentInput.trim();

    // Optimistically update turns in chat
    const newTurn = {
      customer_message: currentCustomerMsg,
      agent_message: currentAgentMsg,
      timestamp: 'Just now',
    };
    setTurns((prev) => [...prev, newTurn]);
    setCustomerInput('');
    setAgentInput('');
    setIsProcessing(true);

    try {
      const result = await api.sendCoachTurn({
        agentMessage: currentAgentMsg,
        customerMessage: currentCustomerMsg,
        sessionId: currentSessionId,
      });

      setIsProcessing(false);
      setCopilotFeedback(result);
      if (result.latency_seconds) {
        setLatency(`${result.latency_seconds}s`);
      }
      loadSupervisorStats();
      loadSessions(currentSessionId);
    } catch (err) {
      setIsProcessing(false);
      alert('Error fetching coaching feedback: ' + err.message);
    }
  };

  const handleApplySnippet = (snippetText) => {
    setAgentInput(snippetText);
  };

  return (
    <div className="app-root">
      {/* Top Application Bar */}
      <TopNav
        activeSession={activeSession}
        engineName={engineName}
        onNewSession={handleNewSession}
        onResetSession={handleResetSession}
        onDeleteSession={() => handleDeleteSession(currentSessionId)}
      />

      {/* Main 3-Column Workbench */}
      <div className="app-workbench">
        {/* Column 1: Sessions Context */}
        <SidebarContext
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
          onDeleteSessionById={(id) => handleDeleteSession(id)}
          activeCustomer={activeCustomer}
        />

        {/* Column 2: Conversation Stream */}
        <ConversationCanvas
          turns={turns}
          initialMessage={initialMessage}
          activeCustomer={activeCustomer}
          customerInput={customerInput}
          setCustomerInput={setCustomerInput}
          agentInput={agentInput}
          setAgentInput={setAgentInput}
          isProcessing={isProcessing}
          onSendTurn={handleSendTurn}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
        />

        {/* Column 3: Live Copilot & KPI */}
        <CopilotSidebar
          copilotFeedback={copilotFeedback}
          latency={latency}
          supervisorStats={supervisorStats}
          onApplySnippet={handleApplySnippet}
        />
      </div>

      {/* Custom User Creation Modal */}
      <CustomUserModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCreateCustomSession}
      />
    </div>
  );
}
