import React, { useState, useEffect } from 'react';
import { Plus, Mail, MoreHorizontal, Shield, User, Users, X, Check, Search, CheckCircle2 } from 'lucide-react';
import { onAuthChange, listenToUsers, updateUserRoleInFirestore, updateUserStatusInFirestore, saveUserToFirestore } from '../api/firebase';

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
    role: (currentUser?.role || '').toLowerCase().includes('admin') ? 'admin' : ((currentUser?.role || '').toLowerCase().includes('sup') ? 'supervisor' : 'agent'),
    department: 'Support',
    status: 'online',
    joined: 'Active Now',
    avatar: (currentUser?.displayName || 'Support Specialist').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase(),
    color: '#2563eb',
    isCurrent: true
  };

  if (currentUser) {
    return [currentMember];
  }
  return [];
}

export default function TeamManagement() {
  const [members, setMembers] = useState(getInitialMembers);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent', department: 'Support' });
  const [roleNotice, setRoleNotice] = useState(null);

  useEffect(() => {
    let activeUser = null;
    const unsubAuth = onAuthChange((user) => {
      activeUser = user;
      setCurrentUser(user);
    });

    const unsubUsers = listenToUsers((firestoreUsers) => {
      let usersList = Array.isArray(firestoreUsers) ? [...firestoreUsers] : [];
      const userRef = activeUser || currentUser;
      if (userRef && userRef.email) {
        const exists = usersList.some(u => 
          (u.uid && u.uid === userRef.uid) || 
          (u.email && u.email.toLowerCase() === userRef.email.toLowerCase())
        );
        if (!exists) {
          usersList.unshift({
            uid: userRef.uid || 'current-user',
            displayName: userRef.displayName || userRef.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: userRef.email,
            role: userRef.role || 'Tier-1 Specialist',
            department: 'Support',
            status: 'online',
            lastLoginAt: new Date().toISOString()
          });
        }
      }

      if (usersList.length > 0) {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
        const mapped = usersList.map((u, idx) => {
          const rawRole = String(u.role || u.roles || 'agent').toLowerCase();
          const roleKey = (rawRole.includes('admin') || rawRole.includes('super')) ? 'admin' : (rawRole.includes('sup') ? 'supervisor' : 'agent');
          const name = u.displayName || (u.email ? u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Support Specialist');
          const initials = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'AG';
          return {
            id: u.uid || u.id || `user-${idx}`,
            name: name,
            email: u.email || 'agent@omnidesk.ai',
            role: roleKey,
            department: u.department || (idx % 2 === 0 ? 'Support' : 'Enterprise Support'),
            status: u.status || 'online',
            joined: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Active',
            avatar: initials,
            color: colors[idx % colors.length],
            isCurrent: !!(userRef && (userRef.uid === u.uid || (userRef.email && userRef.email.toLowerCase() === (u.email || '').toLowerCase())))
          };
        });
        setMembers(mapped);
      } else {
        setMembers(getInitialMembers());
      }
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const handleRoleChange = async (memberId, memberName, newRoleKey) => {
    const roleValue = newRoleKey === 'admin' ? 'Administrator' : (newRoleKey === 'supervisor' ? 'Supervisor' : 'Tier-1 Specialist');
    
    // Optimistic UI update
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRoleKey } : m));
    
    // Sync with Firestore
    const ok = await updateUserRoleInFirestore(memberId, roleValue);
    if (ok) {
      setRoleNotice(`Updated ${memberName}'s role to ${roleValue}`);
      setTimeout(() => setRoleNotice(null), 4000);
    }
  };

  const filtered = members.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !search || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
    const matchDept = deptFilter === 'all' || m.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;
    const roleValue = inviteForm.role === 'admin' ? 'Administrator' : (inviteForm.role === 'supervisor' ? 'Supervisor' : 'Tier-1 Specialist');
    
    // Save to Firestore
    await saveUserToFirestore({
      uid: 'user_' + inviteForm.email.replace(/[^a-zA-Z0-9]/g, '_'),
      email: inviteForm.email,
      displayName: inviteForm.name
    }, {
      role: roleValue,
      roles: roleValue,
      department: inviteForm.department,
      status: 'offline'
    });

    setRoleNotice(`Created team member ${inviteForm.name} (${roleValue})`);
    setTimeout(() => setRoleNotice(null), 4000);
    setInviteForm({ name: '', email: '', role: 'agent', department: 'Support' });
    setShowInvite(false);
  };

  const toggleStatus = async (id) => {
    const cycle = { online: 'away', away: 'offline', offline: 'online' };
    const member = members.find(m => m.id === id);
    if (!member) return;
    const nextStatus = cycle[member.status] || 'online';

    // Optimistic UI update
    setMembers(ms => ms.map(m => m.id === id ? { ...m, status: nextStatus } : m));

    // Sync with Firestore
    const targetUid = (id && id !== 'current-user') ? id : currentUser?.uid;
    if (targetUid) {
      await updateUserStatusInFirestore(targetUid, nextStatus);
    }
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

      {roleNotice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          fontSize: '12.5px',
          fontWeight: 600,
          marginBottom: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} />
          <span>{roleNotice}</span>
        </div>
      )}

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
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, m.name, e.target.value)}
                            aria-label={`Change role for ${m.name}`}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              border: `1px solid ${role.color}40`,
                              background: role.bg,
                              color: role.color,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="agent" style={{ background: '#ffffff', color: '#0f172a' }}>Agent (Tier-1)</option>
                            <option value="supervisor" style={{ background: '#ffffff', color: '#0f172a' }}>Supervisor</option>
                            <option value="admin" style={{ background: '#ffffff', color: '#0f172a' }}>Administrator</option>
                          </select>
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
