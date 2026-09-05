import React, { useRef, useEffect, useState } from 'react';
import {
  Send, MessageSquarePlus, BrainCircuit, Sparkles, Loader2, CheckCircle2,
  PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Radio, AudioLines
} from 'lucide-react';

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

  // ── Voice Chat State ──
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [autoSpeakAI, setAutoSpeakAI] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [recordingTarget, setRecordingTarget] = useState(null); // 'customer' | 'agent' | null
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-scroll timeline
  useEffect(() => {
    if (chatTimelineRef.current) {
      chatTimelineRef.current.scrollTop = chatTimelineRef.current.scrollHeight;
    }
  }, [turns, isProcessing, isAnalyzing]);

  // Voice Call Duration Timer
  useEffect(() => {
    if (isVoiceCallActive) {
      timerRef.current = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallSeconds(0);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setRecordingTarget(null);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVoiceCallActive]);

  const formatCallTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleVoiceCall = () => {
    setIsVoiceCallActive((prev) => !prev);
  };

  // ── Speech-to-Text (STT) ──
  const startSpeechRecognition = (target) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by this browser. Please use Google Chrome or Microsoft Edge for microphone speech input.');
      return;
    }

    if (recordingTarget === target) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setRecordingTarget(null);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setRecordingTarget(target);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (target === 'customer') {
          setCustomerInput(transcript);
        } else {
          setAgentInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        setRecordingTarget(null);
      };

      recognition.onend = () => {
        setRecordingTarget(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setRecordingTarget(null);
    }
  };

  // ── Text-to-Speech (TTS) ──
  const handleSpeakText = (text, id = null) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (speakingMsgId === id) {
        setSpeakingMsgId(null);
        return;
      }
    }

    if (!text || speakerMuted) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    setSpeakingMsgId(id || 'agent-input');

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak AI reply in voice call mode if enabled
  useEffect(() => {
    if (isVoiceCallActive && autoSpeakAI && coachingReady && agentInput && !speakerMuted) {
      handleSpeakText(agentInput, 'auto-ai');
    }
  }, [coachingReady, isVoiceCallActive]);

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      onSendTurn();
    }
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
          {/* Voice Chat Toggle Button */}
          <button
            id="voice-call-toggle-btn"
            type="button"
            className={`voice-call-btn ${isVoiceCallActive ? 'voice-call-btn--active' : ''}`}
            onClick={toggleVoiceCall}
            title={isVoiceCallActive ? 'End current voice call' : 'Start live voice call session'}
          >
            {isVoiceCallActive ? <PhoneOff size={13} /> : <PhoneCall size={13} />}
            <span>{isVoiceCallActive ? 'End Voice Call' : 'Start Voice Call'}</span>
          </button>

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

          <span className={`hdr-channel-tag ${isVoiceCallActive ? 'hdr-channel-tag--voice' : ''}`}>
            {isVoiceCallActive ? (
              <>
                <Radio size={11} className="pulse-radio-icon" /> Channel: Live Voice Call
              </>
            ) : (
              'Channel: Live Chat'
            )}
          </span>
        </div>
      </div>

      {/* ── Live Voice Call HUD / Active Banner ── */}
      {isVoiceCallActive && (
        <div className="voice-call-hud" id="voice-call-banner">
          <div className="voice-hud-left">
            <span className="voice-live-indicator">
              <span className="voice-live-dot" /> LIVE CALL
            </span>
            <span className="voice-timer">{formatCallTime(callSeconds)}</span>
            <span className="voice-stream-label">HD Audio Stream · WebRTC Active</span>
          </div>

          {/* Equalizer Frequency Waveform */}
          <div className="voice-waveform-wrap" title="Audio frequency activity">
            <div className={`waveform-bars ${isMuted ? 'waveform-bars--muted' : ''}`}>
              <span className="w-bar bar-1" />
              <span className="w-bar bar-2" />
              <span className="w-bar bar-3" />
              <span className="w-bar bar-4" />
              <span className="w-bar bar-5" />
              <span className="w-bar bar-6" />
              <span className="w-bar bar-7" />
              <span className="w-bar bar-8" />
              <span className="w-bar bar-9" />
              <span className="w-bar bar-10" />
              <span className="w-bar bar-11" />
              <span className="w-bar bar-12" />
            </div>
            <span className="voice-speaker-status">
              {recordingTarget === 'customer'
                ? 'Customer Speaking…'
                : recordingTarget === 'agent'
                ? 'Agent Speaking…'
                : speakingMsgId
                ? 'TTS Audio Playing…'
                : isMuted
                ? 'Mic Muted'
                : 'Listening for Speech…'}
            </span>
          </div>

          {/* Voice Controls Toolbar */}
          <div className="voice-hud-controls">
            <button
              type="button"
              className={`hud-ctrl-btn ${isMuted ? 'hud-ctrl-btn--muted' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Agent Microphone' : 'Mute Agent Microphone'}
            >
              {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
              <span>{isMuted ? 'Muted' : 'Mic On'}</span>
            </button>

            <button
              type="button"
              className={`hud-ctrl-btn ${speakerMuted ? 'hud-ctrl-btn--muted' : ''}`}
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setSpeakerMuted(!speakerMuted);
              }}
              title={speakerMuted ? 'Unmute Audio Speaker' : 'Mute Audio Speaker'}
            >
              {speakerMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{speakerMuted ? 'Muted' : 'Sound'}</span>
            </button>

            <button
              type="button"
              className={`hud-ctrl-btn ${autoSpeakAI ? 'hud-ctrl-btn--active' : ''}`}
              onClick={() => setAutoSpeakAI(!autoSpeakAI)}
              title="Automatically read aloud AI suggested replies during voice call"
            >
              <Sparkles size={13} />
              <span>Auto-Speak AI</span>
            </button>

            <button
              type="button"
              className="hud-ctrl-btn hud-ctrl-btn--hangup"
              onClick={toggleVoiceCall}
              title="End Voice Call"
            >
              <PhoneOff size={13} />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Chat Timeline ── */}
      <div className="chat-timeline" id="chat-messages" ref={chatTimelineRef}>

        {/* Empty state */}
        {!activeCustomer && (!turns || turns.length === 0) && (
          <div className="timeline-empty">
            <div className="timeline-empty-icon">🎫</div>
            <div className="timeline-empty-title">No Active Ticket Selected</div>
            <div className="timeline-empty-sub">
              Create a new customer ticket or select a customer from the sidebar. When the customer
              sends a message or speaks via voice chat, CareBot AI will instantly analyze it and
              suggest your response.
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
              <div className="msg-meta">
                <span>{activeCustomer?.name || 'Customer'} · Just now</span>
                <button
                  type="button"
                  className="msg-speak-btn"
                  onClick={() => handleSpeakText(initialMessage, 'init-msg')}
                  title="Read aloud"
                >
                  <Volume2 size={11} />
                </button>
              </div>
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
                <div className="msg-meta">
                  <span>{activeCustomer?.name || 'Customer'} · {t.timestamp || 'Inbound'}</span>
                  {isVoiceCallActive && (
                    <span className="msg-voice-tag">
                      <AudioLines size={10} /> Voice Audio
                    </span>
                  )}
                  <button
                    type="button"
                    className="msg-speak-btn"
                    onClick={() => handleSpeakText(t.customer_message, `cust-${idx}`)}
                    title="Read message aloud"
                  >
                    <Volume2 size={11} />
                  </button>
                </div>
                <div className="msg-bubble msg-bubble--customer">{t.customer_message}</div>
              </div>
            </div>

            {/* Agent reply */}
            <div className="msg-row msg-row--agent">
              <div className="msg-body msg-body--agent">
                <div className="msg-meta msg-meta--agent">
                  <button
                    type="button"
                    className="msg-speak-btn"
                    onClick={() => handleSpeakText(t.agent_message, `agent-${idx}`)}
                    title="Read reply aloud"
                  >
                    <Volume2 size={11} />
                  </button>
                  {isVoiceCallActive && (
                    <span className="msg-voice-tag">
                      <AudioLines size={10} /> Voice Spoken
                    </span>
                  )}
                  <span>Support Agent (You) · {t.timestamp || 'Sent'}</span>
                </div>
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

            {/* Speech to text mic button */}
            <button
              type="button"
              className={`mic-action-btn ${recordingTarget === 'customer' ? 'mic-action-btn--active' : ''}`}
              onClick={() => startSpeechRecognition('customer')}
              title={recordingTarget === 'customer' ? 'Stop listening' : 'Speak customer query (Microphone Speech-to-Text)'}
            >
              {recordingTarget === 'customer' ? <MicOff size={12} /> : <Mic size={12} />}
              <span>{recordingTarget === 'customer' ? 'Listening…' : 'Voice Input'}</span>
            </button>

            {/* Expanded Customer Inbound Presets (9 items) */}
            <div className="quick-chips-scroll">
              <button
                type="button"
                className="quick-chip quick-chip--alert"
                onClick={() => setCustomerInput("I didn't like your service, I want to cancel my order immediately.")}
                title="Customer expressing dissatisfaction and requesting order cancellation"
              >
                🛑 Cancel Order
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput('Hey, my payment is deducted but order has not been placed, I need my money back')}
                title="Payment deducted without order placement"
              >
                💸 Payment Issue
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput('I just noticed my account was debited twice for the renewal subscription! Please fix this immediately.')}
                title="Duplicate charge on renewal"
              >
                ⚠️ Double Charge
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput('My package tracking shows delivered, but I have not received it yet. Can someone check?')}
                title="Missing parcel / tracking discrepancy"
              >
                📦 Delivery Delay
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput("I cannot log into my account dashboard after the SSO update, password reset link isn't arriving.")}
                title="SSO authentication / login lockout"
              >
                🔑 SSO / Login
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput('Hi, I wanted to ask if you offer volume discounts on additional user seats for our team.')}
                title="Volume licensing & pricing inquiries"
              >
                💼 Pricing &amp; Seats
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput("The item I received is defective and doesn't match description. How can I return or replace it?")}
                title="Defective item return & replacement request"
              >
                🔄 Return &amp; Refund
              </button>

              <button
                type="button"
                className="quick-chip"
                onClick={() => setCustomerInput('We are hitting our workspace usage limits. How quickly can we upgrade to the Enterprise tier?')}
                title="Tier upgrade & quota expansion"
              >
                ⚡ Upgrade Plan
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--success"
                onClick={() => setCustomerInput('Thank you so much for the prompt refund! Everything looks resolved now.')}
                title="Customer expressing gratitude and resolution"
              >
                ⭐ Resolved / Thanks
              </button>
            </div>
          </div>

          <textarea
            id="customer-input"
            className="composer-textarea composer-textarea--customer"
            placeholder="Paste, type, or click 'Voice Input' to speak customer message… AI will instantly analyze and suggest your reply →"
            value={customerInput}
            onChange={(e) => setCustomerInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        </div>

        {/* Status bar between steps */}
        <div className="composer-status-bar">
          {!customerInput.trim() && (
            <span className="status-idle">
              <BrainCircuit size={12} /> Waiting for customer message or voice input…
            </span>
          )}
          {customerInput.trim() && isAnalyzing && (
            <span className="status-analyzing">
              <Loader2 size={12} className="spin-icon" />
              AI is analyzing customer intent and generating coached reply…
            </span>
          )}
          {customerInput.trim() && coachingReady && !isAnalyzing && (
            <span className="status-ready">
              <CheckCircle2 size={12} />
              AI coaching complete — suggested reply populated below. Review, edit, or speak aloud before sending.
            </span>
          )}
        </div>

        {/* Step 2 — Agent Reply */}
        <div className="composer-step">
          <div className="composer-step-header">
            <span className={`step-badge ${coachingReady ? 'step-badge--agent-ready' : 'step-badge--agent'}`}>
              Step 2 — Your Reply {coachingReady ? '(AI-suggested ✓)' : '(waiting for AI…)'}
            </span>

            {/* Agent Mic Dictation button */}
            <button
              type="button"
              className={`mic-action-btn ${recordingTarget === 'agent' ? 'mic-action-btn--active' : ''}`}
              onClick={() => startSpeechRecognition('agent')}
              title={recordingTarget === 'agent' ? 'Stop voice dictation' : 'Dictate your response (Microphone Speech-to-Text)'}
            >
              {recordingTarget === 'agent' ? <MicOff size={12} /> : <Mic size={12} />}
              <span>{recordingTarget === 'agent' ? 'Dictating…' : 'Voice Dictate'}</span>
            </button>

            {/* Text to speech playback button */}
            <button
              type="button"
              className={`speak-action-btn ${speakingMsgId === 'agent-input' ? 'speak-action-btn--active' : ''}`}
              onClick={() => handleSpeakText(agentInput, 'agent-input')}
              disabled={!agentInput.trim()}
              title="Speak reply aloud using voice synthesis"
            >
              {speakingMsgId === 'agent-input' ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{speakingMsgId === 'agent-input' ? 'Stop Audio' : 'Speak Reply'}</span>
            </button>

            {/* Expanded Agent Resolution Presets (8 items) */}
            <div className="quick-chips-scroll">
              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput("I sincerely apologize for the unsatisfactory experience. I can initiate the cancellation right away, or offer an immediate $25 account credit and a 1-month billing pause so our senior team can make this right for you. Which would you prefer?")}
                title="De-escalate, offer retention options or proceed with cancellation"
              >
                🛑 Cancel &amp; Retention
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput('I sincerely apologize for the inconvenience. I have checked your transaction log, verified the failed attempt, and initiated a full refund back to your original payment method (3–5 business days).')}
                title="Confirm refund processing timeline"
              >
                💸 Refund Processed
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput('I apologize for the delivery trouble. Could you please confirm your Order ID and delivery pin code? I will immediately place a priority trace with our logistics partner.')}
                title="Request order ID and trace logistics"
              >
                🔍 Investigate &amp; Trace
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput('I have verified your account ownership and sent a secure one-time password reset link to your registered email address, and cleared active session locks.')}
                title="SSO / password link dispatch"
              >
                🔑 Access &amp; SSO Reset
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput('Thank you for asking! We offer volume discounts — 15 seats gets 18% off, 25+ seats gets 22% off on annual billing. Shall I set this up for your team today?')}
                title="Provide tiered seat pricing"
              >
                💼 Volume Pricing
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput("I'm so sorry about the damaged item! I have emailed you a prepaid return shipping label and dispatched an express replacement order today.")}
                title="Issue return shipping label and replacement"
              >
                🔄 Prepaid Return
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput("I've upgraded your organization to our Enterprise tier. All additional seat quotas, priority SLA, and custom domain features are unlocked immediately.")}
                title="Instant tier upgrade confirmation"
              >
                ⚡ Instant Upgrade
              </button>

              <button
                type="button"
                className="quick-chip quick-chip--agent"
                onClick={() => setAgentInput("You're very welcome! I'm thrilled we could get this sorted out for you today. Please reach out anytime if you need anything else! 🌟")}
                title="Warm closing and invitation for future support"
              >
                ⭐ Warm Closure
              </button>
            </div>
          </div>

          <textarea
            id="agent-input"
            className={`composer-textarea ${coachingReady ? 'composer-textarea--coached' : 'composer-textarea--agent'}`}
            placeholder={coachingReady ? 'Review and edit the AI-suggested reply, or dictate via microphone, then press Send…' : 'AI-suggested reply will appear here automatically…'}
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
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
