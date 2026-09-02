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

      {/* ── Header Bar ── */}
      <div className="chat-header-bar">
        <div className="chat-header-left">
          <span className="chat-header-title">Conversation Timeline &amp; Live Transcript</span>
        </div>
        <div className="chat-header-right">
          {isAnalyzing && (
            <span className="hdr-badge hdr-badge--analyzing">
              <Loader2 size={11} className="spin-icon" />
              CareBot AI is analyzing…
            </span>
          )}
          {coachingReady && !isAnalyzing && (
            <span className="hdr-badge hdr-badge--ready">
              <CheckCircle2 size={11} />
              AI coaching ready
            </span>
          )}
          <span className="hdr-channel-tag">Channel: Live Chat</span>
        </div>
      </div>

      {/* ── Chat Timeline ── */}
      <div className="chat-timeline" id="chat-messages" ref={chatTimelineRef}>

        {/* Empty state */}
        {!activeCustomer && (!turns || turns.length === 0) && (
          <div className="timeline-empty">
            <div className="timeline-empty-icon">🎫</div>
            <div className="timeline-empty-title">No Active Ticket Selected</div>
            <div className="timeline-empty-sub">
              Create a new customer ticket. When the customer sends a message, CareBot AI will instantly
              analyze it and suggest a reply for you.
            </div>
            {onOpenCustomModal && (
              <button type="button" className="timeline-new-btn" onClick={onOpenCustomModal}>
                <MessageSquarePlus size={14} />
                Create Customer Ticket
              </button>
            )}
          </div>
        )}

        {/* Initial greeting message */}
        {activeCustomer && (!turns || turns.length === 0) && initialMessage && (
          <div className="msg-row msg-row--customer">
            <div className="msg-avatar msg-avatar--customer">{getInitials(activeCustomer?.name)}</div>
            <div className="msg-body">
              <div className="msg-meta">{activeCustomer?.name || 'Customer'} · Just now</div>
              <div className="msg-bubble msg-bubble--customer">{initialMessage}</div>
              <div className="msg-auto-hint">
                <CheckCircle2 size={11} /> Auto-filled in Step 1 below — AI is analyzing and will suggest your reply
              </div>
            </div>
          </div>
        )}

        {/* Conversation turns */}
        {turns && turns.map((t, idx) => (
          <React.Fragment key={idx}>
            {/* Customer message */}
            <div className="msg-row msg-row--customer">
              <div className="msg-avatar msg-avatar--customer">{getInitials(activeCustomer?.name)}</div>
              <div className="msg-body">
                <div className="msg-meta">{activeCustomer?.name || 'Customer'} · {t.timestamp || 'Inbound'}</div>
                <div className="msg-bubble msg-bubble--customer">{t.customer_message}</div>
              </div>
            </div>
            {/* Agent reply */}
            <div className="msg-row msg-row--agent">
              <div className="msg-body msg-body--agent">
                <div className="msg-meta msg-meta--agent">Support Agent (You) · {t.timestamp || 'Sent'}</div>
                <div className="msg-bubble msg-bubble--agent">{t.agent_message}</div>
                <div className="msg-coached-tag">
                  <Sparkles size={10} /> AI-coached reply
                </div>
              </div>
              <div className="msg-avatar msg-avatar--agent">AG</div>
            </div>
          </React.Fragment>
        ))}

        {/* AI analyzing indicator */}
        {isAnalyzing && (
          <div className="ai-thinking-row">
            <BrainCircuit size={14} className="spin-icon" style={{ color: 'var(--primary)' }} />
            <span>CareBot AI is reading the customer message and preparing your reply…</span>
          </div>
        )}
      </div>

      {/* ── Composer Dock ── */}
      <div className="composer-dock">

        {/* Step 1 — Customer Message */}
        <div className="composer-step">
          <div className="composer-step-header">
            <span className="step-badge step-badge--customer">Step 1 — Customer Message</span>
            <div className="quick-chips">
              <button className="quick-chip" onClick={() => setCustomerInput('I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.')}>⚠️ Double Charge</button>
              <button className="quick-chip" onClick={() => setCustomerInput('Hey, my payment is deducted but order has not been placed, I need my money back')}>💸 Payment Issue</button>
              <button className="quick-chip" onClick={() => setCustomerInput('My package tracking shows delivered, but I have not received it yet. Can someone check?')}>📦 Delivery</button>
              <button className="quick-chip" onClick={() => setCustomerInput('Hi, I wanted to ask if you offer volume discounts on additional user seats for our team.')}>💼 Pricing</button>
              <button className="quick-chip" onClick={() => setCustomerInput('Thank you so much for the prompt refund! Everything looks resolved now.')}>⭐ Happy</button>
            </div>
          </div>
          <textarea
            id="customer-input"
            className="composer-textarea composer-textarea--customer"
            placeholder="Paste or type customer message here… AI will instantly analyze and suggest your reply →"
            value={customerInput}
            onChange={(e) => setCustomerInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
        </div>

        {/* Status bar between steps */}
        <div className="composer-status-bar">
          {!customerInput.trim() && (
            <span className="status-idle">
              <BrainCircuit size={12} /> Waiting for customer message…
            </span>
          )}
          {customerInput.trim() && isAnalyzing && (
            <span className="status-analyzing">
              <Loader2 size={12} className="spin-icon" />
              AI is analyzing and generating your reply…
            </span>
          )}
          {customerInput.trim() && coachingReady && !isAnalyzing && (
            <span className="status-ready">
              <CheckCircle2 size={12} />
              AI coaching complete — reply auto-generated below. Review &amp; edit as needed, then send.
            </span>
          )}
        </div>

        {/* Step 2 — Agent Reply */}
        <div className="composer-step">
          <div className="composer-step-header">
            <span className={`step-badge ${coachingReady ? 'step-badge--agent-ready' : 'step-badge--agent'}`}>
              Step 2 — Your Reply {coachingReady ? '(AI-suggested ✓)' : '(waiting for AI…)'}
            </span>
            <div className="quick-chips">
              <button className="quick-chip quick-chip--agent" onClick={() => setAgentInput('I sincerely apologize for the inconvenience. I have reviewed your account and confirmed the issue — I will process the refund immediately. It will reflect within 3–5 business days.')}>🤝 Refund</button>
              <button className="quick-chip quick-chip--agent" onClick={() => setAgentInput('I apologize for the trouble. Could you please share your order ID so I can investigate this immediately?')}>🔍 Investigate</button>
              <button className="quick-chip quick-chip--agent" onClick={() => setAgentInput('Thank you for asking! We offer volume discounts — 15 seats gets 18% off, 25+ seats gets 22% off on annual billing.')}>💼 Pricing</button>
            </div>
          </div>
          <textarea
            id="agent-input"
            className={`composer-textarea ${coachingReady ? 'composer-textarea--coached' : 'composer-textarea--agent'}`}
            placeholder={coachingReady ? 'Review and edit the AI-suggested reply, then press Send…' : 'AI-suggested reply will appear here automatically…'}
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
        </div>

        {/* Footer / Send */}
        <div className="composer-footer">
          <span className="composer-hint">
            Press <strong>Ctrl + Enter</strong> to send instantly
          </span>
          <button
            id="send-btn"
            className={`send-reply-btn ${canSend ? 'send-reply-btn--ready' : ''}`}
            onClick={onSendTurn}
            disabled={!canSend}
          >
            {isProcessing ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
            <span>{isProcessing ? 'Sending…' : 'Send Reply'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
