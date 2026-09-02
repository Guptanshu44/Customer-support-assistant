import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, Shield, BarChart3, Users, MessageSquare, Star, Check, ChevronRight, Bot, TrendingUp, Clock, Headphones } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Coaching',
    desc: 'Real-time coaching suggestions as customers type. GPT-class models analyze tone, intent, and context to guide agents toward the perfect response.',
    color: '#6366f1',
  },
  {
    icon: Zap,
    title: 'Lightning Response Assist',
    desc: 'Auto-generated reply drafts appear in milliseconds. Agents review, edit, and send — cutting average handle time by up to 40%.',
    color: '#f59e0b',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Live dashboards track CSAT, resolution time, agent performance, and AI coaching adoption across your entire support org.',
    color: '#10b981',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'SOC 2 Type II compliant. End-to-end encryption, role-based access control, SSO, and audit logs baked in from day one.',
    color: '#8b5cf6',
  },
  {
    icon: Users,
    title: 'Team Intelligence',
    desc: 'Identify coaching opportunities, burnout risk, and skill gaps across your team with AI-driven performance analytics.',
    color: '#ec4899',
  },
  {
    icon: MessageSquare,
    title: 'Omnichannel Support',
    desc: 'Unified queue for chat, email, phone, and social. One workspace. One AI coach. All your channels.',
    color: '#06b6d4',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    desc: 'Perfect for small support teams getting started with AI coaching.',
    features: ['Up to 5 agents', 'Live AI coaching', 'Basic analytics', 'Email support', '1,000 sessions/mo'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/mo',
    desc: 'Full-featured platform for growing customer support operations.',
    features: ['Up to 25 agents', 'Advanced AI coaching', 'Full analytics suite', 'Priority support', '10,000 sessions/mo', 'Custom workflows', 'API access'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Tailored for large-scale support organizations with complex needs.',
    features: ['Unlimited agents', 'Custom AI model fine-tuning', 'Dedicated CSM', 'SLA guarantee', 'On-premise option', 'SSO & SAML', 'Advanced security'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Support, TechFlow Inc.',
    text: 'CareBot AI transformed our support team. Our CSAT jumped from 72% to 91% in just 6 weeks. The AI coaching is genuinely impressive — it feels like having an expert supervisor in every conversation.',
    rating: 5,
    avatar: 'SC',
    avatarColor: '#6366f1',
  },
  {
    name: 'Marcus Rivera',
    role: 'VP Customer Experience, Nexus SaaS',
    text: "We evaluated Zendesk's AI features and Intercom before choosing CareBot. The real-time coaching is in a different league. Our agents love it — it reduced onboarding time for new hires by 60%.",
    rating: 5,
    avatar: 'MR',
    avatarColor: '#10b981',
  },
  {
    name: 'Priya Sharma',
    role: 'Support Operations Lead, CloudBase',
    text: 'The analytics alone are worth the price. I can finally see exactly where my team needs coaching and which conversations led to churn risk. It\'s like having a data scientist embedded in support.',
    rating: 5,
    avatar: 'PS',
    avatarColor: '#f59e0b',
  },
];

const stats = [
  { value: '40%', label: 'Reduction in AHT' },
  { value: '91%', label: 'Avg CSAT Score' },
  { value: '60%', label: 'Faster Onboarding' },
  { value: '12x', label: 'ROI in Year 1' },
];

export default function LandingPage({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="landing-root">
      {/* Navbar */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-logo-icon">
              <Bot size={18} color="#fff" />
            </div>
            <span className="landing-logo-text">CareBot <span className="landing-logo-ai">AI</span></span>
          </div>
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
            <a href="#testimonials" className="landing-nav-link">Customers</a>
          </nav>
          <div className="landing-nav-actions">
            <button className="landing-btn-ghost" onClick={() => onNavigate('auth', 'login')}>Log in</button>
            <button className="landing-btn-primary" onClick={() => onNavigate('auth', 'signup')}>Get Started <ArrowRight size={14} /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-bg-grid" />
        <div className="landing-hero-glow" />
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap size={12} /> AI-Powered · Real-Time · Enterprise-Ready
          </div>
          <h1 className="landing-hero-title">
            The AI Coaching Platform<br />
            <span className="landing-hero-gradient">Built for Support Teams</span>
          </h1>
          <p className="landing-hero-subtitle">
            CareBot AI gives every support agent a real-time AI coach — suggesting the perfect response,
            detecting customer sentiment, and turning average agents into top performers.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta-primary" onClick={() => onNavigate('auth', 'signup')}>
              Start Free 14-Day Trial <ArrowRight size={16} />
            </button>
            <button className="landing-cta-secondary" onClick={() => onNavigate('auth', 'login')}>
              View Live Demo <ChevronRight size={16} />
            </button>
          </div>
          <p className="landing-hero-footnote">No credit card required · SOC 2 compliant · Cancel anytime</p>
        </div>

        {/* Hero Stats */}
        <div className="landing-stats-row">
          {stats.map((s, i) => (
            <div className="landing-stat-card" key={i}>
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Platform Features</div>
            <h2 className="landing-section-title">Everything Your Support Team Needs</h2>
            <p className="landing-section-subtitle">
              From real-time AI coaching to enterprise analytics — CareBot AI is the complete support intelligence platform.
            </p>
          </div>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div className="landing-feature-card" key={i}>
                <div className="landing-feature-icon" style={{ background: `${f.color}20`, color: f.color }}>
                  <f.icon size={22} />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="landing-social-proof">
        <div className="landing-container">
          <p className="landing-social-label">Trusted by support teams at</p>
          <div className="landing-logos-row">
            {['TechFlow', 'Nexus SaaS', 'CloudBase', 'DataSphere', 'PulseHQ', 'StreamLite'].map((c, i) => (
              <div className="landing-company-logo" key={i}>{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Simple Pricing</div>
            <h2 className="landing-section-title">Plans That Scale With You</h2>
            <p className="landing-section-subtitle">All plans include a 14-day free trial. No credit card required.</p>
          </div>
          <div className="landing-pricing-grid">
            {plans.map((p, i) => (
              <div className={`landing-pricing-card ${p.highlight ? 'highlighted' : ''}`} key={i}>
                {p.highlight && <div className="pricing-popular-badge">Most Popular</div>}
                <div className="pricing-plan-name">{p.name}</div>
                <div className="pricing-price-row">
                  <span className="pricing-price">{p.price}</span>
                  <span className="pricing-period">{p.period}</span>
                </div>
                <p className="pricing-desc">{p.desc}</p>
                <ul className="pricing-features-list">
                  {p.features.map((feat, j) => (
                    <li key={j} className="pricing-feature-item">
                      <Check size={14} className="pricing-check" /> {feat}
                    </li>
                  ))}
                </ul>
                <button
                  className={`pricing-cta-btn ${p.highlight ? 'pricing-cta-primary' : 'pricing-cta-ghost'}`}
                  onClick={() => onNavigate('auth', 'signup')}
                >
                  {p.cta} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="landing-section" id="testimonials">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Customer Stories</div>
            <h2 className="landing-section-title">Loved by Support Teams Worldwide</h2>
          </div>
          <div className="landing-testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="landing-testimonial-card" key={i}>
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, si) => <Star key={si} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: `${t.avatarColor}30`, color: t.avatarColor }}>{t.avatar}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <h2 className="landing-cta-title">Ready to Transform Your Support Team?</h2>
            <p className="landing-cta-subtitle">Join 500+ companies using CareBot AI to deliver world-class customer support.</p>
            <button className="landing-cta-primary large" onClick={() => onNavigate('auth', 'signup')}>
              Start Your Free Trial <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-brand">
              <div className="landing-logo-icon">
                <Bot size={16} color="#fff" />
              </div>
              <span className="landing-logo-text">CareBot <span className="landing-logo-ai">AI</span></span>
            </div>
            <p className="landing-footer-copy">© 2025 CareBot AI. All rights reserved. Built for support teams everywhere.</p>
            <div className="landing-footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
              <a href="#">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
