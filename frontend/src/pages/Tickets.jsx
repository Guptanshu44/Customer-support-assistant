import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, ChevronRight, X, MessageSquare, Mail, Phone,
  Clock, Tag, User, ExternalLink, CheckCircle, AlertTriangle, RotateCcw,
  Inbox, Plus, Cloud, CloudOff, ShieldCheck, Check, Sparkles
} from 'lucide-react';
import { api, formatTicketTime } from '../api/client';
import { 
  listenToTickets, 
  saveTicketToFirestore, 
  deleteTicketFromFirestore, 
  isFirebaseConfigured,
  getCurrentAuthUser,
  onAuthChange,
  purgeMockFirestoreRecords,
  isMockTicketOrSession
} from '../api/firebase';

const STATUS = {
  open: { label: 'Open', color: '#6366f1', bg: '#6366f118' },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#f59e0b18' },
  resolved: { label: 'Resolved / Approved', shortLabel: 'Resolved', color: '#10b981', bg: '#10b98118' },
  closed: { label: 'Closed', color: '#64748b', bg: '#64748b18' },
};

function normalizeStatus(s) {
  if (!s) return 'open';
  const clean = String(s).toLowerCase().trim();
  if (clean === 'approved') return 'resolved';
  if (STATUS[clean]) return clean;
  return 'open';
}

const CHANNELS = {
  chat: { icon: MessageSquare, color: '#6366f1' },
  email: { icon: Mail, color: '#10b981' },
  phone: { icon: Phone, color: '#f59e0b' },
};

const TICKETS_STORAGE_KEY = 'carebot_tickets_list_v2';

function getInitials(name) {
  if (!name) return 'CU';
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  let h = 0; for (let c of (name || 'T')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

export default function Tickets({ onNavigate, currentUser: propUser, isAdmin: propIsAdmin }) {
  const [authDataUser, setAuthDataUser] = useState(() => propUser || getCurrentAuthUser());

  useEffect(() => {
    if (propUser) setAuthDataUser(propUser);
  }, [propUser]);

  useEffect(() => {
    const unsub = onAuthChange((u) => setAuthDataUser(u));
    return () => { if (unsub) unsub(); };
  }, []);

  const activeUser = authDataUser || propUser;
  const activeUserEmail = String(activeUser?.email || '').toLowerCase().trim();
  const activeUserName = activeUser?.displayName || (activeUser?.email ? activeUser.email.split('@')[0] : 'Support Agent');

  const isAdmin = Boolean(
    propIsAdmin || (
      activeUser && (
        ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(activeUserEmail) ||
        String(activeUser.role || '').toLowerCase().includes('admin') ||
        String(activeUser.role || '').toLowerCase().includes('supervisor') ||
        (Array.isArray(activeUser.roles) && activeUser.roles.some(r => {
          const s = String(r).toLowerCase();
          return s.includes('admin') || s.includes('supervisor');
        }))
      )
    )
  );

  const [ticketsList, setTicketsList] = useState(() => {
    try {
      const stored = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(t => t && !isMockTicketOrSession(t.id))
            .map(t => ({
              ...t,
              created: formatTicketTime(t)
            }));
        }
      }
    } catch {}
    return [];
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [viewScope, setViewScope] = useState('all'); // 'all' or 'mine'
  const [selected, setSelected] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showNewModal, setShowNewModal] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(() => isFirebaseConfigured());

  const [newForm, setNewForm] = useState({
    subject: '',
    customer: '',
    company: '',
    status: 'open',
    channel: 'chat',
    priority: 'high',
    tags: 'support',
  });

  useEffect(() => {
    // Purge only legacy mock records on mount, protecting all user records
    purgeMockFirestoreRecords();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(ticketsList));
    } catch {}
  }, [ticketsList]);

  // Real-time Firestore sync if Firebase is configured
  useEffect(() => {
    if (isFirebaseConfigured()) {
      setIsCloudActive(true);
      const unsub = listenToTickets((cloudTickets) => {
        const filtered = (cloudTickets || [])
          .filter(t => t && !isMockTicketOrSession(t.id))
          .map(t => ({
            ...t,
            created: formatTicketTime(t)
          }));
        setTicketsList(filtered);
      }, () => {
        setIsCloudActive(false);
      });
      return () => { if (unsub) unsub(); };
    }
  }, []);

  // Extract unique user accounts for Admin filtering
  const userAccountsList = useMemo(() => {
    const map = new Map();
    ticketsList.forEach(t => {
      const email = (t.agentEmail || t.userAccount || '').toLowerCase().trim();
      const name = t.agent || t.createdBy || 'Support Agent';
      if (email && !map.has(email)) {
        map.set(email, { email, name: `${name} (${email})` });
      }
    });
    return Array.from(map.values());
  }, [ticketsList]);

  const filtered = useMemo(() => {
    return ticketsList.filter(t => {
      const matchSearch = !search ||
        t.subject?.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.toLowerCase().includes(search.toLowerCase()) ||
        (t.company && t.company.toLowerCase().includes(search.toLowerCase())) ||
        (t.agent && t.agent.toLowerCase().includes(search.toLowerCase())) ||
        (t.agentEmail && t.agentEmail.toLowerCase().includes(search.toLowerCase())) ||
        (t.userAccount && t.userAccount.toLowerCase().includes(search.toLowerCase()));

      const currentStatus = normalizeStatus(t.status);
      const matchStatus = statusFilter === 'all' || currentStatus === statusFilter;

      // Admin specific account filter
      const ticketAccount = (t.agentEmail || t.userAccount || '').toLowerCase().trim();
      const matchAccount = !isAdmin || accountFilter === 'all' || ticketAccount === accountFilter.toLowerCase();

      // Individual user view scope
      const isMine = Boolean(
        (t.agentEmail && activeUserEmail && t.agentEmail.toLowerCase() === activeUserEmail) ||
        (t.userAccount && activeUserEmail && t.userAccount.toLowerCase() === activeUserEmail) ||
        (t.agent && activeUserName && t.agent.toLowerCase() === activeUserName.toLowerCase()) ||
        (t.createdBy && activeUserName && t.createdBy.toLowerCase() === activeUserName.toLowerCase()) ||
        t.isUserCreated
      );
      const matchScope = isAdmin || viewScope === 'all' || isMine;

      return matchSearch && matchStatus && matchAccount && matchScope;
    });
  }, [ticketsList, search, statusFilter, accountFilter, viewScope, isAdmin, activeUserEmail, activeUserName]);

  const toggleRow = (id) => {
    setSelectedRows(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const cleanStatus = normalizeStatus(newStatus);
    setTicketsList(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { 
          ...t, 
          status: cleanStatus, 
          updatedAt: new Date().toISOString() 
        };
        if (isFirebaseConfigured()) {
          saveTicketToFirestore(updated);
        }
        return updated;
      }
      return t;
    }));
  };

  const handleBulkResolve = () => {
    setTicketsList(prev => prev.map(t => {
      if (selectedRows.has(t.id)) {
        const updated = { ...t, status: 'resolved', updatedAt: new Date().toISOString() };
        if (isFirebaseConfigured()) saveTicketToFirestore(updated);
        return updated;
      }
      return t;
    }));
    setSelectedRows(new Set());
  };

  const handleBulkReopen = () => {
    setTicketsList(prev => prev.map(t => {
      if (selectedRows.has(t.id)) {
        const updated = { ...t, status: 'open', updatedAt: new Date().toISOString() };
        if (isFirebaseConfigured()) saveTicketToFirestore(updated);
        return updated;
      }
      return t;
    }));
    setSelectedRows(new Set());
  };

  const handleBulkClose = () => {
    setTicketsList(prev => prev.map(t => {
      if (selectedRows.has(t.id)) {
        const updated = { ...t, status: 'closed', updatedAt: new Date().toISOString() };
        if (isFirebaseConfigured()) saveTicketToFirestore(updated);
        return updated;
      }
      return t;
    }));
    setSelectedRows(new Set());
  };

  const handleBulkDelete = () => {
    if (isFirebaseConfigured()) {
      selectedRows.forEach(id => deleteTicketFromFirestore(id));
    }
    setTicketsList(prev => prev.filter(t => !selectedRows.has(t.id)));
    if (selected && selectedRows.has(selected)) setSelected(null);
    setSelectedRows(new Set());
  };

  // Create new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newForm.subject.trim() || !newForm.customer.trim()) return;

    const newTicketId = `TK-${Math.floor(2350 + Math.random() * 7000)}`;
    const tagArray = newForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const now = new Date();
    const nowIso = now.toISOString();
    const exactTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialStatus = normalizeStatus(newForm.status || 'open');

    const newTicket = {
      id: newTicketId,
      subject: newForm.subject.trim(),
      customer: newForm.customer.trim(),
      company: newForm.company.trim() || 'Direct Client',
      status: initialStatus,
      channel: newForm.channel,
      agent: activeUserName,
      agentEmail: activeUserEmail,
      agentId: activeUser?.uid || '',
      createdBy: activeUserName,
      userAccount: activeUserEmail || activeUserName,
      isUserCreated: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      created: exactTime,
      priority: newForm.priority,
      tags: tagArray.length > 0 ? tagArray : ['support'],
    };

    setTicketsList(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
    setStatusFilter('all'); // Ensure ticket is immediately visible
    setAccountFilter('all');
    setSelected(newTicket.id);
    setShowNewModal(false);

    // Save to Firestore in real-time
    if (isFirebaseConfigured()) {
      saveTicketToFirestore(newTicket);
    }

    // Sync with backend / local session store with unified ID
    try {
      await api.createSession({
        session_id: newTicketId,
        id: newTicketId,
        name: newTicket.customer,
        company: newTicket.company,
        initial_message: newTicket.subject,
        title: `#${newTicket.id}: ${newTicket.subject}`,
      });
    } catch {}

    setNewForm({
      subject: '',
      customer: '',
      company: '',
      status: 'open',
      channel: 'chat',
      priority: 'high',
      tags: 'support',
    });
  };

  const selectedTicket = selected ? ticketsList.find(t => t.id === selected) : null;

  const countOpen = ticketsList.filter(t => normalizeStatus(t.status) === 'open').length;
  const countPending = ticketsList.filter(t => normalizeStatus(t.status) === 'pending').length;
  const countResolved = ticketsList.filter(t => normalizeStatus(t.status) === 'resolved').length;
  const countClosed = ticketsList.filter(t => normalizeStatus(t.status) === 'closed').length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Tickets</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 9px',
              borderRadius: 'var(--radius-full)',
              background: isCloudActive ? '#eff6ff' : '#f8fafc',
              border: isCloudActive ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
              color: isCloudActive ? '#1d4ed8' : 'var(--text-subtle)',
              fontSize: '11.5px',
              fontWeight: 600
            }}>
              {isCloudActive ? <Cloud size={12} /> : <CloudOff size={12} />}
              {isCloudActive ? 'Firestore Live' : 'Local Storage'}
            </span>
            {isAdmin && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 9px',
                borderRadius: 'var(--radius-full)',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: '11px',
                fontWeight: 700
              }}>
                <ShieldCheck size={12} /> Admin Mode · All Accounts
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {countOpen} open · {countPending} pending · {countResolved} resolved · {countClosed} closed · {ticketsList.length} total
          </p>
        </div>
        <button className="btn-primary-sm" onClick={() => setShowNewModal(true)}>
          <Plus size={14} /> New Ticket
        </button>
      </div>

      <div className="toolbar-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="search-wrap" style={{ minWidth: '220px' }}>
          <Search size={14} className="search-icon" />
          <input
            id="tickets-search"
            type="text"
            className="search-input"
            placeholder="Search tickets, customers, accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="filter-bar" style={{ margin: 0 }}>
          {['all', ...Object.keys(STATUS)].map(s => {
            const count = s === 'all' 
              ? ticketsList.length 
              : ticketsList.filter(t => normalizeStatus(t.status) === s).length;
            return (
              <button
                key={s}
                className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : STATUS[s].label} ({count})
              </button>
            );
          })}
        </div>

        {/* Admin Account Filter */}
        {isAdmin && userAccountsList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 600 }}>User Account:</span>
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                fontWeight: 500
              }}
            >
              <option value="all">All User Accounts ({ticketsList.length})</option>
              {userAccountsList.map(acc => (
                <option key={acc.email} value={acc.email}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Individual Agent Scope Switch */}
        {!isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className={`filter-chip ${viewScope === 'all' ? 'active' : ''}`}
              onClick={() => setViewScope('all')}
            >
              All Tickets ({ticketsList.length})
            </button>
            <button
              className={`filter-chip ${viewScope === 'mine' ? 'active' : ''}`}
              onClick={() => setViewScope('mine')}
            >
              My Tickets ({ticketsList.filter(t => {
                return (t.agentEmail && activeUserEmail && t.agentEmail.toLowerCase() === activeUserEmail) ||
                  (t.agent && activeUserName && t.agent.toLowerCase() === activeUserName.toLowerCase()) ||
                  t.isUserCreated;
              }).length})
            </button>
          </div>
        )}

        {selectedRows.size > 0 && (
          <div className="bulk-toolbar" style={{ marginLeft: 'auto' }}>
            <span>{selectedRows.size} selected</span>
            <button className="bulk-btn" onClick={handleBulkResolve}><CheckCircle size={12} /> Resolve</button>
            <button className="bulk-btn" onClick={handleBulkReopen}><RotateCcw size={12} /> Reopen</button>
            <button className="bulk-btn" onClick={handleBulkClose}><Check size={12} /> Close</button>
            <button className="bulk-btn danger" onClick={handleBulkDelete}><X size={12} /> Delete</button>
          </div>
        )}
      </div>

      <div className="tickets-layout">
        <div className={`table-card ${selectedTicket ? 'table-card-split' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={filtered.length > 0 && selectedRows.size === filtered.length}
                    onChange={e => {
                      setSelectedRows(e.target.checked ? new Set(filtered.map(t => t.id)) : new Set());
                    }}
                  />
                </th>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Channel</th>
                <th>{isAdmin ? 'Agent / User Account' : 'Agent'}</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                    <Inbox size={28} style={{ margin: '0 auto 8px', opacity: 0.5, display: 'block' }} />
                    No tickets match the active filters.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const normStatus = normalizeStatus(t.status);
                  const st = STATUS[normStatus] || STATUS.open;
                  const ch = CHANNELS[t.channel] || CHANNELS.chat;
                  const ac = avatarColor(t.customer);
                  const isSelected = selected === t.id;
                  const userAcc = t.agentEmail || t.userAccount || '';

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
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          value={normStatus}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                          style={{
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.color}55`,
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="pending">Pending</option>
                          <option value="resolved">Resolved / Approved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td>
                        <span className="channel-badge" style={{ background: `${ch.color}18`, color: ch.color }}>
                          <ch.icon size={11} />
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="agent-assigned" style={{ fontWeight: 600 }}>
                              {t.agent || t.createdBy || 'Unassigned'}
                            </span>
                            {isAdmin && (
                              <span style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 700
                              }}>
                                User
                              </span>
                            )}
                          </div>
                          {userAcc && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Mail size={10} style={{ opacity: 0.7 }} />
                              {userAcc}
                            </span>
                          )}
                        </div>
                      </td>
                      <td><span className="time-cell"><Clock size={11} /> {formatTicketTime(t)}</span></td>
                      <td>
                        <button className="tbl-btn-ghost" onClick={e => {
                          e.stopPropagation();
                          onNavigate('workspace', {
                            customer: {
                              sessionId: t.id,
                              ticketId: t.id,
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
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedTicket && (
          <div className="ticket-detail-panel">
            <div className="detail-panel-header">
              <span className="detail-ticket-id">#{selectedTicket.id}</span>
              <button className="detail-close-btn" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>
            <h3 className="detail-subject">{selectedTicket.subject}</h3>
            
            {/* Direct Status Selector Chips */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)', display: 'block', marginBottom: '5px' }}>
                Status:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {Object.entries(STATUS).map(([stKey, stConf]) => {
                  const isCurrent = normalizeStatus(selectedTicket.status) === stKey;
                  return (
                    <button
                      key={stKey}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedTicket.id, stKey)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontWeight: isCurrent ? 700 : 500,
                        border: isCurrent ? `2px solid ${stConf.color}` : '1px solid var(--border-subtle)',
                        background: isCurrent ? stConf.bg : 'var(--bg-surface-elevated)',
                        color: isCurrent ? stConf.color : 'var(--text-subtle)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {stConf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="detail-meta-rows">
              <div className="detail-meta-row">
                <span className="detail-meta-label"><User size={12} /> Customer</span>
                <span className="detail-meta-val">{selectedTicket.customer} · {selectedTicket.company}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><Mail size={12} /> User Account</span>
                <span className="detail-meta-val" style={{ fontFamily: 'var(--font-code)', fontSize: '11px' }}>
                  {selectedTicket.agentEmail || selectedTicket.userAccount || 'N/A'}
                </span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><User size={12} /> Created By</span>
                <span className="detail-meta-val">{selectedTicket.createdBy || selectedTicket.agent || 'N/A'}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><User size={12} /> Assigned Agent</span>
                <span className="detail-meta-val">{selectedTicket.agent || 'Unassigned'}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label"><Clock size={12} /> Created</span>
                <span className="detail-meta-val">{formatTicketTime(selectedTicket)}</span>
              </div>
            </div>

            <div className="detail-tags">
              {(selectedTicket.tags || []).map(tag => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn-primary-sm full-width" onClick={() => {
                onNavigate('workspace', {
                  customer: {
                    sessionId: selectedTicket.id,
                    ticketId: selectedTicket.id,
                    name: selectedTicket.customer,
                    company: selectedTicket.company,
                    plan: 'Enterprise',
                    initialMessage: selectedTicket.subject,
                  }
                });
              }}>
                <ExternalLink size={13} /> Open in Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ margin: 0 }}>Create New Support Ticket</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Creating for account: <strong style={{ color: 'var(--text-main)' }}>{activeUserName}</strong> ({activeUserEmail || 'Current Session'})
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowNewModal(false)}><X size={16} /></button>
            </div>
            <form className="modal-form" onSubmit={handleCreateTicket}>
              <div className="modal-field">
                <label className="auth-label">Customer Name</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Liam Vance"
                  value={newForm.customer}
                  onChange={e => setNewForm(f => ({ ...f, customer: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-field">
                <label className="auth-label">Company / Account</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newForm.company}
                  onChange={e => setNewForm(f => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="modal-field">
                <label className="auth-label">Ticket Subject / Inquiry</label>
                <textarea
                  className="auth-input"
                  rows={3}
                  placeholder="Describe the customer issue or request..."
                  value={newForm.subject}
                  onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))}
                  required
                />
              </div>

              {/* Status and Priority Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label className="auth-label">Initial Status</label>
                  <select
                    className="auth-input"
                    value={newForm.status}
                    onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved / Approved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label className="auth-label">Priority</label>
                  <select
                    className="auth-input"
                    value={newForm.priority}
                    onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Channel and Tags Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label className="auth-label">Channel</label>
                  <select
                    className="auth-input"
                    value={newForm.channel}
                    onChange={e => setNewForm(f => ({ ...f, channel: e.target.value }))}
                  >
                    <option value="chat">Chat</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label className="auth-label">Tags (comma-separated)</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="e.g. billing, sso, refund"
                    value={newForm.tags}
                    onChange={e => setNewForm(f => ({ ...f, tags: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => setShowNewModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-sm">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
