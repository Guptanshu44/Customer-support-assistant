import React, { useState, useEffect, useMemo } from 'react';
import { Phone, MessageSquare, Mail, Clock, User, ChevronRight, RefreshCw, Filter, Zap, AlertTriangle } from 'lucide-react';
import { listenToTickets } from '../api/firebase';

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

function getInitials(name) {
  if (!name) return 'CU';
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
  let hash = 0;
  for (let c of (name || 'Q')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

export default function LiveQueue({ onNavigate }) {
  const [filter, setFilter] = useState('all');
  const [assignedMap, setAssignedMap] = useState({});
  const [realTickets, setRealTickets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsub = listenToTickets((tix) => {
      if (tix) setRealTickets(tix);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const queue = useMemo(() => {
    return realTickets
      .filter(t => t.status !== 'resolved' && t.status !== 'closed')
      .map(t => ({
        id: t.id,
        customer: t.customer || 'Customer',
        company: t.company || 'Enterprise Account',
        subject: t.subject || 'Support Inquiry',
        channel: t.channel || 'chat',
        priority: t.priority || 'normal',
        wait: t.created || 'Recently',
        agent: t.agent || null
      }));
  }, [realTickets]);
  const [lastUpdated, setLastUpdated] = useState('just now');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setIsRefreshing(false);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Queue</h1>
          <p className="page-subtitle">
            <span className="live-dot" /> {queue.length} conversations waiting · Updated {lastUpdated}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-ghost-sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn-primary-sm" onClick={() => openInWorkspace()}><Zap size={14} /> Open Workspace</button>
        </div>
      </div>

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
