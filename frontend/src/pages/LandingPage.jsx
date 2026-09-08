import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Zap, Shield, BarChart3, Users, MessageSquare, Star, Check,
  ChevronRight, Bot, TrendingUp, Clock, Sparkles, CheckCircle2, ChevronDown,
  X, HeartPulse, DollarSign, Play
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Coaching',
    desc: 'Real-time coaching suggestions as customers type. Groq LPU models analyze tone, intent, and context to guide agents toward the perfect response in under 0.4s.',
    color: '#6366f1',
    tag: 'Core'
  },
  {
    icon: Zap,
    title: 'Sub-Second Reply Assist',
    desc: 'Auto-generated reply drafts appear in milliseconds. Agents review, edit, and send — cutting average handle time by up to 40%.',
    color: '#f59e0b',
    tag: 'Speed'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Live dashboards track CSAT, resolution time, agent performance, and AI coaching adoption across your entire support organization.',
    color: '#10b981',
    tag: 'Insights'
  },
  {
    icon: Shield,
    title: 'Enterprise Guardrails',
    desc: 'Real-time policy compliance, privacy guardrails, and customer sentiment protection running in-flight before replies are dispatched.',
    color: '#8b5cf6',
    tag: 'Security'
  },
  {
    icon: HeartPulse,
    title: 'Agent Burnout Monitor',
    desc: 'Continuous lexical and behavioral monitoring alerts supervisors when agents show early signs of cognitive strain or emotional fatigue.',
    color: '#ec4899',
    tag: 'Novel AI'
  },
  {
    icon: DollarSign,
    title: 'Revenue at Risk (CLV)',
    desc: 'Calculates real-time churn probability and revenue at risk per conversation, enabling retention-first response strategies.',
    color: '#06b6d4',
    tag: 'Novel AI'
  },
  {
    icon: TrendingUp,
    title: 'Momentum Forecaster',
    desc: 'Predicts conversation resolution probability in real-time — escalation vs. resolution, with ETA and trend direction.',
    color: '#f43f5e',
    tag: 'Novel AI'
  },
  {
    icon: MessageSquare,
    title: 'Multilingual & Omnichannel',
    desc: 'Native script support across Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, and English with automatic language detection.',
    color: '#0ea5e9',
    tag: 'Global'
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
    id: 'pricing',
    title: '💼 Volume Pricing',
    customer: 'Jessica Taylor',
    company: 'Nexus SaaS Hub',
    plan: 'Enterprise Plus',
    message: 'Hi! We are expanding our team and need to add 25 user seats. Do you offer custom volume discounts on annual plans?',
    sentiment: 'positive',
    urgency: 'medium',
    risk: 'low',
    keyIssue: 'Volume Seat Discount (25+ Seats)',
    scores: { tone: 9, empathy: 8, clarity: 9 },
    tip: 'Highlight our 22% enterprise tier discount for 25+ seats on annual billing and offer immediate activation.',
    suggestedReply: 'Thank you for scaling with us! Yes, teams adding 25+ seats receive our 22% Enterprise Tier discount on annual billing. I can prepare your custom quote and unlock your new team seats today.',
    kb: 'Volume Tiers: 10 seats: 12%, 15 seats: 18%, 25+ seats: 22% on annual billing.',
  },
  {
    id: 'closure',
    title: '⭐ Resolved / Gratitude',
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

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Support',
    company: 'TechFlow Inc.',
    text: 'OmniDesk Copilot transformed our support team. Our CSAT jumped from 72% to 91% in just 6 weeks. The sub-second AI coaching is genuinely impressive.',
    rating: 5,
    avatar: 'SC',
    avatarColor: '#6366f1',
    metric: '+19% CSAT',
  },
  {
    name: 'Marcus Rivera',
    role: 'VP Customer Experience',
    company: 'Nexus SaaS',
    text: "We evaluated Zendesk's AI and Intercom before choosing OmniDesk. The real-time in-flight coaching is in a different league. Onboarding time for new hires dropped 60%.",
    rating: 5,
    avatar: 'MR',
    avatarColor: '#10b981',
    metric: '-60% Onboarding',
  },
  {
    name: 'Priya Sharma',
    role: 'Support Operations Lead',
    company: 'CloudBase',
    text: 'The analytics and burnout monitoring alone are worth the price. I can finally see exactly where my team needs coaching and prevent agent exhaustion before it happens.',
    rating: 5,
    avatar: 'PS',
    avatarColor: '#f59e0b',
    metric: '0 Burnout Events',
  },
];

const FAQS = [
  {
    q: 'How fast is the real-time AI coaching inference?',
    a: 'Powered by Groq LPUs with compound models, customer sentiment analysis and suggested agent replies are generated in sub-second latency (under 0.4 seconds), keeping conversations completely fluid without awkward pauses.',
  },
  {
    q: 'Can OmniDesk Copilot work offline without API keys?',
    a: 'Yes! OmniDesk includes a built-in HuggingFace offline pipeline (DistilBERT + BART) and rule-based local engines for completely air-gapped environments with zero external network requirements.',
  },
  {
    q: 'What languages does the coaching assistant support?',
    a: 'OmniDesk features automatic script and pattern detection supporting native Devanagari Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, and English with culturally authentic greetings.',
  },
  {
    q: 'How do the novel supervisor features (Burnout, Momentum, CLV) work?',
    a: 'OmniDesk continuously analyzes agent response brevity and vocabulary to detect cognitive fatigue, predicts conversation resolution probability with momentum slopes, and calculates financial revenue-at-risk per session.',
  },
  {
    q: 'Can I test the full workspace without creating an account?',
    a: 'Yes! Sign up for free — no credit card required. You will be immediately onboarded into the full 3-column AI copilot workspace pre-loaded with demo sessions. Start your free trial to explore everything in minutes.',
  },
];

export default function LandingPage({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState('annual');
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [modal, setModal] = useState(null);
  const [salesForm, setSalesForm] = useState({ name: '', email: '', company: '', teamSize: '10-50', message: '', submitted: false });
  const [animIdx, setAnimIdx] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Auto-cycle the demo every 4 seconds
  useEffect(() => {
    const t = setInterval(() => setAnimIdx(i => (i + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentScenario = DEMO_SCENARIOS[activeScenarioIdx];

  const handleSalesSubmit = (e) => {
    e.preventDefault();
    setSalesForm(prev => ({ ...prev, submitted: true }));
  };

  const ANIM_PHRASES = [
    'Tone & Empathy Scored in 0.38s',
    'Burnout Risk: Low — Agent Performing Well',
    'CLV Risk: $0 — Customer Satisfied ✓',
  ];

  return (
    <div className="landing-root">

      {/* ── Fixed Navbar ── */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <div className="landing-logo-icon">
              <Bot size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">OmniDesk <span className="landing-logo-ai">Copilot</span></span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('demo')}>Live Demo</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
          </nav>

          <div className="landing-nav-actions">
            <button type="button" className="landing-btn-ghost" onClick={() => onNavigate('auth', 'login')}>
              Sign In
            </button>
            <button type="button" className="landing-btn-primary" onClick={() => onNavigate('workspace')}>
              <Zap size={13} /> Try Free
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg-grid" />
        <div className="landing-hero-glow" />

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap size={13} style={{ color: '#1e40af' }} />
            <span>⚡ Sub-Second AI Coaching · Multilingual Support · Real-Time Intelligence</span>
          </div>

          <h1 className="landing-hero-title">
            The AI Copilot Built for <br />
            <span className="landing-hero-gradient">High-Performance Support</span>
          </h1>

          <p className="landing-hero-subtitle">
            OmniDesk Copilot guides customer support agents in sub-second latency with live tone &amp; empathy scoring,
            burnout detection, revenue-at-risk alerts, and 1-click knowledge base retrieval.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-cta-primary large"
              onClick={() => onNavigate('auth', 'signup')}
              title="Start your free trial — no credit card required"
            >
              <Zap size={18} /> Start Free Trial <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              onClick={() => scrollToSection('demo')}
              title="See the interactive AI coaching demo"
            >
              <Play size={16} /> View Live Demo
            </button>
          </div>

          <p className="landing-hero-footnote">
            ⚡ Groq LPU · FAISS Vector Search · 8+ Languages Supported · No credit card required
          </p>
        </div>

        {/* ── Interactive Live Coaching Simulator (macOS App Preview) ── */}
        <div className="landing-interactive-demo" id="demo">
          {/* macOS Window Controls */}
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

          {/* Scenario Selector Tabs */}
          <div className="demo-scenario-tabs-bar">
            <span className="demo-scenario-prompt">
              Select an active customer scenario to preview live AI coaching:
            </span>
            <div className="demo-scenario-tabs">
              {DEMO_SCENARIOS.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`demo-tab-btn ${activeScenarioIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveScenarioIdx(idx)}
                >
                  {sc.title}
                </button>
              ))}
            </div>
          </div>

          <div className="demo-box-body">
            {/* Left: Inbound Customer Message */}
            <div className="demo-inbound-card">
              <div className="demo-card-title">
                <MessageSquare size={13} /> Inbound Customer Message
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentScenario.customer}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--border-subtle)', padding: '2px 8px', borderRadius: '4px' }}>
                  {currentScenario.plan} · {currentScenario.company}
                </span>
              </div>
              <div className="demo-msg-bubble">
                "{currentScenario.message}"
              </div>

              <div className="demo-card-title" style={{ marginTop: 6 }}>
                Customer Signals Detected
              </div>
              <div className="demo-pills-row">
                <span className="demo-pill" style={{
                  background: currentScenario.sentiment === 'negative' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                  color: currentScenario.sentiment === 'negative' ? '#f43f5e' : '#10b981',
                  border: `1px solid ${currentScenario.sentiment === 'negative' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`
                }}>
                  Sentiment: {currentScenario.sentiment.toUpperCase()}
                </span>
                <span className="demo-pill" style={{
                  background: currentScenario.urgency === 'high' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: currentScenario.urgency === 'high' ? '#f43f5e' : '#f59e0b',
                  border: `1px solid ${currentScenario.urgency === 'high' ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)'}`
                }}>
                  Urgency: {currentScenario.urgency.toUpperCase()}
                </span>
                <span className="demo-pill" style={{
                  background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)'
                }}>
                  Issue: {currentScenario.keyIssue}
                </span>
              </div>
            </div>

            {/* Right: AI Coached Reply */}
            <div className="demo-ai-card">
              <div className="demo-card-title" style={{ color: '#93c5fd' }}>
                <Sparkles size={13} /> Real-Time AI Suggested Response
              </div>
              <div className="demo-suggestion-box">
                {currentScenario.suggestedReply}
              </div>

              {/* Quality Score Gauges */}
              <div className="demo-scores-grid">
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Tone</span>
                    <span className="demo-score-val" style={{ color: '#10b981' }}>{currentScenario.scores.tone}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div className="demo-score-bar-fill" style={{ width: `${currentScenario.scores.tone * 10}%`, background: '#10b981' }} />
                  </div>
                </div>
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Empathy</span>
                    <span className="demo-score-val" style={{ color: '#6366f1' }}>{currentScenario.scores.empathy}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div className="demo-score-bar-fill" style={{ width: `${currentScenario.scores.empathy * 10}%`, background: '#6366f1' }} />
                  </div>
                </div>
                <div className="demo-score-card">
                  <div className="demo-score-top">
                    <span>Clarity</span>
                    <span className="demo-score-val" style={{ color: '#3b82f6' }}>{currentScenario.scores.clarity}/10</span>
                  </div>
                  <div className="demo-score-bar-bg">
                    <div className="demo-score-bar-fill" style={{ width: `${currentScenario.scores.clarity * 10}%`, background: '#3b82f6' }} />
                  </div>
                </div>
              </div>

              <div className="demo-tip-box">
                <strong style={{ color: '#93c5fd' }}>Coaching Tip:</strong> {currentScenario.tip}
              </div>
            </div>
          </div>

          <div className="demo-box-footer">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              📚 <strong>Knowledge Match:</strong> {currentScenario.kb}
            </span>
            <button
              type="button"
              className="landing-btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => onNavigate('auth', 'signup')}
            >
              Try This Scenario Free <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Trust Stats Row Below Simulator ── */}
        <div className="landing-stats-row" style={{ marginTop: 32 }}>
          {[
            { value: '<0.4s', label: 'AI Inference Latency', color: '#3b82f6' },
            { value: '91.4%', label: 'Average CSAT Score', color: '#10b981' },
            { value: '40%', label: 'Reduction in Handle Time', color: '#f59e0b' },
            { value: '8+', label: 'Native Languages Supported', color: '#8b5cf6' },
          ].map((s, i) => (
            <div className="landing-stat-card" key={i}>
              <div className="landing-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>



      {/* ── Features Section ── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Platform Capabilities</div>
            <h2 className="landing-section-title">Built for High-Volume Support Operations</h2>
            <p className="landing-section-subtitle">
              OmniDesk unifies instant LLM suggestions, vector-indexed FAQs, novel supervisor safety metrics, and multilingual coaching into one streamlined workflow.
            </p>
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

      {/* ── Pricing Section ── */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Transparent Plans</div>
            <h2 className="landing-section-title">Plans That Scale With Your Team</h2>
            <p className="landing-section-subtitle">Full AI copilot access on every plan. No hidden fees.</p>
          </div>

          <div className="pricing-cycle-wrap">
            <div className="pricing-cycle-toggle">
              <button
                type="button"
                className={`cycle-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`cycle-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual
              </button>
            </div>
            {billingCycle === 'annual' && (
              <span className="pricing-save-badge">Save 20% on Annual Plans</span>
            )}
          </div>

          <div className="landing-pricing-grid">
            {/* Starter */}
            <div className="landing-pricing-card">
              <div className="pricing-plan-name">Starter</div>
              <div className="pricing-price-row">
                <span className="pricing-price">{billingCycle === 'annual' ? '$39' : '$49'}</span>
                <span className="pricing-period">/ user / mo</span>
              </div>
              <p className="pricing-desc">For small teams getting started with AI-powered support coaching.</p>
              <ul className="pricing-features-list">
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Up to 5 support agents</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Real-time sub-second coaching</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> FAISS vector knowledge base</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Basic KPI &amp; CSAT reports</li>
              </ul>
              <button
                type="button"
                className="pricing-cta-btn pricing-cta-ghost"
                onClick={() => onNavigate('auth', 'signup')}
              >
                Start Free Trial <ArrowRight size={14} />
              </button>
            </div>

            {/* Professional (Highlighted) */}
            <div className="landing-pricing-card highlighted">
              <div className="pricing-popular-badge">Most Popular</div>
              <div className="pricing-plan-name">Professional</div>
              <div className="pricing-price-row">
                <span className="pricing-price">{billingCycle === 'annual' ? '$119' : '$149'}</span>
                <span className="pricing-period">/ user / mo</span>
              </div>
              <p className="pricing-desc">Full AI suite for scaling support teams with high ticket volumes.</p>
              <ul className="pricing-features-list">
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Up to 25 support agents</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Agent Burnout &amp; Stress Monitor</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Conversation Momentum Forecaster</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Revenue at Risk (CLV Scorer)</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Full Reports with CSV Export</li>
              </ul>
              <button
                type="button"
                className="pricing-cta-btn pricing-cta-primary"
                onClick={() => onNavigate('auth', 'signup')}
              >
                Launch Pro Workspace <ArrowRight size={14} />
              </button>
            </div>

            {/* Enterprise */}
            <div className="landing-pricing-card">
              <div className="pricing-plan-name">Enterprise</div>
              <div className="pricing-price-row">
                <span className="pricing-price">Custom</span>
              </div>
              <p className="pricing-desc">Tailored deployments, SLA guarantees, and on-premise air-gapped hosting.</p>
              <ul className="pricing-features-list">
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Unlimited agents and seats</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> On-premise air-gapped HuggingFace</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Custom CRM &amp; Zendesk integrations</li>
                <li className="pricing-feature-item"><Check size={14} className="pricing-check" /> Dedicated CSM &amp; 99.99% SLA</li>
              </ul>
              <button
                type="button"
                className="pricing-cta-btn pricing-cta-ghost"
                onClick={() => setModal('sales')}
              >
                Contact Sales <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="landing-section" id="testimonials">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Customer Stories</div>
            <h2 className="landing-section-title">Proven Results Across Support Leaders</h2>
          </div>
          <div className="landing-testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="landing-testimonial-card" key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="testimonial-stars">
                    {[...Array(t.rating)].map((_, si) => (
                      <Star key={si} size={14} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
                    background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'
                  }}>
                    {t.metric}
                  </span>
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: `${t.avatarColor}30`, color: t.avatarColor }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-section" id="faq">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Frequently Asked Questions</div>
            <h2 className="landing-section-title">Everything You Need to Know</h2>
            <p className="landing-section-subtitle">Click any question to view technical and operational details.</p>
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

      {/* ── Bottom CTA ── */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <div style={{ fontSize: '44px', lineHeight: 1, marginBottom: 8 }}>🚀</div>
            <h2 className="landing-cta-title">Ready to Elevate Your Support Team?</h2>
            <p className="landing-cta-subtitle">
              Join hundreds of support teams already using AI-powered coaching to deliver faster, kinder, smarter support.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              <button
                type="button"
                className="landing-cta-primary large"
                onClick={() => onNavigate('auth', 'signup')}
              >
                <Zap size={18} /> Get Started Free <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={() => setModal('sales')}
              >
                <MessageSquare size={16} /> Talk to Sales
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: 8 }}>No credit card required · Free 14-day trial · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
              <div className="landing-logo-icon">
                <Bot size={16} color="#fff" />
              </div>
              <span className="landing-logo-text">OmniDesk <span className="landing-logo-ai">Copilot</span></span>
            </div>
            <p className="landing-footer-copy">© 2026 OmniDesk Copilot. Enterprise-grade AI support intelligence.</p>
            <div className="landing-footer-links">
              <button type="button" onClick={() => setModal('privacy')}>Privacy</button>
              <button type="button" onClick={() => setModal('terms')}>Terms</button>
              <button type="button" onClick={() => setModal('security')}>Security</button>
              <button type="button" onClick={() => setModal('status')}>System Status</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Contact Sales Modal ── */}
      {modal === 'sales' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Contact Enterprise Sales</h2>
              <button type="button" className="modal-close-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            {salesForm.submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>Inquiry Received!</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                  Thank you, <strong>{salesForm.name}</strong>. Our enterprise solutions architect will follow up at <strong>{salesForm.email}</strong> within 2 business hours.
                </p>
                <button
                  type="button"
                  className="btn-primary-sm"
                  onClick={() => { setModal(null); onNavigate('workspace'); }}
                >
                  Explore Live Demo in the Meantime <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <form className="modal-form" onSubmit={handleSalesSubmit}>
                <div className="modal-field">
                  <label className="auth-label">Full Name</label>
                  <input className="auth-input" type="text" placeholder="Jane Smith" value={salesForm.name} onChange={e => setSalesForm({ ...salesForm, name: e.target.value })} required />
                </div>
                <div className="modal-field">
                  <label className="auth-label">Work Email</label>
                  <input className="auth-input" type="email" placeholder="jane@company.com" value={salesForm.email} onChange={e => setSalesForm({ ...salesForm, email: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="modal-field">
                    <label className="auth-label">Company</label>
                    <input className="auth-input" type="text" placeholder="TechCorp" value={salesForm.company} onChange={e => setSalesForm({ ...salesForm, company: e.target.value })} required />
                  </div>
                  <div className="modal-field">
                    <label className="auth-label">Team Size</label>
                    <select className="auth-input" value={salesForm.teamSize} onChange={e => setSalesForm({ ...salesForm, teamSize: e.target.value })}>
                      <option value="1-10">1–10 agents</option>
                      <option value="10-50">10–50 agents</option>
                      <option value="50-200">50–200 agents</option>
                      <option value="200+">200+ agents</option>
                    </select>
                  </div>
                </div>
                <div className="modal-field">
                  <label className="auth-label">Requirements</label>
                  <textarea className="auth-input" rows={3} placeholder="Tell us about your channels, ticket volume, and compliance needs..." value={salesForm.message} onChange={e => setSalesForm({ ...salesForm, message: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost-sm" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary-sm">Submit Request</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Info Modals ── */}
      {modal && modal !== 'sales' && (
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
