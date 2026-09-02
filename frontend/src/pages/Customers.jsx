import React, { useState } from 'react';
import { Search, Star, TrendingUp, TrendingDown, X, MessageSquare, Clock, DollarSign, Shield, ChevronRight, Activity } from 'lucide-react';

const customers = [
  { id: 1, name: 'Sarah Mitchell', email: 'sarah.m@techflow.io', company: 'TechFlow Inc.', plan: 'Enterprise', ltv: '$24,000', health: 92, tickets: 12, status: 'active', risk: 'low', lastContact: '2 hr ago' },
  { id: 2, name: 'James O\'Brien', email: 'james.ob@nexussaas.com', company: 'Nexus SaaS', plan: 'Professional', ltv: '$7,200', health: 67, tickets: 8, status: 'active', risk: 'medium', lastContact: '1 day ago' },
  { id: 3, name: 'Priya Kumar', email: 'priya.k@datasphere.ai', company: 'DataSphere', plan: 'Enterprise', ltv: '$36,000', health: 88, tickets: 5, status: 'active', risk: 'low', lastContact: '3 hr ago' },
  { id: 4, name: 'Carlos Reyes', email: 'carlos@pulsehq.co', company: 'PulseHQ', plan: 'Starter', ltv: '$1,800', health: 45, tickets: 19, status: 'at-risk', risk: 'high', lastContact: '30 min ago' },
  { id: 5, name: 'Emma Wilson', email: 'emma.w@streamlite.com', company: 'StreamLite', plan: 'Professional', ltv: '$8,400', health: 79, tickets: 7, status: 'active', risk: 'low', lastContact: '5 hr ago' },
  { id: 6, name: 'Tom Zhang', email: 'tom.z@cloudbase.io', company: 'CloudBase', plan: 'Enterprise', ltv: '$48,000', health: 95, tickets: 3, status: 'active', risk: 'low', lastContact: '1 day ago' },
  { id: 7, name: 'Lisa Park', email: 'lisa.p@acme.com', company: 'Acme Corp', plan: 'Starter', ltv: '$600', health: 55, tickets: 14, status: 'at-risk', risk: 'high', lastContact: '4 hr ago' },
  { id: 8, name: 'Daniel Brown', email: 'daniel.b@innovateco.tech', company: 'InnovateCo', plan: 'Professional', ltv: '$5,400', health: 82, tickets: 6, status: 'active', risk: 'low', lastContact: '2 day ago' },
  { id: 9, name: 'Sophie Turner', email: 'sophie.t@growthstack.io', company: 'GrowthStack', plan: 'Starter', ltv: '$2,400', health: 71, tickets: 9, status: 'active', risk: 'medium', lastContact: '1 hr ago' },
  { id: 10, name: 'Mark Davis', email: 'mark.d@devopspro.com', company: 'DevOps Pro', plan: 'Professional', ltv: '$10,800', health: 60, tickets: 11, status: 'at-risk', risk: 'medium', lastContact: '6 hr ago' },
];

const HEALTH_COLOR = (h) => h >= 80 ? '#10b981' : h >= 60 ? '#f59e0b' : '#f43f5e';
const RISK_STYLES = {
  low: { color: '#10b981', bg: '#10b98118', label: 'Low Risk' },
  medium: { color: '#f59e0b', bg: '#f59e0b18', label: 'Medium Risk' },
  high: { color: '#f43f5e', bg: '#f43f5e18', label: 'High Risk' },
};

function getInitials(name) {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}
function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function HealthRing({ score }) {
  const r = 18, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = HEALTH_COLOR(score);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)" />
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

export default function Customers({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const sel = selected ? customers.find(c => c.id === selected) : null;
  const selColor = sel ? avatarColor(sel.name) : '#6366f1';

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} customers · {customers.filter(c => c.risk === 'high').length} at-risk accounts</p>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            id="customers-search"
            type="text"
            className="search-input"
            placeholder="Search customers, companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tickets-layout">
        {/* Customer Cards Grid */}
        <div className={`customer-grid ${sel ? 'grid-split' : ''}`}>
          {filtered.map(c => {
            const ac = avatarColor(c.name);
            const risk = RISK_STYLES[c.risk];
            const isActive = selected === c.id;
            return (
              <div
                key={c.id}
                className={`customer-card ${isActive ? 'customer-card-active' : ''}`}
                onClick={() => setSelected(isActive ? null : c.id)}
              >
                <div className="customer-card-top">
                  <div className="customer-avatar-lg" style={{ background: `${ac}25`, color: ac }}>
                    {getInitials(c.name)}
                  </div>
                  <HealthRing score={c.health} />
                </div>
                <div className="customer-card-name">{c.name}</div>
                <div className="customer-card-company">{c.company}</div>
                <div className="customer-card-email">{c.email}</div>
                <div className="customer-card-meta">
                  <span className="plan-chip">{c.plan}</span>
                  <span className="risk-chip" style={{ background: risk.bg, color: risk.color }}>{risk.label}</span>
                </div>
                <div className="customer-card-stats">
                  <div className="customer-stat">
                    <DollarSign size={11} /> {c.ltv}
                  </div>
                  <div className="customer-stat">
                    <MessageSquare size={11} /> {c.tickets} tickets
                  </div>
                  <div className="customer-stat">
                    <Clock size={11} /> {c.lastContact}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {sel && (
          <div className="ticket-detail-panel">
            <div className="detail-panel-header">
              <span className="detail-ticket-id">Customer Profile</span>
              <button className="detail-close-btn" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <div className="customer-avatar-xl" style={{ background: `${selColor}25`, color: selColor }}>
                {getInitials(sel.name)}
              </div>
              <div className="detail-subject">{sel.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{sel.email}</div>
            </div>
            <div className="detail-meta-rows">
              <div className="detail-meta-row">
                <span className="detail-meta-label">Company</span>
                <span className="detail-meta-val">{sel.company}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Plan</span>
                <span className="detail-meta-val">{sel.plan}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Lifetime Value</span>
                <span className="detail-meta-val" style={{ color: '#10b981', fontWeight: 600 }}>{sel.ltv}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Health Score</span>
                <span className="detail-meta-val" style={{ color: HEALTH_COLOR(sel.health), fontWeight: 600 }}>{sel.health}/100</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Churn Risk</span>
                <span className="risk-chip" style={{ background: RISK_STYLES[sel.risk].bg, color: RISK_STYLES[sel.risk].color }}>{RISK_STYLES[sel.risk].label}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Tickets</span>
                <span className="detail-meta-val">{sel.tickets} total</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Last Contact</span>
                <span className="detail-meta-val">{sel.lastContact}</span>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn-primary-sm full-width" onClick={() => onNavigate('workspace')}>
                <MessageSquare size={13} /> Start Conversation
              </button>
              <button className="btn-ghost-sm full-width" onClick={() => onNavigate('tickets')}>
                <ChevronRight size={13} /> View Tickets
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
