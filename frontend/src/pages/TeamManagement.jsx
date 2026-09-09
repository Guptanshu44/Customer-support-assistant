import React, { useState, useEffect } from 'react';
import { Plus, Mail, MoreHorizontal, Shield, User, Users, X, Check, Search } from 'lucide-react';
import { onAuthChange } from '../api/firebase';

const ROLES = {
  admin: { label: 'Admin', color: '#f43f5e', bg: '#f43f5e18', icon: Shield },
  supervisor: { label: 'Supervisor', color: '#8b5cf6', bg: '#8b5cf618', icon: Shield },
  agent: { label: 'Agent', color: '#6366f1', bg: '#6366f118', icon: User },
};
const STATUS_STYLES = {
  online: { color: '#10b981', label: 'Online' },
  away: { color: '#f59e0b', label: 'Away' },
  offline: { color: '#475569', label: 'Offline' },
};

const DEPARTMENTS = ['Support', 'Enterprise Support', 'Technical Support'];

function getInitialMembers() {
  let currentUser = null;
  try {
    const raw = localStorage.getItem('carebot_local_user');
    if (raw) currentUser = JSON.parse(raw);
  } catch {}

  const currentMember = {
    id: 'current-user',
    name: currentUser?.displayName || 'Support Specialist',
    email: currentUser?.email || 'agent@omnidesk.ai',
    role: (currentUser?.role || 'Supervisor').toLowerCase().includes('sup') ? 'supervisor' : 'admin',
    department: 'Support',
    status: 'online',
    joined: 'Active Now',
    avatar: (currentUser?.displayName || 'Support Specialist').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase(),
    color: '#2563eb',
    isCurrent: true
  };

  const teammates = [
    { id: 1, name: 'Alex Kim', email: 'alex.k@omnidesk.ai', role: 'admin', department: 'Support', status: 'online', joined: 'Jan 2024', avatar: 'AK', color: '#6366f1' },
    { id: 2, name: 'Maya Patel', email: 'maya.p@omnidesk.ai', role: 'supervisor', department: 'Enterprise Support', status: 'online', joined: 'Feb 2024', avatar: 'MP', color: '#10b981' },
    { id: 3, name: 'Jordan Torres', email: 'jordan.t@omnidesk.ai', role: 'agent', department: 'Support', status: 'away', joined: 'Mar 2024', avatar: 'JT', color: '#f59e0b' },
    { id: 4, name: 'Sam Nguyen', email: 'sam.n@omnidesk.ai', role: 'agent', department: 'Technical Support', status: 'online', joined: 'Mar 2024', avatar: 'SN', color: '#8b5cf6' },
    { id: 5, name: 'Olivia Chen', email: 'olivia.c@omnidesk.ai', role: 'agent', department: 'Support', status: 'online', joined: 'Apr 2024', avatar: 'OC', color: '#ec4899' },
    { id: 6, name: 'Ryan Miller', email: 'ryan.m@omnidesk.ai', role: 'agent', department: 'Technical Support', status: 'offline', joined: 'May 2024', avatar: 'RM', color: '#06b6d4' },
    { id: 7, name: 'Priya Sharma', email: 'priya.s@omnidesk.ai', role: 'supervisor', department: 'Enterprise Support', status: 'away', joined: 'Jun 2024', avatar: 'PS', color: '#f43f5e' },
  ];

  return [currentMember, ...teammates];
}

export default function TeamManagement() {
  const [members, setMembers] = useState(getInitialMembers);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent', department: 'Support' });

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (user) {
        setMembers(prev => prev.map(m => {
          if (m.isCurrent) {
            return {
              ...m,
              name: user.displayName || m.name,
              email: user.email || m.email,
              role: (user.role || 'Supervisor').toLowerCase().includes('sup') ? 'supervisor' : 'admin',
              avatar: (user.displayName || m.name).split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
            };
          }
          return m;
        }));
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const filtered = members.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !search || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
    const matchDept = deptFilter === 'all' || m.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;
    const initials = inviteForm.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    setMembers(m => [...m, {
      id: Date.now(),
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      department: inviteForm.department,
      status: 'offline',
      joined: 'Just now',
      avatar: initials,
      color: colors[m.length % colors.length],
    }]);
    setInviteForm({ name: '', email: '', role: 'agent', department: 'Support' });
    setShowInvite(false);
  };

  const toggleStatus = (id) => {
    const cycle = { online: 'away', away: 'offline', offline: 'online' };
    setMembers(ms => ms.map(m => m.id === id ? { ...m, status: cycle[m.status] } : m));
  };

  const groupedByDept = DEPARTMENTS.reduce((acc, d) => {
    const group = filtered.filter(m => m.department === d);
    if (group.length > 0) acc[d] = group;
    return acc;
  }, {});
  if (deptFilter !== 'all') {
    Object.keys(groupedByDept).forEach(k => { if (k !== deptFilter) delete groupedByDept[k]; });
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">{members.length} team members · {members.filter(m => m.status === 'online').length} online now</p>
        </div>
        <button className="btn-primary-sm" onClick={() => setShowInvite(true)}>
          <Plus size={14} /> Invite Member
        </button>
      </div>

      <div className="toolbar-row">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input id="team-search" type="text" className="search-input" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-bar" style={{ margin: 0 }}>
          <button className={`filter-chip ${deptFilter === 'all' ? 'active' : ''}`} onClick={() => setDeptFilter('all')}>All</button>
          {DEPARTMENTS.map(d => (
            <button key={d} className={`filter-chip ${deptFilter === d ? 'active' : ''}`} onClick={() => setDeptFilter(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(groupedByDept).length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          margin: '20px 0'
        }}>
          <Users size={32} style={{ color: 'var(--text-subtle)', marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>No team members found</div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            No team members matched your search "{search}". Try searching by another name or department.
          </p>
        </div>
      ) : (
        Object.entries(groupedByDept).map(([dept, deptMembers]) => (
          <div key={dept} className="team-dept-section">
            <div className="team-dept-label">
              <Users size={13} /> {dept}
              <span className="team-dept-count">{deptMembers.length}</span>
            </div>
            <div className="table-card" style={{ marginBottom: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deptMembers.map(m => {
                    const role = ROLES[m.role] || ROLES.agent;
                    const st = STATUS_STYLES[m.status] || STATUS_STYLES.offline;
                    return (
                      <tr key={m.id} className="table-row">
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar-sm" style={{ background: `${m.color}25`, color: m.color }}>
                              {m.avatar}
                            </div>
                            <div>
                              <div className="customer-name-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{m.name}</span>
                                {m.isCurrent && (
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(37, 99, 235, 0.12)',
                                    color: '#2563eb',
                                    fontWeight: 700
                                  }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="customer-company-sm">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="role-badge" style={{ background: role.bg, color: role.color }}>
                            <role.icon size={10} /> {role.label}
                          </span>
                        </td>
                        <td><span className="dept-text">{m.department}</span></td>
                        <td>
                          <button className="status-toggle" onClick={() => toggleStatus(m.id)} title="Click to cycle status">
                            <span className="status-dot" style={{ background: st.color }} />
                            <span style={{ color: st.color }}>{st.label}</span>
                          </button>
                        </td>
                        <td><span className="time-cell">{m.joined}</span></td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="tbl-btn-ghost"
                              onClick={() => window.open(`mailto:${m.email}`)}
                              title={`Send email to ${m.name} (${m.email})`}
                            >
                              <Mail size={12} />
                            </button>
                            <button
                              type="button"
                              className="tbl-btn-ghost"
                              onClick={() => navigator.clipboard?.writeText(m.email)}
                              title={`Copy ${m.email}`}
                            >
                              <MoreHorizontal size={12} />
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
        ))
      )}

      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Invite Team Member</h2>
              <button className="modal-close-btn" onClick={() => setShowInvite(false)}><X size={16} /></button>
            </div>
            <form className="modal-form" onSubmit={handleInvite}>
              <div className="modal-field">
                <label className="auth-label">Full Name</label>
                <input className="auth-input" type="text" placeholder="Jane Smith" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="modal-field">
                <label className="auth-label">Work Email</label>
                <input className="auth-input" type="email" placeholder="jane@company.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="modal-field">
                <label className="auth-label">Role</label>
                <select className="auth-input" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="agent">Agent</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-field">
                <label className="auth-label">Department</label>
                <select className="auth-input" value={inviteForm.department} onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn-primary-sm"><Mail size={13} /> Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
