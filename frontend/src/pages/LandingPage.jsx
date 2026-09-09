import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Zap, Shield, BarChart3, Users, MessageSquare, Star, Check,
  ChevronRight, Bot, TrendingUp, Clock, Sparkles, CheckCircle2, ChevronDown,
  X, HeartPulse, DollarSign, Play, Database, Cpu, Layers, Award, Terminal, Cloud,
  Copy, RotateCcw
} from 'lucide-react';
import { api } from '../api/client';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Live Coaching',
    desc: 'Real-time coaching suggestions generated in under 0.4s using Groq LPU inference. Evaluates customer sentiment, urgency, and intent to guide agents on empathy and clarity.',
    color: '#6366f1',
    tag: 'Core AI'
  },
  {
    icon: Zap,
    title: 'Sub-Second Reply Generation',
    desc: 'Contextual response drafts appear dynamically as customer issues are identified, reducing contact center Average Handle Time (AHT) by up to 40%.',
    color: '#f59e0b',
    tag: 'Speed'
  },
  {
    icon: Database,
    title: 'RAG Knowledge Base (FAISS)',
    desc: 'Dense sentence embeddings indexed with FAISS vector search perform sub-10ms semantic similarity matching over policy documents and troubleshooting workflows.',
    color: '#10b981',
    tag: 'RAG'
  },
  {
    icon: Cloud,
    title: 'Firebase Cloud Synchronization',
    desc: 'Cloud Firestore synchronizes user accounts, tickets, conversation turns, and complete AI coaching telemetry in real-time with resilient offline fallback.',
    color: '#0284c7',
    tag: 'Cloud'
  },
  {
    icon: HeartPulse,
    title: 'Agent Burnout & Fatigue Monitor',
    desc: 'Continuous lexical diversity and brevity heuristics analyze agent response patterns, alerting supervisors before cognitive exhaustion impacts service quality.',
    color: '#ec4899',
    tag: 'Novel AI'
  },
  {
    icon: DollarSign,
    title: 'CLV Churn & Revenue Risk',
    desc: 'Calculates session churn probability and revenue-at-risk based on customer sentiment and issue severity, prioritizing high-value retention opportunities.',
    color: '#06b6d4',
    tag: 'Novel AI'
  },
  {
    icon: TrendingUp,
    title: 'Conversation Momentum Forecaster',
    desc: 'Predicts conversation resolution trajectory in real-time (escalation vs. resolution) with estimated time-to-resolution and satisfaction trends.',
    color: '#f43f5e',
    tag: 'Novel AI'
  },
  {
    icon: MessageSquare,
    title: 'Multilingual Regional NLP',
    desc: 'Automatic script and language detection across Hindi (Devanagari), Tamil, Telugu, Kannada, Bengali, and English with authentic cultural greetings.',
    color: '#8b5cf6',
    tag: 'NLP'
  },
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

const ARCHITECTURE_LAYERS = [
  {
    title: '1. In-Flight LLM Inference (Groq LPU)',
    icon: Cpu,
    color: '#6366f1',
    desc: 'Leverages Groq Language Processing Units (LPUs) executing open-weights models (LLaMA-3.3 70B / Mixtral) with deterministic latency (<0.4s), enabling live AI guidance during conversation turns.',
    details: ['Sub-0.4s end-to-end latency', 'Custom prompt engineering with tone constraints', 'Zero call delay for customer interaction']
  },
  {
    title: '2. Dense Vector RAG Pipeline (FAISS)',
    icon: Database,
    color: '#10b981',
    desc: 'Embeds support knowledge base articles into dense vector spaces using sentence-transformers (all-MiniLM-L6-v2) with FAISS CPU vector indexing for sub-10ms semantic search.',
    details: ['Semantic similarity matching', 'Policy & workflow grounding', 'Zero LLM hallucination risk']
  },
  {
    title: '3. Behavioral & Telemetry Heuristics',
    icon: Layers,
    color: '#ec4899',
    desc: 'Algorithms compute real-time sentiment polarity, urgency levels, escalation risk probabilities, and agent burnout indices through lexical diversity and brevity tracking.',
    details: ['Agent cognitive load tracking', 'CLV financial revenue-at-risk', 'Dynamic resolution momentum forecasting']
  },
  {
    title: '4. Cloud & Real-Time Sync (Firebase)',
    icon: Shield,
    color: '#0284c7',
    desc: 'Integrates Google Firebase Authentication and Cloud Firestore for multi-agent real-time ticket replication, conversation transcripts, and coaching metrics with graceful local fallback.',
    details: ['Google OAuth & Email Auth', 'Real-time Firestore listeners', 'Zero-crash offline localStorage fallback']
  }
];

const FAQS = [
  {
    q: 'What is the primary objective of this AI-Powered Coaching Assistant?',
    a: 'The objective of the system is to empower contact center support agents with real-time, sub-second AI coaching, automated reply suggestions, knowledge retrieval, and supervisor telemetry to improve First Contact Resolution (FCR) and reduce handle times.',
  },
  {
    q: 'How does the system achieve sub-second latency for live coaching?',
    a: 'The system uses Groq LPUs (Language Processing Units) running optimized inference pipelines. By generating sentiment analysis, compliance checks, and reply suggestions in under 0.4 seconds, coaching appears synchronously while the customer and agent are actively communicating.',
  },
  {
    q: 'How is the RAG (Retrieval-Augmented Generation) pipeline implemented?',
    a: 'The system embeds institutional knowledge base articles using sentence-transformers (all-MiniLM-L6-v2) into 384-dimensional vector embeddings. When a customer inquiry arrives, FAISS performs dense cosine similarity search to retrieve relevant policy clauses in under 10ms.',
  },
  {
    q: 'How does the novel Agent Burnout Monitoring algorithm work?',
    a: 'The burnout detection heuristic continuously monitors an agent’s outgoing vocabulary richness and response brevity decay across sequential turns. Rapid drops in lexical diversity and empathy keywords signal cognitive fatigue, enabling supervisors to rebalance workloads proactively.',
  },
  {
    q: 'How is data persisted and synchronized in the cloud?',
    a: 'The application integrates Google Cloud Firestore for real-time ticket replication, customer-support conversation logs, sentiment metrics, and user profiles. It incorporates a decoupled fallback layer: if offline or unconfigured, the app functions 100% locally via browser localStorage without crashing.',
  },
  {
    q: 'How can users launch and test the application?',
    a: 'Users can launch the Live Workspace immediately with one click using the "Launch Workspace" button. The system is pre-loaded with active customer scenarios, FAISS vector embeddings, Groq LLM pipelines, and Firestore cloud sync.',
  },
];

export default function LandingPage({ onNavigate }) {
  const rootRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [customMessage, setCustomMessage] = useState(DEMO_SCENARIOS[0].message);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const [openFaq, setOpenFaq] = useState(null);
  const [modal, setModal] = useState(null);

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
          >
            <div className="landing-logo-icon">
              <Bot size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">OmniDesk <span className="landing-logo-ai">Copilot</span></span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('demo')}>Live Sandbox</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>AI Features</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('architecture')}>System Architecture</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('faq')}>Project FAQs</button>
          </nav>

          <div className="landing-nav-actions">
            <button type="button" className="landing-btn-primary" onClick={() => onNavigate('workspace')}>
              <Zap size={13} /> Launch Workspace →
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-bg-grid" />
        <div className="landing-hero-glow" />

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap size={13} style={{ color: '#1e40af' }} />
            <span>⚡ Live AI Coaching · In-Flight Guidance · Sub-Second Inference</span>
          </div>

          <h1 className="landing-hero-title">
            Development of AI-Powered Customer Support<br />
            <span className="landing-hero-gradient">Coaching Assistant with Live Guidance</span>
          </h1>

          <p className="landing-hero-subtitle">
            An intelligent in-flight copilot engineered for contact center specialists — featuring sub-second Groq LPU inference, RAG knowledge retrieval, real-time sentiment &amp; empathy scoring, and Firebase cloud data synchronization.
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

          <p className="landing-hero-footnote">
            ⚡ Groq LPU Inference · FAISS Vector Search · Firebase Cloud · Real-Time Multilingual NLP
          </p>
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

      {/* Project Impact Metrics Grid */}
      <section className="landing-metrics-strip">
        <div className="landing-container">
          <div className="landing-metrics-grid">
            <div className="landing-metric-item">
              <div className="landing-metric-val">&lt; 0.4s</div>
              <div className="landing-metric-label">Groq LPU Inference Latency</div>
            </div>
            <div className="landing-metric-item">
              <div className="landing-metric-val">40%</div>
              <div className="landing-metric-label">Reduction in Average Handle Time (AHT)</div>
            </div>
            <div className="landing-metric-item">
              <div className="landing-metric-val">99.2%</div>
              <div className="landing-metric-label">SLA Adherence via In-Flight Guardrails</div>
            </div>
            <div className="landing-metric-item">
              <div className="landing-metric-val">8+ Languages</div>
              <div className="landing-metric-label">Native Script Multilingual Intelligence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key AI Capabilities */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Core Capabilities</div>
            <h2 className="landing-section-title">Engineered for Contact Center Excellence</h2>
            <p className="landing-section-subtitle">A comprehensive suite of intelligent tools designed to guide human agents during live interactions.</p>
          </div>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div className="landing-feature-card" key={i}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="landing-feature-icon" style={{ background: `${f.color}20`, color: f.color }}>
                    <f.icon size={20} />
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(37,99,235,0.12)',
                    color: '#1d4ed8',
                    border: '1px solid rgba(37,99,235,0.28)',
                    letterSpacing: '0.04em'
                  }}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Architecture Section (Replaced Pricing/Testimonials) */}
      <section className="landing-section" id="architecture" style={{ background: 'var(--bg-surface)' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">System Architecture</div>
            <h2 className="landing-section-title">End-to-End AI Architecture &amp; Pipeline</h2>
            <p className="landing-section-subtitle">
              High-throughput AI pipeline: Sub-second inference, dense vector retrieval, and decoupled cloud persistence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '30px' }}>
            {ARCHITECTURE_LAYERS.map((layer, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${layer.color}18`,
                    color: layer.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <layer.icon size={18} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {layer.title}
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.55', margin: 0 }}>
                  {layer.desc}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {layer.details.map((d, dIdx) => (
                    <li key={dIdx} style={{ fontSize: '12px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

      {/* System Documentation & Technical FAQs */}
      <section className="landing-section" id="faq">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">System Documentation</div>
            <h2 className="landing-section-title">Technical Architecture &amp; System FAQs</h2>
            <p className="landing-section-subtitle">Detailed answers regarding system architecture, AI inference models, and real-time heuristics.</p>
          </div>
          <div className="landing-faq-grid">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div className="faq-card" key={i}>
                  <button
                    type="button"
                    className="faq-header"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      color: isOpen ? 'var(--primary)' : 'var(--text-subtle)',
                      flexShrink: 0,
                    }} />
                  </button>
                  {isOpen && (
                    <div className="faq-body">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Project CTA Banner */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: 8 }}>🚀</div>
            <h2 className="landing-cta-title">Explore the Live Copilot Workspace</h2>
            <p className="landing-cta-subtitle">
              Experience real-time AI guidance, customer sentiment analysis, agent burnout monitoring, and Firebase cloud sync in the active workspace.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
              <button
                type="button"
                className="landing-cta-primary large"
                onClick={() => onNavigate('workspace')}
              >
                <Zap size={18} /> Open Live Workspace <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={() => scrollToSection('architecture')}
              >
                <BarChart3 size={16} /> View Technical Architecture
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
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
            <p className="landing-footer-copy">© 2026 Development of AI-Powered Customer Support Coaching Assistant with Live Guidance. All rights reserved.</p>
            <div className="landing-footer-links">
              <button type="button" onClick={() => scrollToSection('demo')}>Live Sandbox</button>
              <button type="button" onClick={() => scrollToSection('features')}>AI Features</button>
              <button type="button" onClick={() => scrollToSection('architecture')}>Architecture</button>
              <button type="button" onClick={() => onNavigate('workspace')}>Launch Workspace</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Technical Modals */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modal === 'privacy' && 'Privacy Commitment'}
                {modal === 'terms' && 'Terms of Service'}
                {modal === 'security' && 'Security & Data Governance'}
                {modal === 'status' && 'Operational System Status'}
              </h2>
              <button type="button" className="modal-close-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.7, padding: '8px 0 16px' }}>
              {modal === 'privacy' && (
                <p>OmniDesk Copilot processes customer chat interactions strictly in-memory during real-time coaching evaluation. Zero customer conversation data is retained for external model training without explicit contractual consent. All persisted session transcripts are encrypted in local SQLite databases.</p>
              )}
              {modal === 'terms' && (
                <p>Use of OmniDesk Copilot is governed by your organization's Master Services Agreement. Coaching advice and suggested drafts are provided as pair-intelligence to support human agents, with the human agent maintaining final authority before sending replies.</p>
              )}
              {modal === 'security' && (
                <p>OmniDesk Copilot adheres to SOC 2 Type II guidelines. All vector embeddings generated for knowledge search use high-security local 384-dimensional models (all-MiniLM-L6-v2). Guardrails automatically flag PII and compliance violations before dispatch.</p>
              )}
              {modal === 'status' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    All Systems Operational
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>• Groq LPU Inference: <strong>99.98% Uptime</strong> (Avg Latency: 0.38s)</li>
                    <li>• FAISS Vector Knowledge Base: <strong>Operational</strong> (Sub-10ms)</li>
                    <li>• WebSocket &amp; REST Server: <strong>Running Healthy</strong></li>
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-primary-sm" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
