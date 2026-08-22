import React, { useRef, useEffect } from 'react';
import { Send, MessageSquarePlus } from 'lucide-react';

export default function ConversationCanvas({
  turns,
  initialMessage,
  activeCustomer,
  customerInput,
  setCustomerInput,
  agentInput,
  setAgentInput,
  isProcessing,
  onSendTurn,
  onOpenCustomModal,
}) {
  const chatTimelineRef = useRef(null);

  useEffect(() => {
    if (chatTimelineRef.current) {
      chatTimelineRef.current.scrollTop = chatTimelineRef.current.scrollHeight;
    }
  }, [turns, isProcessing]);

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      onSendTurn();
    }
  };

  const insertCustomerSample = (text) => {
    setCustomerInput(text);
  };

  const insertAgentDraft = (text) => {
    setAgentInput(text);
  };

  return (
    <main className="conversation-canvas">
      <div className="chat-header-bar">
        <span>Conversation Timeline &amp; Real-Time Transcript</span>
        <span>Channel: Live Chat</span>
      </div>

      <div className="chat-timeline" id="chat-messages" ref={chatTimelineRef}>
        {/* If no active ticket selected */}
        {!activeCustomer && (!turns || turns.length === 0) && (
          <div
            style={{
              textAlign: 'center',
              margin: 'auto',
              padding: '40px 20px',
              color: 'var(--text-subtle)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎫</div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--text-main)',
                marginBottom: '6px',
              }}
            >
              No Active Ticket Selected
            </div>
            <div style={{ fontSize: '12px', maxWidth: '320px', margin: '0 auto 16px auto', lineHeight: 1.4 }}>
              Create a custom customer ticket to start real-time AI coaching and sentiment analysis.
            </div>
            {onOpenCustomModal && (
              <button
                type="button"
                className="action-btn btn-new-ticket"
                onClick={onOpenCustomModal}
                style={{ padding: '6px 16px', margin: '0 auto' }}
              >
                <MessageSquarePlus size={14} />
                <span>+ Create Customer Ticket</span>
              </button>
            )}
          </div>
        )}

        {/* Initial message if no turns yet */}
        {activeCustomer && (!turns || turns.length === 0) && initialMessage && (
          <div className="timeline-msg customer">
            <div className="msg-avatar">
              {getInitials(activeCustomer?.name)}
            </div>
            <div className="msg-bubble-wrap">
              <div className="msg-header-info">
                {activeCustomer?.name || 'Customer'} • Just now
              </div>
              <div className="msg-content-box">{initialMessage}</div>
            </div>
          </div>
        )}

        {/* Turns history */}
        {turns &&
          turns.map((t, idx) => (
            <React.Fragment key={idx}>
              {/* Customer inbound message */}
              <div className="timeline-msg customer">
                <div className="msg-avatar">
                  {getInitials(activeCustomer?.name)}
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-header-info">
                    {activeCustomer?.name || 'Customer'} • {t.timestamp || 'Inbound'}
                  </div>
                  <div className="msg-content-box">{t.customer_message}</div>
                </div>
              </div>

              {/* Agent outbound message */}
              <div className="timeline-msg agent">
                <div className="msg-avatar">AG</div>
                <div className="msg-bubble-wrap">
                  <div className="msg-header-info">
                    Support Agent (You) • {t.timestamp || 'Sent'}
                  </div>
                  <div className="msg-content-box">{t.agent_message}</div>
                </div>
              </div>
            </React.Fragment>
          ))}
      </div>

      {/* Typing / Processing indicator */}
      {isProcessing && (
        <div style={{ padding: '0 20px' }}>
          <div className="typing-status" id="typing-indicator">
            <span>AI Copilot analyzing exchange in real-time...</span>
          </div>
        </div>
      )}

      {/* Message Composer Dock */}
      <div className="composer-dock">
        {/* Inbound Customer Samples & Agent Drafts */}
        <div className="quick-chips-row">
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
            Inbound:
          </span>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertCustomerSample(
                'I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.'
              )
            }
          >
            ⚠️ Double Charge
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertCustomerSample(
                'My package tracking shows delivered, but I have not received it yet. Can someone check?'
              )
            }
          >
            📦 Delayed Package
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertCustomerSample(
                'Hi, I wanted to ask if you offer volume discounts on additional user seats for our team.'
              )
            }
          >
            💼 Volume Discount
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertCustomerSample(
                'Thank you so much for the prompt refund! Everything looks resolved now.'
              )
            }
          >
            ⭐ Happy Customer
          </button>
        </div>

        <div className="quick-chips-row">
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
            Drafts:
          </span>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertAgentDraft(
                'I sincerely apologize for the confusion. I have verified the transaction and processed the refund immediately, which will reflect in 3-5 business days.'
              )
            }
          >
            🤝 Apologize &amp; Refund
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertAgentDraft(
                'I understand your concern. Let me check the courier tracking details right away to locate your shipment.'
              )
            }
          >
            🔍 Investigate Delivery
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertAgentDraft(
                'Thank you for asking! We offer an 18% volume discount for teams with 15+ seats on annual billing.'
              )
            }
          >
            💼 Explain Pricing
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertAgentDraft(
                'Thank you for reaching out! I am thrilled to hear that everything was resolved smoothly for you.'
              )
            }
          >
            🌟 Delight &amp; Confirm
          </button>
        </div>

        <div className="composer-inputs-grid">
          <div className="composer-input-block">
            <label className="composer-label" htmlFor="customer-input">
              Customer Message (Inbound)
            </label>
            <textarea
              id="customer-input"
              className="composer-textarea"
              placeholder="Paste or click an Inbound template..."
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="composer-input-block">
            <label className="composer-label" htmlFor="agent-input">
              Agent Response (Draft)
            </label>
            <textarea
              id="agent-input"
              className="composer-textarea"
              placeholder="Draft your response or click a Draft template..."
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="composer-footer">
          <span className="composer-tip">
            Press <strong>Ctrl + Enter</strong> to analyze &amp; send
          </span>
          <button
            className="submit-btn"
            id="send-btn"
            onClick={onSendTurn}
            disabled={isProcessing || !customerInput.trim() || !agentInput.trim()}
          >
            <Send size={13} />
            <span>Analyze &amp; Send Response</span>
          </button>
        </div>
      </div>
    </main>
  );
}
