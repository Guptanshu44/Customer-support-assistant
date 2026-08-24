import React, { useRef, useEffect } from 'react';
import { Send, MessageSquarePlus, BrainCircuit, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export default function ConversationCanvas({
  turns,
  initialMessage,
  activeCustomer,
  customerInput,
  setCustomerInput,
  agentInput,
  setAgentInput,
  isProcessing,
  isAnalyzing,
  coachingReady,
  onSendTurn,
  onOpenCustomModal,
}) {
  const chatTimelineRef = useRef(null);

  useEffect(() => {
    if (chatTimelineRef.current) {
      chatTimelineRef.current.scrollTop = chatTimelineRef.current.scrollHeight;
    }
  }, [turns, isProcessing, isAnalyzing]);

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); onSendTurn(); }
  };

  const canSend = !!customerInput.trim() && !!agentInput.trim() && !!activeCustomer && !isProcessing && !isAnalyzing;

  return (
    <main className="conversation-canvas">
      {/* Header */}
      <div className="chat-header-bar">
        <span>Conversation Timeline &amp; Live Transcript</span>
        <div className="chat-header-status">
          {isAnalyzing && (
            <span className="analyzing-badge">
              <Loader2 size={10} className="spin-icon" />
              CareBot AI is analyzing…
            </span>
          )}
          {coachingReady && !isAnalyzing && (
            <span className="coached-badge">
              <CheckCircle2 size={10} />
              AI coaching ready
            </span>
          )}
          <span className="channel-tag">Channel: Live Chat</span>
        </div>
      </div>

      {/* Chat timeline */}
      <div className="chat-timeline" id="chat-messages" ref={chatTimelineRef}>
        {/* No session selected */}
        {!activeCustomer && (!turns || turns.length === 0) && (
          <div className="empty-timeline-state">
            <div className="empty-state-icon">🎫</div>
            <div className="empty-state-title">No Active Ticket Selected</div>
            <div className="empty-state-sub">
              Create a new customer ticket. When the customer sends a message, CareBot AI will instantly analyze it and suggest a reply for you.
            </div>
            {onOpenCustomModal && (
              <button type="button" className="action-btn btn-new-ticket" onClick={onOpenCustomModal} style={{ padding: '7px 18px', margin: '8px auto 0' }}>
                <MessageSquarePlus size={14} />
                <span>+ Create Customer Ticket</span>
              </button>
            )}
          </div>
        )}

        {/* Initial greeting message */}
        {activeCustomer && (!turns || turns.length === 0) && initialMessage && (
          <div className="timeline-msg customer">
            <div className="msg-avatar">{getInitials(activeCustomer?.name)}</div>
            <div className="msg-bubble-wrap">
              <div className="msg-header-info">{activeCustomer?.name || 'Customer'} • Just now</div>
              <div className="msg-content-box">{initialMessage}</div>
              <div className="msg-hint">✅ Auto-filled in Step 1 below — AI is analyzing and will suggest your reply</div>
            </div>
          </div>
        )}

        {/* Conversation turns */}
        {turns && turns.map((t, idx) => (
          <React.Fragment key={idx}>
            <div className="timeline-msg customer">
              <div className="msg-avatar">{getInitials(activeCustomer?.name)}</div>
              <div className="msg-bubble-wrap">
                <div className="msg-header-info">{activeCustomer?.name || 'Customer'} • {t.timestamp || 'Inbound'}</div>
                <div className="msg-content-box">{t.customer_message}</div>
              </div>
            </div>
            <div className="timeline-msg agent">
              <div className="msg-avatar">AG</div>
              <div className="msg-bubble-wrap">
                <div className="msg-header-info">Support Agent (You) • {t.timestamp || 'Sent'}</div>
                <div className="msg-content-box">{t.agent_message}</div>
                <div className="msg-coach-badge">
                  <Sparkles size={9} /> AI-coached reply
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* AI analyzing indicator */}
        {isAnalyzing && (
          <div className="ai-analyzing-bubble">
            <BrainCircuit size={13} className="spin-icon" />
            <span>CareBot AI is reading the customer message and preparing your reply…</span>
          </div>
        )}
      </div>

      {/* Composer Dock */}
      <div className="composer-dock">

        {/* Step 1 — Customer Message */}
        <div className="composer-step-row">
          <div className="composer-step-header">
            <div className="composer-step-badge step-customer">Step 1 — Customer Message</div>
            <div className="quick-chips-inline">
              <button type="button" className="quick-chip" onClick={() => setCustomerInput('I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.')}>⚠️ Double Charge</button>
              <button type="button" className="quick-chip" onClick={() => setCustomerInput('Hey, my payment is deducted but order has not been placed, I need my money back')}>💸 Payment Issue</button>
              <button type="button" className="quick-chip" onClick={() => setCustomerInput('My package tracking shows delivered, but I have not received it yet. Can someone check?')}>📦 Delivery</button>
              <button type="button" className="quick-chip" onClick={() => setCustomerInput('Hi, I wanted to ask if you offer volume discounts on additional user seats for our team.')}>💼 Pricing</button>
              <button type="button" className="quick-chip" onClick={() => setCustomerInput('Thank you so much for the prompt refund! Everything looks resolved now.')}>⭐ Happy</button>
            </div>
          </div>
          <textarea
            id="customer-input"
            className="composer-textarea composer-textarea--customer"
            placeholder="Paste or type customer message here… AI will instantly analyze it and suggest your reply →"
            value={customerInput}
            onChange={(e) => setCustomerInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Auto-analysis status bar */}
        <div className="auto-coach-status-bar">
          {!customerInput.trim() && (
            <span className="auto-status-idle">
              <BrainCircuit size={11} /> Waiting for customer message…
            </span>
          )}
          {customerInput.trim() && isAnalyzing && (
            <span className="auto-status-analyzing">
              <Loader2 size={11} className="spin-icon" />
              AI is analyzing and generating your reply…
            </span>
          )}
          {customerInput.trim() && coachingReady && !isAnalyzing && (
            <span className="auto-status-ready">
              <CheckCircle2 size={11} />
              AI coaching complete — reply auto-generated below. Review &amp; edit as needed, then send.
            </span>
          )}
        </div>

        {/* Step 2 — Agent Reply (auto-filled) */}
        <div className="composer-step-row">
          <div className="composer-step-header">
            <div className={`composer-step-badge ${coachingReady ? 'step-agent step-agent--ready' : 'step-agent'}`}>
              Step 2 — Your Reply {coachingReady ? '(AI-suggested ✓)' : '(waiting for AI…)'}
            </div>
            <div className="quick-chips-inline">
              <button type="button" className="quick-chip chip-agent" onClick={() => setAgentInput('I sincerely apologize for the inconvenience. I have reviewed your account and confirmed the issue — I will process the refund immediately. It will reflect within 3–5 business days.')}>🤝 Refund</button>
              <button type="button" className="quick-chip chip-agent" onClick={() => setAgentInput('I apologize for the trouble. Could you please share your order ID so I can investigate this immediately and provide an accurate update?')}>🔍 Investigate</button>
              <button type="button" className="quick-chip chip-agent" onClick={() => setAgentInput('Thank you for asking! We offer volume discounts — 15 seats gets 18% off, 25+ seats gets 22% off on annual billing.')}>💼 Pricing</button>
            </div>
          </div>
          <textarea
            id="agent-input"
            className={`composer-textarea ${coachingReady ? 'composer-textarea--coached' : 'composer-textarea--agent'}`}
            placeholder={coachingReady ? 'Review and edit the AI-suggested reply, then press Send…' : 'AI-suggested reply will appear here automatically…'}
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="composer-footer">
          <span className="composer-tip">
            Press <strong>Ctrl + Enter</strong> to send instantly
          </span>
          <button
            className={`submit-btn ${canSend ? 'submit-btn--ready' : ''}`}
            id="send-btn"
            onClick={onSendTurn}
            disabled={!canSend}
          >
            {isProcessing ? <Loader2 size={13} className="spin-icon" /> : <Send size={13} />}
            <span>{isProcessing ? 'Sending…' : 'Send Reply'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
