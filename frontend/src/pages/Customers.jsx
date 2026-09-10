import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, TrendingUp, TrendingDown, X, MessageSquare, Clock, DollarSign, Shield, ChevronRight, Activity, Trash2, RefreshCw } from 'lucide-react';
import { listenToTickets, listenToConversations, deleteCustomerByName, purgeMockFirestoreRecords, isMockCustomer, isMockTicketOrSession } from '../api/firebase';

const HEALTH_COLOR = (h) => h >= 80 ? '#10b981' : h >= 60 ? '#f59e0b' : '#f43f5e';
const RISK_STYLES = {
  low: { color: '#10b981', bg: '#10b98118', label: 'Low Risk' },
  medium: { color: '#f59e0b', bg: '#f59e0b18', label: 'Medium Risk' },
  high: { color: '#f43f5e', bg: '#f43f5e18', label: 'High Risk' },
};

function getInitials(name) {
  if (!name) return 'CU';
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}
function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  let h = 0; for (let c of (name || 'C')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
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
  const [realTickets, setRealTickets] = useState([]);
  const [realConversations, setRealConversations] = useState([]);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    // Purge any stale mock sessions from Firestore on load
    purgeMockFirestoreRecords();
  }, []);

  useEffect(() => {
    const unsubTix = listenToTickets((tix) => { if (tix) setRealTickets(tix); });
    const unsubConvs = listenToConversations((convs) => { if (convs) setRealConversations(convs); });
    return () => {
      if (unsubTix) unsubTix();
      if (unsubConvs) unsubConvs();
    };
  }, []);

  const customers = useMemo(() => {
    const map = new Map();

    (realTickets || [])
      .filter(t => t && t.customer && !isMockCustomer(t.customer) && !isMockTicketOrSession(t.id))
      .forEach((t, i) => {
        const name = String(t.customer).trim();
        if (!map.has(name)) {
          map.set(name, {
            id: `tix-cust-${i}`,
            name: name,
            email: t.customerEmail || `${name.toLowerCase().replace(/\s+/g, '.')}@client.com`,
            company: t.company || 'Enterprise Account',
            plan: t.plan || 'Professional',
            ltv: '$6,400',
            health: 90,
            tickets: 1,
            status: 'active',
            risk: 'low',
            lastContact: t.created || 'Recently'
          });
        } else {
          map.get(name).tickets += 1;
        }
      });

    (realConversations || [])
      .filter(c => {
        if (!c) return false;
        const rawName = c.customerName || c.customer?.name || c.customer;
        if (!rawName) return false;
        if (isMockCustomer(rawName)) return false;
        if (isMockTicketOrSession(c.ticketId) || isMockTicketOrSession(c.sessionId)) return false;
        return true;
      })
      .forEach((c, i) => {
        const rawName = c.customerName || c.customer?.name || c.customer;
        const name = String(rawName).trim();
        if (!map.has(name)) {
          map.set(name, {
            id: `conv-cust-${i}`,
            name: name,
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@client.com`,
            company: 'Client Organization',
            plan: 'Pro Tier',
            ltv: '$4,800',
            health: c.sentiment === 'negative' ? 65 : 94,
            tickets: 1,
            status: 'active',
            risk: c.sentiment === 'negative' ? 'medium' : 'low',
            lastContact: c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'
          });
        } else {
          map.get(name).tickets += 1;
        }
      });

    return Array.from(map.values());
  }, [realTickets, realConversations]);

  const handleManualPurge = async () => {
    setIsPurging(true);
    try {
      await purgeMockFirestoreRecords();
      try {
        localStorage.removeItem('carebot_sessions');
        localStorage.removeItem('carebot_tickets');
      } catch {}
    } finally {
      setIsPurging(false);
    }
  };

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
          <p className="page-subtitle">{customers.length} customer records indexed · {customers.filter(c => c.risk === 'high').length} at-risk accounts</p>
        </div>
      </div>

      <div className="toolbar-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <button
          className="btn-ghost-sm"
          onClick={handleManualPurge}
          disabled={isPurging}
          title="Clean legacy mock records and sync fresh data"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} className={isPurging ? 'animate-spin' : ''} />
          {isPurging ? 'Purging Mocks...' : 'Purge Mock Data'}
        </button>
      </div>

      <div className="tickets-layout">
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
            <Activity size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>No Customers on Record</div>
            <div style={{ fontSize: '12.5px', marginTop: 4, maxWidth: '380px', margin: '4px auto 0' }}>
              Customer accounts are dynamically created as tickets are received or sessions are opened in Live Workspace.
            </div>
          </div>
        ) : (
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
        )}

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
              <button
                id="start-customer-conversation-btn"
                className="btn-primary-sm full-width"
                onClick={() => onNavigate('workspace', { customer: sel })}
              >
                <MessageSquare size={13} /> Start Conversation
              </button>
              <button className="btn-ghost-sm full-width" onClick={() => onNavigate('tickets')}>
                <ChevronRight size={13} /> View Tickets
              </button>
              <button
                className="btn-danger-sm full-width"
                onClick={async () => {
                  if (window.confirm(`Delete customer "${sel.name}" and remove all associated sessions?`)) {
                    await deleteCustomerByName(sel.name);
                    setSelected(null);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  marginTop: '8px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <Trash2 size={13} /> Delete Customer Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
