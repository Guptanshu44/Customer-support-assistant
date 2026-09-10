import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, MessageSquare, Mail, Clock, User, ChevronRight, 
  RefreshCw, Filter, Zap, AlertTriangle, Inbox, Plus 
} from 'lucide-react';
import { listenToTickets, getCurrentAuthUser, isMockCustomer, isMockTicketOrSession } from '../api/firebase';
import { api } from '../api/client';

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
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
  let hash = 0;
  for (let c of (name || 'Q')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

const TICKETS_STORAGE_KEY = 'carebot_tickets_list_v2';

export default function LiveQueue({ onNavigate }) {
  const [filter, setFilter] = useState('all');
  const [assignedMap, setAssignedMap] = useState({});
  const [realTickets, setRealTickets] = useState(() => {
    try {
      const stored = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [activeSessions, setActiveSessions] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('just now');

  // 1. Subscribe to Firestore live tickets
  useEffect(() => {
    const unsub = listenToTickets((tix) => {
      if (Array.isArray(tix)) {
        setRealTickets(tix);
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // 2. Also check active sessions to include fresh incoming customer sessions
  const fetchLiveSessions = async () => {
    try {
      const data = await api.getSessions();
      if (data && Array.isArray(data.sessions)) {
        setActiveSessions(data.sessions);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  // Aggregate pending queue items from real tickets and workspace sessions
  const queue = useMemo(() => {
    const legacyMockNames = ['Sarah Mitchell', 'James O\'Brien', 'Priya Kumar', 'Carlos Reyes', 'Emma Wilson', 'Tom Zhang', 'Lisa Park', 'Daniel Brown', 'Sophie Turner', 'Mark Davis', 'Nina Patel', 'Robert Lee'];
    
    // Process real tickets
    const ticketItems = realTickets
      .filter(t => !isMockCustomer(t.customer) && !isMockTicketOrSession(t.id))
      .filter(t => t.status !== 'resolved' && t.status !== 'closed')
      .map(t => ({
        id: t.id,
        customer: t.customer || 'Customer',
        company: t.company || 'Direct Client',
        subject: t.subject || 'Inbound Inquiry',
        channel: t.channel || 'chat',
        priority: (t.priority || 'normal').toLowerCase(),
        wait: t.created || 'Recently',
        agent: t.agent || null,
        source: 'ticket'
      }));

    // If tickets are present, use them
    if (ticketItems.length > 0) {
      return ticketItems;
    }

    // Otherwise, check active sessions
    const sessionItems = activeSessions
      .filter(s => s && s.customer)
      .filter(s => !isMockCustomer(s.customer?.name || s.customer_name) && !isMockTicketOrSession(s.id))
      .map(s => ({
        id: s.id,
        customer: s.customer?.name || s.customer_name || 'Customer',
        company: s.customer?.company || 'Enterprise Account',
        subject: s.title || s.customer?.initial_msg || 'Live Inquiry',
        channel: 'chat',
        priority: 'high',
        wait: s.updated_at || 'Active',
        agent: s.assigned_agent || null,
        source: 'session'
      }));

    return sessionItems;
  }, [realTickets, activeSessions]);

  // Priority filtered list
  const filtered = useMemo(() => {
    return queue.filter(item => {
      if (filter === 'all') return true;
      return item.priority === filter;
    });
  }, [queue, filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveSessions();
    await new Promise(r => setTimeout(r, 400));
    setIsRefreshing(false);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const assignToMe = (itemId) => {
    const activeAuth = getCurrentAuthUser();
    const myName = activeAuth?.displayName || (activeAuth?.email ? activeAuth.email.split('@')[0] : 'Me');
    setAssignedMap(prev => ({ ...prev, [itemId]: myName }));
  };

  const openInWorkspace = (item = null) => {
    if (!onNavigate) return;
    if (item) {
      onNavigate('workspace', {
        customer: {
          name: item.customer,
          company: item.company,
          plan: item.priority === 'urgent' ? 'Enterprise' : 'Standard',
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
            <span className="live-dot" /> {queue.length} conversation{queue.length === 1 ? '' : 's'} waiting · Updated {lastUpdated}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-ghost-sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn-primary-sm" onClick={() => openInWorkspace()}>
            <Zap size={14} /> Open Workspace
          </button>
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

      {queue.length === 0 ? (
        <div style={{
          padding: '64px 24px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginTop: '16px'
        }}>
          <Inbox size={42} style={{ color: 'var(--text-muted)', marginBottom: '14px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            Live Queue is Clean
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            No pending or unassigned tickets are currently waiting. New inbound tickets created by active users or inbound customer chats will appear here in real time.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary-sm" onClick={() => onNavigate && onNavigate('tickets')}>
              <Plus size={14} /> Create Ticket
            </button>
            <button className="btn-ghost-sm" onClick={() => openInWorkspace()}>
              <Zap size={14} /> Start Live Session
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginTop: '16px'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            No tickets found for priority filter "<strong>{filter}</strong>".
          </p>
          <button className="btn-ghost-sm" style={{ marginTop: '12px' }} onClick={() => setFilter('all')}>
            Show All ({queue.length})
          </button>
        </div>
      ) : (
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
                const ch = CHANNELS[item.channel] || CHANNELS.chat;
                const pr = PRIORITIES[item.priority] || PRIORITIES.normal;
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
      )}
    </div>
  );
}
