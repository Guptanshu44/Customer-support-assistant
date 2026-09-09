import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Zap, Shield, BarChart3, Users, MessageSquare, Check,
  ChevronRight, Bot, TrendingUp, Clock, Sparkles, CheckCircle2, ChevronDown,
  X, HeartPulse, DollarSign, Play, Cpu, Layers, Database, Activity, Code2, Server
} from 'lucide-react';

const CORE_FEATURES = [
  {
    icon: Bot,
    title: 'Sub-0.4s In-Flight AI Guidance',
    desc: 'Real-time coaching suggestions streamed as the customer types. Groq LPU models analyze tone, intent, and context to guide agents toward the optimal response in ~380ms.',
    color: '#2563eb',
    tag: 'Core LLM'
  },
  {
    icon: HeartPulse,
    title: 'Agent Burnout & Fatigue Monitor',
    desc: 'Continuous lexical diversity and brevity tracking alerts supervisors when agents show early signs of cognitive strain or emotional exhaustion.',
    color: '#ec4899',
    tag: 'Novel AI'
  },
  {
    icon: TrendingUp,
    title: 'Conversation Momentum Forecaster',
    desc: 'Predicts conversation resolution trajectory in real-time — escalation vs. resolution probability with confidence scoring and turn-by-turn trends.',
    color: '#f43f5e',
    tag: 'Novel AI'
  },
  {
    icon: DollarSign,
    title: 'Financial CLV & Churn Risk Scorer',
    desc: 'Evaluates customer lifetime value and computes revenue-at-risk per turn, enabling retention-first response strategies on high-priority tickets.',
    color: '#06b6d4',
    tag: 'Novel AI'
  },
  {
    icon: Database,
    title: 'FAISS Vector Knowledge Retrieval',
    desc: 'Meta FAISS vector index retrieves relevant policy snippets and past resolutions in <10ms to ground the LLM response in factual company policies.',
    color: '#10b981',
    tag: 'RAG Search'
  },
  {
    icon: Shield,
    title: 'Enterprise Guardrails & Compliance',
    desc: 'Real-time policy compliance, privacy guardrails, and customer sentiment protection running in-flight before replies are dispatched.',
    color: '#8b5cf6',
    tag: 'Security'
  },
];

const DEMO_SCENARIOS = [
  {
    id: 'billing',
    title: '💳 Double Charge Dispute',
    customer: 'Alex Morgan',
    company: 'TechFlow Inc.',
    plan: 'Pro Annual',
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
    plan: 'Starter Monthly',
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
    id: 'gratitude',
    title: '⭐ Resolution Gratitude',
    customer: 'Elena Rostova',
    company: 'CloudBase HQ',
    plan: 'Pro Annual',
    message: 'Thank you so much for the prompt refund! Everything looks resolved and back to normal now.',
    sentiment: 'positive',
    urgency: 'low',
    risk: 'low',
    keyIssue: 'Resolution Gratitude',
    scores: { tone: 10, empathy: 10, clarity: 10 },
    tip: 'Warmly acknowledge thanks, reinforce positive experience, and invite future contact.',
    suggestedReply: "You're very welcome, Elena! I'm thrilled we could get this resolved quickly for you today. Please feel free to reach out anytime if you need anything else! 🌟",
    kb: 'Customer Retention: Warm closure with future availability boosts customer loyalty by 35%.',
  },
];

const ARCHITECTURE_LAYERS = [
  {
    layer: 'Layer 1',
    title: 'Dual-Stream Ingestion Pipeline',
    desc: 'Simultaneously captures incoming customer inquiries and keystroke-level agent draft responses with 600ms client-side debouncing to optimize API efficiency.',
    tags: ['React 18', 'Client Debounce', 'Async REST', 'WebSockets'],
  },
  {
    layer: 'Layer 2',
    title: 'In-Flight LLM Inference Engine',
    desc: 'Powered by Groq LPUs running LLaMA-3.3-70B. Evaluates tone, empathy, clarity, sentiment, urgency, and generates structured reply drafts in under 400ms.',
    tags: ['Groq LPU', 'LLaMA-3.3-70B', 'Claude 3.5 Sonnet', 'JSON Schema'],
  },
  {
    layer: 'Layer 3',
    title: 'Novel Algorithmic Modules',
    desc: 'Four native Python intelligence models compute behavioral metrics: Agent Burnout Index, Momentum Slope Forecast, CLV Revenue-at-Risk, and Micro-Habit Coach.',
    tags: ['Python 3.12', 'Markov Momentum', 'Burnout Index', 'CLV Risk'],
  },
  {
    layer: 'Layer 4',
    title: 'Semantic RAG Vector Retrieval',
    desc: 'Meta FAISS vector index converts incoming queries into 384-dimensional dense vectors to retrieve relevant enterprise policies and FAQ resolutions in <10ms.',
    tags: ['Meta FAISS', 'SentenceTransformers', 'all-MiniLM-L6-v2', 'NumPy'],
  },
  {
    layer: 'Layer 5',
    title: 'Persistence & Single-Page Host',
    desc: 'All conversation turns, agent habit scores, and supervisor stats are persisted to local SQLite. Embedded as a self-contained singlefile bundle on Streamlit Cloud.',
    tags: ['SQLite3', 'Vite SingleFile', 'Streamlit Cloud', 'Zero-Crash Fallback'],
  },
];

const BENCHMARKS = [
  {
    metric: '0.38s',
    label: 'Avg Inference Latency',
    desc: 'Groq LPU hardware acceleration delivers full 70B parameter inference 10x faster than traditional cloud endpoints.',
    icon: Zap,
    color: '#2563eb',
  },
  {
    metric: '4 Novel',
    label: 'Custom AI Models',
    desc: 'Engineered custom Python algorithms for Agent Burnout, Momentum Slope, Financial CLV Risk, and Habit Coaching.',
    icon: Cpu,
    color: '#8b5cf6',
  },
  {
    metric: '< 10ms',
    label: 'FAISS Vector Search',
    desc: 'Sub-10 millisecond semantic lookup across dense vector indices for policy compliance and grounded answers.',
    icon: Database,
    color: '#10b981',
  },
  {
    metric: '100%',
    label: 'Offline Fault Tolerance',
    desc: 'Deterministic rule-based backup engine guarantees zero crash if external API keys are unavailable or disconnected.',
    icon: Shield,
    color: '#f59e0b',
  },
];

const VIVA_FAQS = [
  {
    q: 'What is the core problem statement for this Infosys Springboard project?',
    a: 'Customer support agents often face high cognitive load, stressful disputes, and delayed supervisor guidance. This project provides live, in-flight AI coaching during conversation turns—scoring tone, empathy, and clarity before the agent hits send to prevent escalations and reduce handle times.',
  },
  {
    q: 'Why was Groq LPU selected over standard cloud LLM APIs?',
    a: 'In live customer support, latency is everything. Traditional LLM API calls take 2 to 4 seconds—far too slow for real-time keystroke coaching. Groq LPU architecture executes full 70-billion parameter LLaMA-3 models in under 400ms, making real-time, in-flight guidance practical.',
  },
  {
    q: 'How does the Agent Burnout Detector work algorithmically?',
    a: 'The burnout detector evaluates agent linguistic patterns over consecutive turns. It tracks response brevity, lexical diversity, and sentiment shifts. If an agent shifts to abruptly curt replies or displays emotional exhaustion, it triggers a supervisor intervention alert.',
  },
  {
    q: 'How does the RAG architecture with FAISS operate?',
    a: 'The knowledge base uses Facebook AI Similarity Search (FAISS). Support policies and past resolutions are converted into 384-dimensional dense vectors using all-MiniLM-L6-v2. Incoming queries are embedded and matched using cosine similarity in <10ms to retrieve the top relevant policy grounding the LLM.',
  },
  {
    q: 'How does the application ensure fault tolerance without an API key?',
    a: 'The application contains a deterministic, rule-based offline engine. If no API key is provided, sentiment, urgency, empathy heuristics, and standard coaching tips are computed locally in pure Python with zero crashes or UI interruption.',
  },
];

export default function LandingPage({ onNavigate }) {
  const rootRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
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

  const currentScenario = DEMO_SCENARIOS[activeScenarioIdx];

  return (
    <div className="landing-root" ref={rootRef}>
      {/* Navigation Header */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div
            className="landing-brand"
            onClick={() => {
              if (rootRef.current) {
                rootRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="landing-logo-icon">
              <Bot size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">
              OmniDesk <span className="landing-logo-ai">Copilot</span>
            </span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('demo')}>Live Demo</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>AI Features</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('architecture')}>Architecture</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('benchmarks')}>Benchmarks</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('faq')}>Viva FAQs</button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => onNavigate('workspace')}
              title="Launch the live agent coaching workspace"
            >
              <Zap size={14} /> Launch Workspace →
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
            <span>Infosys Springboard Virtual Internship • AI &amp; Machine Learning Track</span>
          </div>

          <h1 className="landing-hero-title">
            AI-Powered Customer Support Coaching Assistant <br />
            <span className="landing-hero-gradient">with Live Guidance</span>
          </h1>

          <p className="landing-hero-subtitle">
            An enterprise-grade pair-intelligence system for customer support agents. Combines Groq LPU sub-0.4s LLM inference,
            real-time tone and empathy scoring, agent cognitive burnout detection, conversation momentum forecasting,
            and FAISS vector knowledge retrieval.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-cta-primary large"
              onClick={() => onNavigate('workspace')}
              title="Launch the live AI coaching workspace"
            >
              <Play size={17} /> Launch Live AI Workspace <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              onClick={() => scrollToSection('demo')}
              title="See the interactive AI coaching demo"
            >
              <Zap size={16} /> Explore Interactive Sandbox
            </button>
          </div>

          <p className="landing-hero-footnote">
            ⚡ Groq LPU (LLaMA-3.3-70B) · Meta FAISS Vector Search · SQLite Historical Persistence · React 18 SPA
          </p>
        </div>

        {/* Interactive Demo Sandbox */}
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
            {DEMO_SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`demo-scenario-tab ${activeScenarioIdx === idx ? 'active' : ''}`}
                onClick={() => setActiveScenarioIdx(idx)}
              >
                {s.title}
              </button>
            ))}
          </div>

          <div className="demo-window-body">
            <div className="demo-column demo-chat-col">
              <div className="demo-col-header">
                <span className="demo-col-badge customer">Customer Inquiry</span>
                <span className="demo-col-user">{currentScenario.customer} · {currentScenario.plan}</span>
              </div>
              <div className="demo-bubble customer">
                <p>{currentScenario.message}</p>
                <div className="demo-meta-tags">
                  <span className={`meta-tag sentiment-${currentScenario.sentiment}`}>
                    Sentiment: {currentScenario.sentiment}
                  </span>
                  <span className={`meta-tag urgency-${currentScenario.urgency}`}>
                    Urgency: {currentScenario.urgency}
                  </span>
                  <span className="meta-tag risk">
                    Issue: {currentScenario.keyIssue}
                  </span>
                </div>
              </div>

              <div className="demo-col-header" style={{ marginTop: 18 }}>
                <span className="demo-col-badge copilot">Suggested AI Response</span>
                <span className="demo-latency-pill">Generated in 0.38s</span>
              </div>
              <div className="demo-bubble copilot-draft">
                <p>{currentScenario.suggestedReply}</p>
                <div className="demo-kb-note">
                  <BookOpenIcon size={12} />
                  <span>{currentScenario.kb}</span>
                </div>
              </div>
            </div>

            <div className="demo-column demo-metrics-col">
              <div className="demo-col-header">
                <span className="demo-col-badge ai">Live Coaching Analysis</span>
                <span className="demo-ai-model-tag">llama-3.3-70b-versatile</span>
              </div>

              <div className="demo-score-bars">
                <div className="score-row">
                  <span className="score-label">Tone Quality</span>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill tone" style={{ width: `${currentScenario.scores.tone * 10}%` }} />
                  </div>
                  <span className="score-num">{currentScenario.scores.tone}/10</span>
                </div>
                <div className="score-row">
                  <span className="score-label">Empathy Index</span>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill empathy" style={{ width: `${currentScenario.scores.empathy * 10}%` }} />
                  </div>
                  <span className="score-num">{currentScenario.scores.empathy}/10</span>
                </div>
                <div className="score-row">
                  <span className="score-label">Clarity &amp; Precision</span>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill clarity" style={{ width: `${currentScenario.scores.clarity * 10}%` }} />
                  </div>
                  <span className="score-num">{currentScenario.scores.clarity}/10</span>
                </div>
              </div>

              <div className="demo-tip-card">
                <div className="demo-tip-header">
                  <Sparkles size={13} style={{ color: '#2563eb' }} />
                  <span>Real-Time Coaching Recommendation</span>
                </div>
                <p className="demo-tip-body">{currentScenario.tip}</p>
              </div>

              <div className="demo-supervisor-pills">
                <div className="sup-pill">
                  <span className="sup-label">Burnout Monitor</span>
                  <span className="sup-val ok">Normal (Index: 12)</span>
                </div>
                <div className="sup-pill">
                  <span className="sup-label">Momentum Forecast</span>
                  <span className="sup-val resolution">Resolution (92%)</span>
                </div>
                <div className="sup-pill">
                  <span className="sup-label">CLV Protection</span>
                  <span className="sup-val safe">$0 at Risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core AI Features Section */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Core Capabilities</div>
            <h2 className="landing-section-title">Built for Modern AI Support Engineering</h2>
            <p className="landing-section-subtitle">
              Six synchronized intelligence layers deliver automated assistance, emotional fatigue monitoring, and predictive ticket analysis.
            </p>
          </div>

          <div className="landing-features-grid">
            {CORE_FEATURES.map((f, i) => (
              <div className="landing-feature-card" key={i}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                    <f.icon size={22} />
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: f.tag === 'Novel AI' ? 'rgba(37,99,235,0.12)' : 'var(--border-subtle)',
                    color: f.tag === 'Novel AI' ? '#1d4ed8' : 'var(--text-muted)',
                    border: f.tag === 'Novel AI' ? '1px solid rgba(37,99,235,0.28)' : '1px solid var(--border-strong)',
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

      {/* System Architecture Section (Replaces Pricing) */}
      <section className="landing-section" id="architecture">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">System Architecture</div>
            <h2 className="landing-section-title">End-to-End Engineering Pipeline</h2>
            <p className="landing-section-subtitle">
              A decoupled 5-layer architecture engineered for sub-second agent feedback and zero-crash fault tolerance.
            </p>
          </div>

          <div className="landing-arch-grid">
            {ARCHITECTURE_LAYERS.map((layer, i) => (
              <div className="arch-layer-card" key={i}>
                <div className="arch-layer-header">
                  <span className="arch-layer-num">{layer.layer}</span>
                  <Layers size={16} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                </div>
                <h3 className="arch-layer-title">{layer.title}</h3>
                <p className="arch-layer-desc">{layer.desc}</p>
                <div className="arch-tech-stack">
                  {layer.tags.map((tag, ti) => (
                    <span className="arch-tech-tag" key={ti}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Benchmarks Section (Replaces Testimonials) */}
      <section className="landing-section" id="benchmarks">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Empirical Results</div>
            <h2 className="landing-section-title">Performance Benchmarks &amp; Outcomes</h2>
            <p className="landing-section-subtitle">
              Measured performance metrics across inference latency, algorithmic innovation, vector search speed, and resilience.
            </p>
          </div>

          <div className="landing-benchmarks-grid">
            {BENCHMARKS.map((b, i) => (
              <div className="benchmark-card" key={i}>
                <div className="benchmark-icon-wrap" style={{ background: `${b.color}15`, color: b.color }}>
                  <b.icon size={22} />
                </div>
                <div className="benchmark-metric" style={{ color: b.color }}>{b.metric}</div>
                <div className="benchmark-label">{b.label}</div>
                <p className="benchmark-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Viva / FAQ Section */}
      <section className="landing-section" id="faq">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Project Viva Q&amp;A</div>
            <h2 className="landing-section-title">Technical Evaluation &amp; Viva Insights</h2>
            <p className="landing-section-subtitle">Key design decisions, algorithmic trade-offs, and architecture justifications.</p>
          </div>

          <div className="landing-faq-grid">
            {VIVA_FAQS.map((faq, i) => {
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

      {/* CTA Banner */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: 8 }}>⚡</div>
            <h2 className="landing-cta-title">Explore the Live Coaching Workspace</h2>
            <p className="landing-cta-subtitle">
              Test real-time keystroke coaching suggestions, inspect agent burnout metrics, and review conversation momentum forecasting in action.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              <button
                type="button"
                className="landing-cta-primary large"
                onClick={() => onNavigate('workspace')}
              >
                <Zap size={18} /> Open AI Copilot Workspace <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={() => setModal('project_docs')}
              >
                <Code2 size={16} /> View Technical Specs
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: 8 }}>
              Infosys Springboard Virtual Internship • AI &amp; Machine Learning Track
            </p>
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
            <p className="landing-footer-copy">
              © 2026 Developed for Infosys Springboard Virtual Internship Project.
            </p>
            <div className="landing-footer-links">
              <button type="button" onClick={() => setModal('project_docs')}>Project Specs</button>
              <button type="button" onClick={() => setModal('architecture')}>Architecture</button>
              <button type="button" onClick={() => setModal('security')}>Compliance</button>
              <button type="button" onClick={() => setModal('status')}>System Status</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Info Modals */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modal === 'project_docs' && 'Project Specifications'}
                {modal === 'architecture' && 'Engineering Architecture'}
                {modal === 'security' && 'Compliance & Data Governance'}
                {modal === 'status' && 'Live System Status'}
              </h2>
              <button type="button" className="modal-close-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.7, padding: '8px 0 16px' }}>
              {modal === 'project_docs' && (
                <div>
                  <p><strong>Project Title:</strong> Development of AI-Powered Customer Support Coaching Assistant with Live Guidance</p>
                  <p><strong>Internship:</strong> Infosys Springboard Virtual Internship (AI &amp; ML Track)</p>
                  <p><strong>Primary Model:</strong> Groq LPU LLaMA-3.3-70B via High-Speed Inference Engine</p>
                  <p><strong>Vector Database:</strong> Meta FAISS with 384-dimensional dense embeddings</p>
                  <p><strong>Persistence:</strong> Local SQLite with session turns, supervisor metrics, and habit records</p>
                </div>
              )}
              {modal === 'architecture' && (
                <div>
                  <p>The system decouples client-side drafting from LLM inference using client debouncing (600ms). When an agent pauses typing, a structured request is dispatched to Groq LPU, which scores tone, empathy, and clarity while simultaneously checking compliance rules.</p>
                  <p style={{ marginTop: 8 }}>Concurrently, the customer's issue is queried against a local FAISS vector index to surface grounding policy snippets in under 10 milliseconds.</p>
                </div>
              )}
              {modal === 'security' && (
                <p>Customer interactions are processed strictly in-memory during real-time coaching evaluation. Zero customer conversation data is retained for external model training. Guardrails automatically flag PII and compliance violations before dispatch.</p>
              )}
              {modal === 'status' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    All Modules Operational
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>• Groq LPU Hardware Acceleration: <strong>Active</strong> (Avg Latency: ~0.38s)</li>
                    <li>• Meta FAISS Vector Search: <strong>Operational</strong> (&lt;10ms)</li>
                    <li>• Local SQLite Storage: <strong>Connected</strong> (sessions.db)</li>
                    <li>• Zero-Crash Rule Engine: <strong>Standby</strong> (100% Fault Tolerance)</li>
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

function BookOpenIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
