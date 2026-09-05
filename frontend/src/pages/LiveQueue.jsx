import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Clock, User, ChevronRight, RefreshCw, Filter, Zap, AlertTriangle } from 'lucide-react';

const CHANNELS = {
  chat: { icon: MessageSquare, color: '#6366f1', label: 'Chat' },
  email: { icon: Mail, color: '#10b981', label: 'Email' },
  phone: { icon: Phone, color: '#f59e0b', label: 'Phone' },
};

const PRIORITIES = {
  urgent: { color: '#f43f5e', bg: '#f43f5e18', label: 'Urgent' },
  high: { color: '#f59e0b', bg: '#f59e0b18', label: 'High' },
  normal: { color: '#6366f1', bg: '#6366f118', label: 'Normal' },
  low: { color: '#64748b', bg: '#64748b18', label: 'Low' },
};

const queue = [
  { id: 2341, customer: 'Sarah Mitchell', company: 'TechFlow Inc.', subject: 'Billing discrepancy on invoice #4821', channel: 'chat', priority: 'urgent', wait: '0:42', agent: null },
  { id: 2340, customer: 'James O\'Brien', company: 'Nexus SaaS', subject: 'API rate limit errors in production', channel: 'email', priority: 'urgent', wait: '1:15', agent: null },
  { id: 2339, customer: 'Priya Kumar', company: 'DataSphere', subject: 'Cannot access admin dashboard after SSO update', channel: 'chat', priority: 'high', wait: '2:30', agent: null },
  { id: 2338, customer: 'Carlos Reyes', company: 'PulseHQ', subject: 'Webhook not firing on ticket resolution events', channel: 'email', priority: 'high', wait: '3:05', agent: 'Alex Kim' },
  { id: 2337, customer: 'Emma Wilson', company: 'StreamLite', subject: 'Feature request: bulk export to CSV', channel: 'email', priority: 'normal', wait: '4:12', agent: null },
  { id: 2336, customer: 'Tom Zhang', company: 'CloudBase', subject: 'Password reset email not being received', channel: 'chat', priority: 'normal', wait: '5:45', agent: 'Maya Patel' },
  { id: 2335, customer: 'Lisa Park', company: 'Acme Corp', subject: 'Need to upgrade plan — sales question', channel: 'phone', priority: 'normal', wait: '6:20', agent: null },
  { id: 2334, customer: 'Daniel Brown', company: 'InnovateCo', subject: 'Report export shows incorrect date range', channel: 'email', priority: 'low', wait: '8:00', agent: null },
  { id: 2333, customer: 'Sophie Turner', company: 'GrowthStack', subject: 'Question about team seat billing', channel: 'chat', priority: 'low', wait: '9:30', agent: null },
];

function getInitials(name) {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
  let hash = 0;
  for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

export default function LiveQueue({ onNavigate }) {
  const [filter, setFilter] = useState('all');
  const [assignedMap, setAssignedMap] = useState({});

  const filtered = filter === 'all' ? queue : queue.filter(q => q.priority === filter);

  const assignToMe = (id) => {
    setAssignedMap(m => ({ ...m, [id]: 'You' }));
  };

  const openInWorkspace = (item = null) => {
    if (item) {
      onNavigate('workspace', {
        customer: {
          name: item.customer,
          company: item.company,
          plan: 'Enterprise',
          initialMessage: item.subject,
        }
      });
    } else {
      onNavigate('workspace');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Queue</h1>
          <p className="page-subtitle">
            <span className="live-dot" /> {queue.length} conversations waiting · Updated just now
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-ghost-sm"><RefreshCw size={14} /> Refresh</button>
          <button className="btn-primary-sm" onClick={openInWorkspace}><Zap size={14} /> Open Workspace</button>
        </div>
      </div>

      {/* Priority Filter */}
      <div className="filter-bar">
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        {['all', 'urgent', 'high', 'normal', 'low'].map(f => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : PRIORITIES[f]?.label}
            {f !== 'all' && <span className="filter-chip-count">{queue.filter(q => q.priority === f).length}</span>}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Subject</th>
              <th>Channel</th>
              <th>Priority</th>
              <th>Wait Time</th>
              <th>Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const ch = CHANNELS[item.channel];
              const pr = PRIORITIES[item.priority];
              const ac = avatarColor(item.customer);
              const assigned = assignedMap[item.id] || item.agent;
              const isUrgent = item.priority === 'urgent';
              return (
                <tr key={item.id} className={`table-row ${isUrgent ? 'urgent-row' : ''}`}>
                  <td>
                    <span className="ticket-num">#{item.id}</span>
                    {isUrgent && <AlertTriangle size={12} color="#f43f5e" style={{ marginLeft: 4 }} />}
                  </td>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar-sm" style={{ background: `${ac}25`, color: ac }}>
                        {getInitials(item.customer)}
                      </div>
                      <div>
                        <div className="customer-name-sm">{item.customer}</div>
                        <div className="customer-company-sm">{item.company}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="subject-cell">{item.subject}</span></td>
                  <td>
                    <span className="channel-badge" style={{ background: `${ch.color}18`, color: ch.color }}>
                      <ch.icon size={11} /> {ch.label}
                    </span>
                  </td>
                  <td>
                    <span className="priority-badge" style={{ background: pr.bg, color: pr.color }}>
                      {pr.label}
                    </span>
                  </td>
                  <td>
                    <span className={`wait-time ${parseFloat(item.wait) > 3 ? 'wait-long' : ''}`}>
                      <Clock size={11} /> {item.wait}
                    </span>
                  </td>
                  <td>
                    {assigned ? (
                      <span className="agent-assigned">{assigned}</span>
                    ) : (
                      <span className="unassigned">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {!assigned && (
                        <button className="tbl-btn-primary" onClick={() => assignToMe(item.id)}>
                          Assign to Me
                        </button>
                      )}
                      <button className="tbl-btn-ghost" onClick={() => openInWorkspace(item)}>
                        Open <ChevronRight size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
