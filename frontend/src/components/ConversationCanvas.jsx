import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

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

  const insertQuickReply = (text) => {
    setAgentInput(text);
  };

  return (
    <main className="conversation-canvas">
      <div className="chat-header-bar">
        <span>Conversation Timeline &amp; Real-Time Transcript</span>
        <span>Channel: Live Chat</span>
      </div>

      <div className="chat-timeline" id="chat-messages" ref={chatTimelineRef}>
        {/* Initial message if no turns yet */}
        {(!turns || turns.length === 0) && initialMessage && (
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
        <div className="quick-chips-row">
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginRight: 4 }}>
            Quick Templates:
          </span>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertQuickReply(
                'I apologize for the confusion. Let me verify the transaction and process the refund immediately.'
              )
            }
          >
            Apologize &amp; Verify
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertQuickReply(
                'Thank you for reaching out! I am thrilled to hear that everything was resolved smoothly.'
              )
            }
          >
            Delight &amp; Assist
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() =>
              insertQuickReply(
                'I have checked your account and confirmed the update. A confirmation has been sent to your email.'
              )
            }
          >
            Confirm Update
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
              placeholder="Paste or type customer's message..."
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
              placeholder="Draft your response to the customer..."
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
