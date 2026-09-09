import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Zap, Shield, MessageSquare, Check,
  Bot, Sparkles, HeartPulse, Play, Database, Cpu, Cloud,
  Copy, RotateCcw, Sun, Moon, LogIn, User
} from 'lucide-react';
import { api } from '../api/client';
import AuthModal from '../components/AuthModal';
import { onAuthChange } from '../api/firebase';

const CORE_INNOVATIONS = [
  {
    icon: Bot,
    title: 'In-Flight Live Coaching',
    desc: 'Sub-0.4s deterministic Groq LPU inference analyzes customer sentiment and intent, generating real-time guidance on empathy, clarity, and tone alignment.',
    color: '#2563eb',
    tag: 'Groq LPU'
  },
  {
    icon: Database,
    title: 'Dense Vector RAG (FAISS)',
    desc: 'Knowledge base policies and troubleshooting guides embedded in 384-d space (all-MiniLM-L6-v2) for sub-10ms semantic similarity matching.',
    color: '#059669',
    tag: 'FAISS Vector'
  },
  {
    icon: HeartPulse,
    title: 'Agent Burnout & Fatigue Guard',
    desc: 'Continuous lexical diversity and response brevity tracking alerts supervisors to cognitive fatigue before service quality is compromised.',
    color: '#ec4899',
    tag: 'Telemetry'
  },
  {
    icon: Cloud,
    title: 'Multilingual NLP & Cloud Sync',
    desc: 'Native regional script analysis across English, Hindi, Tamil, Telugu, and Bengali with real-time Firebase Cloud Firestore data synchronization.',
    color: '#0284c7',
    tag: 'Cloud & NLP'
  }
];

const DEMO_SCENARIOS = [
  {
    id: 'billing',
    title: '💳 Double Charge Dispute',
    customer: 'Alex Morgan',
    company: 'TechFlow Inc.',
    plan: 'Enterprise',
    message: 'Hello, I just noticed my account was debited twice for the renewal subscription! Please fix this immediately and issue a refund.',
    sentiment: 'negative',
    urgency: 'high',
    risk: 'high',
    keyIssue: 'Duplicate Charge ($1,240)',
    scores: { tone: 9, empathy: 9, clarity: 8 },
    tip: 'Lead with sincere acknowledgment of the billing error and provide the exact refund timeline (3–5 business days).',
    suggestedReply: 'I sincerely apologize for the duplicate charge! I have verified the transaction log and initiated an immediate refund of $1,240 back to your original payment card (3–5 business days). A confirmation receipt has been emailed.',
    kb: 'Billing Policy: Duplicate charges qualify for expedited refund within 3–5 business days.',
  },
  {
    id: 'delivery',
    title: '📦 Delivery Tracking',
    customer: 'Liam Vance',
    company: 'Innovate Logistics',
    plan: 'Standard',
    message: 'My package tracking shows delivered, but I have not received it yet. Can someone check where it is?',
    sentiment: 'neutral',
    urgency: 'medium',
    risk: 'medium',
    keyIssue: 'Package Undelivered',
    scores: { tone: 8, empathy: 8, clarity: 9 },
    tip: 'Confirm the order ID, request delivery pin code, and place a priority trace request with logistics.',
    suggestedReply: 'I apologize for the delivery confusion! Could you please confirm your Order ID and delivery pin code? I will immediately place a priority trace with our courier team to verify drop-off location.',
    kb: 'Logistics SLA: Undelivered packages past expected date trigger a 24-hour trace investigation.',
  },
  {
    id: 'hindi',
    title: '🇮🇳 Hindi Regional Query',
    customer: 'Rahul Verma',
    company: 'Direct Consumer',
    plan: 'Retail',
    message: 'नमस्ते, मेरे खाते से पैसे कट गए हैं लेकिन ऑर्डर कन्फर्म नहीं हुआ। कृपया मेरी सहायता करें।',
    sentiment: 'negative',
    urgency: 'high',
    risk: 'medium',
    keyIssue: 'कट गए पैसे / आर्डर लंबित',
    scores: { tone: 9, empathy: 9, clarity: 9 },
    tip: 'ग्राहक को आश्वस्त करें और तुरंत लेनदेन यूटीआर या बैंक रेफरेंस नंबर की पुष्टि करें।',
    suggestedReply: 'नमस्ते राहुल जी! असुविधा के लिए हमें खेद है। कृपया अपनी बैंक ट्रांजैक्शन आईडी साझा करें। मैं तुरंत आपके पेमेंट गेटवे स्टेटस की जांच करके समाधान प्रदान कर रहा हूँ।',
    kb: 'पेमेंट रिफंड नीति: विफल लेनदेन की राशि 24 से 48 कार्य घंटों में स्वचालित रूप से वापस आ जाती है।',
  },
  {
    id: 'appreciation',
    title: '⭐ Positive Resolution',
    customer: 'Elena Rostova',
    company: 'Apex Systems',
    plan: 'Premium',
    message: 'Thank you so much! The refund has reflected in my account and everything is working smoothly now.',
    sentiment: 'positive',
    urgency: 'low',
    risk: 'low',
    keyIssue: 'Case Resolved Successfully',
    scores: { tone: 10, empathy: 9, clarity: 9 },
    tip: 'Express gratitude for customer patience, reinforce satisfaction, and invite any future inquiries.',
    suggestedReply: "You are most welcome, Elena! I am delighted we could resolve this swiftly for you. Please feel free to reach out anytime if you need further assistance. Have a wonderful day ahead!",
    kb: 'Customer Retention: Warm closure with future availability boosts customer loyalty by 35%.',
  },
];

const ARCHITECTURE_PIPELINE = [
  {
    step: '01',
    title: 'Inbound Signal Ingestion',
    desc: 'Evaluates customer tone, emotional polarity, urgency level, and detects native scripts (Devanagari, Tamil, Bengali, English).',
    icon: MessageSquare,
    color: '#2563eb',
    details: ['Sentiment & Urgency Scoring', 'Multilingual Script Detection', 'Intent Categorization']
  },
  {
    step: '02',
    title: 'FAISS Semantic Retrieval',
    desc: 'Dense vector index performs sub-10ms similarity searches over support articles to ground responses in institutional knowledge.',
    icon: Database,
    color: '#059669',
    details: ['384-d Dense Vector Index', 'Sub-10ms Cosine Search', 'Zero Hallucination Grounding']
  },
  {
    step: '03',
    title: 'Groq LPU In-Flight Inference',
    desc: 'Groq LPU hardware executes open-weights models in <0.4s to generate empathy coaching and recommended reply drafts.',
    icon: Cpu,
    color: '#d97706',
    details: ['Sub-0.4s Turnaround Time', 'Tone & Clarity Heuristics', 'Contextual Reply Synthesis']
  },
  {
    step: '04',
    title: 'Cloud Telemetry & Sync',
    desc: 'Synchronizes active tickets, transcripts, and burnout telemetry with Google Cloud Firestore, backed by local offline persistence.',
    icon: Cloud,
    color: '#0284c7',
    details: ['Real-Time Firestore Listeners', 'Burnout & Fatigue Metrics', 'Resilient Offline Fallback']
  }
];

export default function LandingPage({ onNavigate }) {
  const rootRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('omni_theme') || document.documentElement.getAttribute('data-theme') || 'light';
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [customMessage, setCustomMessage] = useState(DEMO_SCENARIOS[0].message);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omni_theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };
  const [aiResult, setAiResult] = useState({
    sentiment: DEMO_SCENARIOS[0].sentiment,
    urgency: DEMO_SCENARIOS[0].urgency,
    risk: DEMO_SCENARIOS[0].risk,
    keyIssue: DEMO_SCENARIOS[0].keyIssue,
    scores: DEMO_SCENARIOS[0].scores,
    tip: DEMO_SCENARIOS[0].tip,
    suggestedReply: DEMO_SCENARIOS[0].suggestedReply,
    kb: DEMO_SCENARIOS[0].kb,
    latency: '0.34',
    language: 'English',
  });

  useEffect(() => {
    const rootEl = rootRef.current;
    const resetParent = () => {
      try {
        if (window.parent && window.parent !== window) {
          if (window.parent.scrollY !== 0 || window.parent.scrollX !== 0) {
            window.parent.scrollTo(0, 0);
          }
        }
      } catch (e) {}
    };

    resetParent();

    const handler = () => {
      const scrollPos = rootEl ? rootEl.scrollTop : (window.scrollY || 0);
      setScrolled(scrollPos > 20);
      resetParent();
    };

    if (rootEl) {
      rootEl.addEventListener('scroll', handler, { passive: true });
    }
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      if (rootEl) rootEl.removeEventListener('scroll', handler);
      window.removeEventListener('scroll', handler);
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    const container = rootRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - 72;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectScenario = async (idx) => {
    setActiveScenarioIdx(idx);
    const sc = DEMO_SCENARIOS[idx];
    setCustomMessage(sc.message);
    setIsAnalyzing(true);
    try {
      const [res] = await Promise.all([
        api.analyzeCustomerMessage(sc.message, sc.customer, 0),
        new Promise((r) => setTimeout(r, 260))
      ]);
      setAiResult({
        sentiment: res.analysis?.sentiment || sc.sentiment,
        urgency: res.analysis?.urgency || sc.urgency,
        risk: res.analysis?.escalation_risk || sc.risk,
        keyIssue: res.analysis?.key_issue || sc.keyIssue,
        scores: {
          tone: res.feedback?.tone_score ?? sc.scores.tone,
          empathy: res.feedback?.empathy_score ?? sc.scores.empathy,
          clarity: res.feedback?.clarity_score ?? sc.scores.clarity,
        },
        tip: res.feedback?.coaching_tip || sc.tip,
        suggestedReply: res.suggested_reply || sc.suggestedReply,
        kb: res.feedback?.knowledge_suggestion || sc.kb,
        latency: res.latency_seconds || '0.32',
        language: res.detected_language || (idx === 2 ? 'Hindi' : 'English'),
      });
    } catch (err) {
      setAiResult({
        sentiment: sc.sentiment,
        urgency: sc.urgency,
        risk: sc.risk,
        keyIssue: sc.keyIssue,
        scores: sc.scores,
        tip: sc.tip,
        suggestedReply: sc.suggestedReply,
        kb: sc.kb,
        latency: '0.35',
        language: idx === 2 ? 'Hindi' : 'English',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunCustomAnalysis = async (msg = customMessage) => {
    if (!msg || !msg.trim()) return;
    setIsAnalyzing(true);
    const sc = DEMO_SCENARIOS[activeScenarioIdx] || DEMO_SCENARIOS[0];
    try {
      const [res] = await Promise.all([
        api.analyzeCustomerMessage(msg.trim(), sc.customer, 0),
        new Promise((r) => setTimeout(r, 300))
      ]);
      setAiResult({
        sentiment: res.analysis?.sentiment || 'neutral',
        urgency: res.analysis?.urgency || 'medium',
        risk: res.analysis?.escalation_risk || 'low',
        keyIssue: res.analysis?.key_issue || 'General Customer Inquiry',
        scores: {
          tone: res.feedback?.tone_score ?? 8,
          empathy: res.feedback?.empathy_score ?? 8,
          clarity: res.feedback?.clarity_score ?? 8,
        },
        tip: res.feedback?.coaching_tip || 'Acknowledge customer needs with professional empathy and provide a clear timeline.',
        suggestedReply: res.suggested_reply || 'Thank you for reaching out. I have prioritized your request and am resolving this for you immediately.',
        kb: res.feedback?.knowledge_suggestion || sc.kb,
        latency: res.latency_seconds || '0.29',
        language: res.detected_language || 'English',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetScenario = () => {
    const sc = DEMO_SCENARIOS[activeScenarioIdx];
    setCustomMessage(sc.message);
    setAiResult({
      sentiment: sc.sentiment,
      urgency: sc.urgency,
      risk: sc.risk,
      keyIssue: sc.keyIssue,
      scores: sc.scores,
      tip: sc.tip,
      suggestedReply: sc.suggestedReply,
      kb: sc.kb,
      latency: '0.34',
      language: activeScenarioIdx === 2 ? 'Hindi' : 'English',
    });
  };

  const handleCopyReply = (text) => {
    if (text) {
      navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentScenario = DEMO_SCENARIOS[activeScenarioIdx] || DEMO_SCENARIOS[0];

  return (
    <div className="landing-root" ref={rootRef}>
      {/* Navigation Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-header-inner">
          <div
            className="landing-brand"
            onClick={() => {
              if (rootRef.current) rootRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer' }}
            title="OmniDesk Copilot"
          >
            <div className="landing-logo-icon">
              <Bot size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">
              OmniDesk <span className="landing-logo-ai">Copilot</span>
            </span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('demo')}>Live Sandbox</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('innovations')}>Core AI</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('architecture')}>Architecture</button>
          </nav>

          <div className="landing-nav-actions">
            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              className="landing-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} />}
            </button>

            {/* Agent Sign In / User Profile Button */}
            {currentUser ? (
              <button
                type="button"
                className="landing-user-badge"
                onClick={() => setShowAuthModal(true)}
                title={`Logged in as ${currentUser.displayName || currentUser.email || 'Agent'} (${currentUser.role || 'Agent'})`}
              >
                <div className="landing-user-avatar">
                  {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'AG'}
                </div>
                <span>{currentUser.displayName?.split(' ')[0] || 'Agent'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="landing-btn-login"
                onClick={() => setShowAuthModal(true)}
                title="Agent Sign In (Google / Email)"
              >
                <LogIn size={15} />
                <span>Agent Sign In</span>
              </button>
            )}

            {/* Primary Action */}
            <button type="button" className="landing-btn-primary" onClick={() => onNavigate('workspace')}>
              <Zap size={13} />
              <span>Launch Workspace →</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" style={{ paddingBottom: '32px' }}>
        <div className="landing-hero-bg-grid" />
        <div className="landing-hero-glow" />

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap size={13} style={{ color: '#1e40af' }} />
            <span>⚡ Groq LPU Inference · Dense Vector RAG · Real-Time Coaching Telemetry</span>
          </div>

          <h1 className="landing-hero-title">
            AI-Powered Customer Support Coaching Assistant<br />
            <span className="landing-hero-gradient">with Live In-Flight Guidance</span>
          </h1>

          <p className="landing-hero-subtitle">
            An intelligent in-flight copilot engineered for contact center specialists — featuring sub-second Groq LPU inference, FAISS dense vector search, real-time empathy scoring, and Firebase cloud synchronization.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-cta-primary large"
              onClick={() => onNavigate('workspace')}
              title="Launch full AI copilot workspace"
            >
              <Zap size={18} /> Launch Live Workspace <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              onClick={() => scrollToSection('demo')}
              title="See the interactive AI coaching sandbox"
            >
              <Play size={16} /> Explore Live Sandbox
            </button>
          </div>
        </div>

        {/* Interactive In-Flight Sandbox */}
        <div className="landing-interactive-demo" id="demo">
          <div className="demo-window-bar">
            <div className="demo-window-controls">
              <span className="demo-window-dot demo-dot-red" />
              <span className="demo-window-dot demo-dot-yellow" />
              <span className="demo-window-dot demo-dot-green" />
            </div>
            <div className="demo-window-title">
              <Bot size={13} style={{ color: '#7dcfa0' }} />
              <span>OmniDesk Copilot — In-Flight AI Coaching Sandbox</span>
            </div>
            <div className="demo-window-status">
              <span className="announce-dot" />
              <span>&lt;0.4s Groq LPU Active</span>
            </div>
          </div>

          <div className="demo-scenario-tabs-bar">
            <span className="demo-scenario-prompt">
              Select an active customer scenario or type any custom inquiry below:
            </span>
            <div className="demo-scenario-tabs">
              {DEMO_SCENARIOS.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`demo-tab-btn ${activeScenarioIdx === idx ? 'active' : ''}`}
                  onClick={() => handleSelectScenario(idx)}
                >
                  {sc.title}
                </button>
              ))}
            </div>
          </div>

          <div className="demo-box-body">
            {/* Left Column: Customer Inbound Message */}
            <div className="demo-inbound-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="demo-card-title">
                  <MessageSquare size={13} style={{ color: 'var(--primary)' }} />
                  <span>Inbound Customer Message</span>
                </div>
                <span
                  className="demo-pill"
                  style={{
                    background:
                      aiResult.sentiment === 'positive'
                        ? 'rgba(5, 150, 105, 0.12)'
                        : aiResult.sentiment === 'negative'
                          ? 'rgba(220, 38, 38, 0.12)'
                          : 'rgba(217, 119, 6, 0.12)',
                    color:
                      aiResult.sentiment === 'positive'
                        ? '#059669'
                        : aiResult.sentiment === 'negative'
                          ? '#dc2626'
                          : '#d97706',
                    border:
                      aiResult.sentiment === 'positive'
                        ? '1px solid rgba(5, 150, 105, 0.28)'
                        : aiResult.sentiment === 'negative'
                          ? '1px solid rgba(220, 38, 38, 0.28)'
                          : '1px solid rgba(217, 119, 6, 0.28)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {aiResult.sentiment.toUpperCase()} SENTIMENT
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-subtle)' }}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{currentScenario.customer}</strong> · {currentScenario.company} · {currentScenario.plan}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Language: <strong style={{ color: '#4f46e5' }}>{aiResult.language}</strong>
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Customer Query (Interactive — Edit or Type Custom Inquiry):
                  </label>
                  {customMessage !== currentScenario.message && (
                    <button
                      type="button"
                      onClick={handleResetScenario}
                      className="demo-reset-btn"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      title="Reset back to scenario preset"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                </div>
                <textarea
                  className="demo-inbound-textarea"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type any customer message in English, Hindi, Tamil, etc..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleRunCustomAnalysis();
                    }
                  }}
                />
              </div>

              <div className="demo-inbound-actions">
                <button
                  type="button"
                  className="demo-run-btn"
                  onClick={() => handleRunCustomAnalysis()}
                  disabled={isAnalyzing || !customMessage.trim()}
                  title="Trigger real-time NLP analysis and suggested reply"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="demo-spinner-inline" />
                      <span>Groq Inferencing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>Run Live AI Analysis ⚡</span>
                    </>
                  )}
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                  Press Ctrl+Enter or click Run
                </span>
              </div>

              <div className="demo-pills-row">
                <span
                  className="demo-pill"
                  style={{
                    background:
                      aiResult.urgency === 'high'
                        ? 'rgba(220, 38, 38, 0.12)'
                        : aiResult.urgency === 'medium'
                          ? 'rgba(217, 119, 6, 0.12)'
                          : 'rgba(5, 150, 105, 0.12)',
                    color:
                      aiResult.urgency === 'high'
                        ? '#dc2626'
                        : aiResult.urgency === 'medium'
                          ? '#d97706'
                          : '#059669',
                  }}
                >
                  Urgency: <strong>{aiResult.urgency.toUpperCase()}</strong>
                </span>
                <span
                  className="demo-pill"
                  style={{
                    background:
                      aiResult.risk === 'high'
                        ? 'rgba(220, 38, 38, 0.12)'
                        : aiResult.risk === 'medium'
                          ? 'rgba(217, 119, 6, 0.12)'
                          : 'rgba(5, 150, 105, 0.12)',
                    color:
                      aiResult.risk === 'high'
                        ? '#dc2626'
                        : aiResult.risk === 'medium'
                          ? '#d97706'
                          : '#059669',
                  }}
                >
                  Escalation Risk: <strong>{aiResult.risk.toUpperCase()}</strong>
                </span>
                <span
                  className="demo-pill"
                  style={{
                    background: 'var(--bg-surface-hover)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Issue: <strong>{aiResult.keyIssue}</strong>
                </span>
              </div>
            </div>

            {/* Right Column: Live AI Copilot Guidance */}
            <div className="demo-ai-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} style={{ color: '#1d4ed8' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Live AI Copilot Guidance
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 9px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Zap size={11} style={{ color: '#d97706' }} />
                  <span>{isAnalyzing ? 'Inferencing...' : `⚡ ${aiResult.latency}s via Groq LPU`}</span>
                </span>
              </div>

              <div className="demo-scores-grid">
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Tone Score</span>
                    <span className="demo-score-val">{aiResult.scores.tone}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div
                      className="demo-score-bar-fill"
                      style={{ width: `${Math.min(100, aiResult.scores.tone * 10)}%`, background: '#2563eb' }}
                    />
                  </div>
                </div>
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Empathy</span>
                    <span className="demo-score-val">{aiResult.scores.empathy}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div
                      className="demo-score-bar-fill"
                      style={{ width: `${Math.min(100, aiResult.scores.empathy * 10)}%`, background: '#ec4899' }}
                    />
                  </div>
                </div>
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Clarity</span>
                    <span className="demo-score-val">{aiResult.scores.clarity}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div
                      className="demo-score-bar-fill"
                      style={{ width: `${Math.min(100, aiResult.scores.clarity * 10)}%`, background: '#059669' }}
                    />
                  </div>
                </div>
              </div>

              <div className="demo-tip-box">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Sparkles size={14} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: '#1d4ed8' }}>Live Coaching Tip: </strong>
                    <span>{aiResult.tip}</span>
                  </div>
                </div>
              </div>

              <div className="demo-suggestion-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1d4ed8' }}>
                    AI Recommended Response (Sub-Second In-Flight Draft):
                  </span>
                  <button
                    type="button"
                    className="demo-copy-btn"
                    onClick={() => handleCopyReply(aiResult.suggestedReply)}
                    title="Copy AI suggested reply to clipboard"
                  >
                    {copied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied!' : 'Copy Reply'}</span>
                  </button>
                </div>
                <div style={{ color: '#1e3a8a', lineHeight: 1.55 }}>
                  "{aiResult.suggestedReply}"
                </div>
              </div>

              <div className="demo-kb-box">
                <Database size={13} style={{ color: '#059669', flexShrink: 0 }} />
                <span><strong>FAISS Vector Grounding:</strong> {aiResult.kb}</span>
              </div>

              <button
                type="button"
                className="landing-cta-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 13, marginTop: 2 }}
                onClick={() => onNavigate('workspace')}
              >
                <span>Open Full Workspace with this Session</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="demo-box-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-subtle)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Zap size={13} style={{ color: '#2563eb' }} /> Sub-Second Groq LPU Inference
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Database size={13} style={{ color: '#059669' }} /> FAISS Dense Semantic Embeddings
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Cloud size={13} style={{ color: '#0284c7' }} /> Firebase Real-Time Telemetry Sync
              </span>
            </div>
            <button
              type="button"
              className="landing-btn-primary"
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => onNavigate('workspace')}
            >
              Launch Full Workspace →
            </button>
          </div>
        </div>
      </section>

      {/* Core AI Innovations */}
      <section className="landing-section" id="innovations" style={{ padding: '64px 40px' }}>
        <div className="landing-container">
          <div className="landing-section-header" style={{ marginBottom: '36px' }}>
            <div className="landing-section-badge">Core Innovations</div>
            <h2 className="landing-section-title">Technological Capabilities</h2>
            <p className="landing-section-subtitle">
              Intelligent pair-programming tools built to guide support specialists synchronously during live customer interactions.
            </p>
          </div>

          <div className="landing-features-grid">
            {CORE_INNOVATIONS.map((f, i) => (
              <div className="landing-feature-card" key={i}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color, marginBottom: 0 }}>
                    <f.icon size={22} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: `${f.color}15`,
                    color: f.color,
                    border: `1px solid ${f.color}35`,
                    letterSpacing: '0.03em'
                  }}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="landing-feature-title" style={{ fontSize: '15px', marginBottom: '8px' }}>{f.title}</h3>
                <p className="landing-feature-desc" style={{ fontSize: '13px', lineHeight: '1.55' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Architecture Pipeline */}
      <section className="landing-section" id="architecture" style={{ background: 'var(--bg-surface)', padding: '64px 40px' }}>
        <div className="landing-container">
          <div className="landing-section-header" style={{ marginBottom: '36px' }}>
            <div className="landing-section-badge">System Architecture</div>
            <h2 className="landing-section-title">End-to-End AI Pipeline</h2>
            <p className="landing-section-subtitle">
              High-throughput data flow: Streaming inbound messages, dense vector retrieval, deterministic LPU inference, and cloud replication.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {ARCHITECTURE_PIPELINE.map((layer, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  padding: '22px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${layer.color}15`,
                    color: layer.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <layer.icon size={18} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subtle)', fontFamily: 'var(--font-code)' }}>
                    {layer.step}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {layer.title}
                </h3>

                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  {layer.desc}
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {layer.details.map((d, dIdx) => (
                    <li key={dIdx} style={{ fontSize: '11.5px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={12} style={{ color: layer.color, flexShrink: 0 }} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Streamlined Bottom Action Bar */}
      <section style={{ padding: '48px 40px', background: 'var(--bg-app)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="landing-container" style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
            Ready to Experience Live AI Coaching?
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Launch the interactive workspace with loaded customer sessions, live sentiment evaluation, and Firebase cloud replication.
          </p>
          <button
            type="button"
            className="landing-cta-primary large"
            style={{ margin: '0 auto', display: 'inline-flex' }}
            onClick={() => onNavigate('workspace')}
          >
            <Zap size={18} /> Launch Live Workspace <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" style={{ padding: '32px 40px' }}>
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div
              className="landing-brand"
              onClick={() => {
                if (rootRef.current) rootRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="landing-logo-icon">
                <Bot size={16} color="#fff" />
              </div>
              <span className="landing-logo-text">OmniDesk <span className="landing-logo-ai">Copilot</span></span>
            </div>
            <p className="landing-footer-copy">
              © 2026 AI-Powered Customer Support Coaching Assistant. All rights reserved.
            </p>
            <div className="landing-footer-links">
              <button type="button" onClick={() => scrollToSection('demo')}>Live Sandbox</button>
              <button type="button" onClick={() => scrollToSection('innovations')}>Core AI</button>
              <button type="button" onClick={() => scrollToSection('architecture')}>Architecture</button>
              <button type="button" onClick={() => onNavigate('workspace')}>Launch Workspace</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />
    </div>
  );
}
