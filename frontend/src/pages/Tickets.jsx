import React, { useState } from 'react';
import { Search, Filter, ChevronRight, X, MessageSquare, Mail, Phone, Clock, Tag, User, ExternalLink, CheckCircle, AlertTriangle, RotateCcw, Inbox } from 'lucide-react';

const STATUS = {
  open: { label: 'Open', color: '#6366f1', bg: '#6366f118' },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#f59e0b18' },
  resolved: { label: 'Resolved', color: '#10b981', bg: '#10b98118' },
  closed: { label: 'Closed', color: '#64748b', bg: '#64748b18' },
};

const CHANNELS = {
  chat: { icon: MessageSquare, color: '#6366f1' },
  email: { icon: Mail, color: '#10b981' },
  phone: { icon: Phone, color: '#f59e0b' },
};

const tickets = [
  { id: 2341, subject: 'Billing discrepancy on invoice #4821', customer: 'Sarah Mitchell', company: 'TechFlow Inc.', status: 'open', channel: 'chat', agent: 'Alex Kim', created: '2 min ago', priority: 'urgent', tags: ['billing', 'enterprise'] },
  { id: 2340, subject: 'API rate limit errors in production', customer: 'James O\'Brien', company: 'Nexus SaaS', status: 'open', channel: 'email', agent: null, created: '5 min ago', priority: 'urgent', tags: ['api', 'bug'] },
  { id: 2339, subject: 'Cannot access admin dashboard after SSO update', customer: 'Priya Kumar', company: 'DataSphere', status: 'pending', channel: 'chat', agent: 'Maya Patel', created: '18 min ago', priority: 'high', tags: ['auth', 'sso'] },
  { id: 2338, subject: 'Webhook not firing on ticket resolution events', customer: 'Carlos Reyes', company: 'PulseHQ', status: 'open', channel: 'email', agent: 'Alex Kim', created: '32 min ago', priority: 'high', tags: ['webhook', 'integration'] },
  { id: 2337, subject: 'Feature request: bulk export to CSV', customer: 'Emma Wilson', company: 'StreamLite', status: 'pending', channel: 'email', agent: 'Jordan Torres', created: '1 hr ago', priority: 'normal', tags: ['feature-request'] },
  { id: 2336, subject: 'Password reset email not being received', customer: 'Tom Zhang', company: 'CloudBase', status: 'resolved', channel: 'chat', agent: 'Maya Patel', created: '2 hr ago', priority: 'normal', tags: ['auth'] },
  { id: 2335, subject: 'Need to upgrade plan — sales question', customer: 'Lisa Park', company: 'Acme Corp', status: 'open', channel: 'phone', agent: null, created: '3 hr ago', priority: 'normal', tags: ['billing', 'sales'] },
  { id: 2334, subject: 'Report export shows incorrect date range', customer: 'Daniel Brown', company: 'InnovateCo', status: 'resolved', channel: 'email', agent: 'Sam Nguyen', created: '4 hr ago', priority: 'low', tags: ['reports', 'bug'] },
  { id: 2333, subject: 'Question about team seat billing', customer: 'Sophie Turner', company: 'GrowthStack', status: 'closed', channel: 'chat', agent: 'Alex Kim', created: '5 hr ago', priority: 'low', tags: ['billing'] },
  { id: 2332, subject: 'Integration with Slack not working', customer: 'Mark Davis', company: 'DevOps Pro', status: 'open', channel: 'email', agent: null, created: '6 hr ago', priority: 'high', tags: ['integration', 'slack'] },
  { id: 2331, subject: 'Custom domain not resolving after update', customer: 'Nina Patel', company: 'StartupHub', status: 'pending', channel: 'chat', agent: 'Jordan Torres', created: '7 hr ago', priority: 'high', tags: ['domain', 'infra'] },
  { id: 2330, subject: 'CSAT survey not sending after ticket close', customer: 'Robert Lee', company: 'RetailMax', status: 'open', channel: 'email', agent: 'Maya Patel', created: '8 hr ago', priority: 'normal', tags: ['csat', 'automation'] },
];

function getInitials(name) {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}
function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

export default function Tickets({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleRow = (id) => {
    setSelectedRows(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectedTicket = selected ? tickets.find(t => t.id === selected) : null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">{tickets.filter(t => t.status === 'open').length} open · {tickets.filter(t => t.status === 'pending').length} pending · {tickets.length} total</p>
        </div>
        <button className="btn-primary-sm" onClick={() => onNavigate('workspace')}>
          <MessageSquare size={14} /> New Ticket
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar-row">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            id="tickets-search"
            type="text"
            className="search-input"
            placeholder="Search tickets, customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-bar" style={{ margin: 0 }}>
          {['all', ...Object.keys(STATUS)].map(s => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS[s].label}
            </button>
          ))}
        </div>
        {selectedRows.size > 0 && (
          <div className="bulk-toolbar">
            <span>{selectedRows.size} selected</span>
            <button className="bulk-btn"><CheckCircle size={12} /> Resolve</button>
            <button className="bulk-btn"><RotateCcw size={12} /> Reopen</button>
            <button className="bulk-btn danger"><X size={12} /> Delete</button>
          </div>
        )}
      </div>

      <div className="tickets-layout">
        {/* Table */}
        <div className={`table-card ${selected ? 'table-card-split' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="row-checkbox" onChange={e => {
                    setSelectedRows(e.target.checked ? new Set(filtered.map(t => t.id)) : new Set());
                  }} />
                </th>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Channel</th>
                <th>Agent</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const st = STATUS[t.status];
                const ch = CHANNELS[t.channel];
                const ac = avatarColor(t.customer);
                const isSelected = selected === t.id;
                return (
                  <tr
                    key={t.id}
                    className={`table-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => setSelected(isSelected ? null : t.id)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={selectedRows.has(t.id)}
                        onChange={() => toggleRow(t.id)}
                      />
                    </td>
                    <td>
                      <div>
                        <div className="subject-text">{t.subject}</div>
                        <div className="ticket-id-sm">#{t.id}</div>
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar-sm" style={{ background: `${ac}25`, color: ac }}>{getInitials(t.customer)}</div>
                        <div>
                          <div className="customer-name-sm">{t.customer}</div>
                          <div className="customer-company-sm">{t.company}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td>
                      <span className="channel-badge" style={{ background: `${ch.color}18`, color: ch.color }}>
                        <ch.icon size={11} />
                      </span>
                    </td>
                    <td>
                      {t.agent ? (
                        <span className="agent-assigned">{t.agent}</span>
                      ) : (
                        <span className="unassigned">—</span>
                      )}
                    </td>
                    <td><span className="time-cell"><Clock size={11} /> {t.created}</span></td>
                    <td>
                      <button className="tbl-btn-ghost" onClick={e => {
                        e.stopPropagation();
                        onNavigate('workspace', {
                          customer: {
                            name: t.customer,
                            company: t.company,
                            plan: 'Enterprise',
                            initialMessage: t.subject,
                          }
                        });
                      }}>
                        Open <ChevronRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedTicket && (
          <div className="ticket-detail-panel">
            <div className="detail-panel-header">
              <span className="detail-ticket-id">#{selectedTicket.id}</span>
              <button className="detail-close-btn" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>
            <h3 className="detail-subject">{selectedTicket.subject}</h3>
            <div className="detail-meta-rows">
              <div className="detail-meta-row">
                <span className="detail-meta-label"><User size={12} /> Customer</span>
                <span className="detail-meta-val">{selectedTicket.customer} · {selectedTicket.company}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><Tag size={12} /> Status</span>
                <span className="status-badge" style={{ background: STATUS[selectedTicket.status].bg, color: STATUS[selectedTicket.status].color }}>
                  {STATUS[selectedTicket.status].label}
                </span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><Clock size={12} /> Created</span>
                <span className="detail-meta-val">{selectedTicket.created}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><User size={12} /> Agent</span>
                <span className="detail-meta-val">{selectedTicket.agent || 'Unassigned'}</span>
              </div>
            </div>
            <div className="detail-tags">
              {selectedTicket.tags.map(tag => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
            <div className="detail-actions">
              <button className="btn-primary-sm full-width" onClick={() => {
                onNavigate('workspace', {
                  customer: {
                    name: selectedTicket.customer,
                    company: selectedTicket.company,
                    plan: 'Enterprise',
                    initialMessage: selectedTicket.subject,
                  }
                });
              }}>
                <ExternalLink size={13} /> Open in Workspace
              </button>
              <button className="btn-ghost-sm full-width">
                <CheckCircle size={13} /> Mark Resolved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
