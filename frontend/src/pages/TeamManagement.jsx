import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Mail, MoreHorizontal, Shield, User, Users, X, Check, 
  Search, CheckCircle2, Headphones, ShieldCheck, Trash2, Copy, 
  RefreshCw, AlertCircle, Building2, ChevronDown, Sparkles
} from 'lucide-react';
import { 
  onAuthChange, 
  listenToUsers, 
  updateUserRoleInFirestore, 
  updateUserStatusInFirestore, 
  updateUserDepartmentInFirestore,
  deleteUserFromFirestore,
  saveUserToFirestore,
  getCurrentAuthUser 
} from '../api/firebase';

const ROLES = {
  admin: { label: 'Administrator', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', icon: Shield },
  supervisor: { label: 'Supervisor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.35)', icon: ShieldCheck },
  agent: { label: 'Agent (Tier-1)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', icon: Headphones },
  specialist: { label: 'Tech Specialist', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.35)', icon: User },
};

const STATUS_STYLES = {
  online: { color: '#10b981', label: 'Online', bg: 'rgba(16, 185, 129, 0.12)' },
  away: { color: '#f59e0b', label: 'Away', bg: 'rgba(245, 158, 11, 0.12)' },
  offline: { color: '#64748b', label: 'Offline', bg: 'rgba(100, 116, 139, 0.12)' },
};

const DEPARTMENTS = ['Support', 'Enterprise Support', 'Technical Support'];

// Helper to determine if an account is an external customer
function isCustomerAccount(u) {
  if (!u) return false;
  const roleStr = String(u.role || u.roles || '').toLowerCase();
  const emailStr = String(u.email || '').toLowerCase().trim();
  const nameStr = String(u.displayName || u.name || '').toLowerCase().trim();

  if (roleStr.includes('customer') || roleStr.includes('client')) return true;
  if (emailStr === 'customer@client.com') return true;
  if (nameStr === 'david miller') return true;
  if (u.isCustomerTicket || u.plan) return true;
  return false;
}

function getInitialMembers() {
  let currentUser = null;
  try {
    const raw = localStorage.getItem('carebot_local_user');
    if (raw) currentUser = JSON.parse(raw);
  } catch {}

  if (currentUser && !isCustomerAccount(currentUser)) {
    return [{
      id: currentUser.uid || 'current-user',
      name: currentUser.displayName || 'Support Specialist',
      email: currentUser.email || 'agent@omnidesk.ai',
      role: (currentUser.role || '').toLowerCase().includes('admin') ? 'admin' : ((currentUser.role || '').toLowerCase().includes('sup') ? 'supervisor' : 'agent'),
      department: currentUser.department || 'Support',
      status: 'online',
      joined: 'Active Now',
      avatar: (currentUser.displayName || 'Support Specialist').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase(),
      color: '#2563eb',
      isCurrent: true
    }];
  }
  return [];
}

export default function TeamManagement() {
  const [members, setMembers] = useState(getInitialMembers);
  const [currentUser, setCurrentUser] = useState(() => getCurrentAuthUser());
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent', department: 'Support' });
  const [roleNotice, setRoleNotice] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const menuRef = useRef(null);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let activeUser = currentUser || getCurrentAuthUser();
    const unsubAuth = onAuthChange((user) => {
      activeUser = user;
      setCurrentUser(user);
    });

    const unsubUsers = listenToUsers((firestoreUsers) => {
      let rawList = Array.isArray(firestoreUsers) ? [...firestoreUsers] : [];

      // 1. FILTER OUT EXTERNAL CUSTOMERS (customers belong in the Customers tab)
      rawList = rawList.filter(u => !isCustomerAccount(u));

      // 2. Ensure current internal user is present
      const userRef = activeUser || currentUser || getCurrentAuthUser();
      if (userRef && userRef.email && !isCustomerAccount(userRef)) {
        const exists = rawList.some(u => 
          (u.uid && u.uid === userRef.uid) || 
          (u.email && u.email.toLowerCase().trim() === userRef.email.toLowerCase().trim())
        );
        if (!exists) {
          rawList.unshift({
            uid: userRef.uid || 'current-user',
            displayName: userRef.displayName || userRef.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: userRef.email,
            role: userRef.role || 'Tier-1 Specialist',
            department: userRef.department || 'Support',
            status: 'online',
            lastLoginAt: new Date().toISOString()
          });
        }
      }

      // 3. DEDUPLICATE STRICTLY BY EMAIL
      const emailMap = new Map();
      rawList.forEach(u => {
        if (!u || !u.email) return;
        const normEmail = u.email.toLowerCase().trim();
        if (!emailMap.has(normEmail)) {
          emailMap.set(normEmail, u);
        } else {
          // If existing is a placeholder and new has real uid, merge
          const existing = emailMap.get(normEmail);
          const isExistingDemo = String(existing.uid || '').startsWith('user_');
          const isNewReal = u.uid && !String(u.uid).startsWith('user_');
          if (isExistingDemo && isNewReal) {
            emailMap.set(normEmail, { ...existing, ...u });
          }
        }
      });

      const uniqueUsers = Array.from(emailMap.values());

      if (uniqueUsers.length > 0) {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#2563eb'];
        const mapped = uniqueUsers.map((u, idx) => {
          const rawRole = String(u.role || u.roles || 'agent').toLowerCase();
          let roleKey = 'agent';
          if (rawRole.includes('admin') || rawRole.includes('super')) {
            roleKey = 'admin';
          } else if (rawRole.includes('sup') || rawRole.includes('lead')) {
            roleKey = 'supervisor';
          } else if (rawRole.includes('spec') || rawRole.includes('tech')) {
            roleKey = 'specialist';
          }

          const name = u.displayName || (u.email ? u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Support Specialist');
          const initials = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'AG';
          const isCurrent = !!(userRef && (userRef.uid === u.uid || (userRef.email && userRef.email.toLowerCase().trim() === (u.email || '').toLowerCase().trim())));

          // Realistic status logic: current user is online, others respect status or last login
          let userStatus = u.status;
          if (isCurrent) {
            userStatus = 'online';
          } else if (!userStatus) {
            // Default inactive accounts to offline rather than making all 25 "online"
            userStatus = idx < 3 ? 'online' : (idx < 6 ? 'away' : 'offline');
          }

          return {
            id: u.uid || u.id || `user-${idx}`,
            name: name,
            email: u.email,
            role: roleKey,
            department: u.department || (idx % 3 === 0 ? 'Enterprise Support' : (idx % 3 === 1 ? 'Technical Support' : 'Support')),
            status: userStatus,
            joined: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Active',
            avatar: initials,
            color: colors[idx % colors.length],
            isCurrent: isCurrent
          };
        });

        // Ensure current user is at the top of the list
        mapped.sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0));
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

  // Update member role
  const handleRoleChange = async (memberId, memberName, newRoleKey) => {
    const roleValue = newRoleKey === 'admin' 
      ? 'Administrator' 
      : (newRoleKey === 'supervisor' 
        ? 'Supervisor' 
        : (newRoleKey === 'specialist' ? 'Technical Specialist' : 'Tier-1 Specialist'));
    
    // Optimistic UI update
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRoleKey } : m));
    
    // Sync with Firestore
    const ok = await updateUserRoleInFirestore(memberId, roleValue);
    if (ok) {
      setRoleNotice(`Updated ${memberName}'s role to ${roleValue}`);
      setTimeout(() => setRoleNotice(null), 3500);
    }
  };

  // Update member department
  const handleDepartmentChange = async (memberId, memberName, newDept) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, department: newDept } : m));
    const ok = await updateUserDepartmentInFirestore(memberId, newDept);
    if (ok) {
      setRoleNotice(`Transferred ${memberName} to ${newDept}`);
      setTimeout(() => setRoleNotice(null), 3500);
    }
  };

  // Toggle member status
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

  // Remove member from team
  const handleRemoveMember = async (member) => {
    if (member.isCurrent) {
      alert("You cannot remove your own active account from the team.");
      return;
    }

    setMembers(prev => prev.filter(m => m.id !== member.id));
    setActiveMenuId(null);
    setDeleteConfirmMember(null);

    await deleteUserFromFirestore(member.id);
    setRoleNotice(`Removed ${member.name} from the support team.`);
    setTimeout(() => setRoleNotice(null), 3500);
  };

  // Invite member submission
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;

    const emailClean = inviteForm.email.toLowerCase().trim();

    // Prevent duplicate invite
    if (members.some(m => m.email.toLowerCase().trim() === emailClean)) {
      alert(`A team member with email ${emailClean} already exists.`);
      return;
    }

    const roleValue = inviteForm.role === 'admin' 
      ? 'Administrator' 
      : (inviteForm.role === 'supervisor' 
        ? 'Supervisor' 
        : (inviteForm.role === 'specialist' ? 'Technical Specialist' : 'Tier-1 Specialist'));
    
    const newUid = 'user_' + emailClean.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Save to Firestore
    await saveUserToFirestore({
      uid: newUid,
      email: emailClean,
      displayName: inviteForm.name.trim()
    }, {
      role: roleValue,
      roles: roleValue,
      department: inviteForm.department,
      status: 'offline'
    });

    // Add to local state
    const newMember = {
      id: newUid,
      name: inviteForm.name.trim(),
      email: emailClean,
      role: inviteForm.role,
      department: inviteForm.department,
      status: 'offline',
      joined: 'Just now',
      avatar: inviteForm.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'TM',
      color: '#8b5cf6',
      isCurrent: false
    };

    setMembers(prev => [...prev, newMember]);
    setRoleNotice(`Invited ${inviteForm.name.trim()} (${roleValue}) to ${inviteForm.department}`);
    setTimeout(() => setRoleNotice(null), 4000);
    setInviteForm({ name: '', email: '', role: 'agent', department: 'Support' });
    setShowInvite(false);
  };

  // Copy email with feedback
  const copyEmail = (email) => {
    navigator.clipboard?.writeText(email);
    setRoleNotice(`Copied ${email} to clipboard!`);
    setTimeout(() => setRoleNotice(null), 2500);
    setActiveMenuId(null);
  };

  // Filtered members
  const filtered = members.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !search || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
    const matchDept = deptFilter === 'all' || m.department === deptFilter;
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    return matchSearch && matchDept && matchRole;
  });

  // Group by Department
  const groupedByDept = DEPARTMENTS.reduce((acc, d) => {
    const group = filtered.filter(m => m.department === d);
    if (group.length > 0) acc[d] = group;
    return acc;
  }, {});
  if (deptFilter !== 'all') {
    Object.keys(groupedByDept).forEach(k => { if (k !== deptFilter) delete groupedByDept[k]; });
  }

  // Statistics
  const countOnline = members.filter(m => m.status === 'online').length;
  const countAdmins = members.filter(m => m.role === 'admin').length;
  const countAgents = members.filter(m => m.role === 'agent' || m.role === 'specialist' || m.role === 'supervisor').length;

  return (
    <div className="page-content" style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            Team Management
          </h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage support staff roles, departmental routing, and active agent availability.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowInvite(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}
        >
          <Plus size={15} />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{members.length}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Staff Members</div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f43f5e' }}>{countAdmins}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Administrators</div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Headphones size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{countAgents}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Support Specialists</div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{countOnline}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Currently Online</div>
          </div>
        </div>
      </div>

      {/* Floating Status / Role Notice */}
      {roleNotice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          <CheckCircle2 size={16} />
          <span>{roleNotice}</span>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '18px',
        flexWrap: 'wrap'
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            id="team-search"
            type="text"
            placeholder="Search by staff name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Department Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className={`filter-chip ${deptFilter === 'all' ? 'active' : ''}`}
              onClick={() => setDeptFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: deptFilter === 'all' ? '1px solid #2563eb' : '1px solid var(--border-subtle)',
                background: deptFilter === 'all' ? '#2563eb' : 'var(--bg-card)',
                color: deptFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              All Departments
            </button>
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                type="button"
                className={`filter-chip ${deptFilter === d ? 'active' : ''}`}
                onClick={() => setDeptFilter(d)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: deptFilter === d ? '1px solid #2563eb' : '1px solid var(--border-subtle)',
                  background: deptFilter === d ? '#2563eb' : 'var(--bg-card)',
                  color: deptFilter === d ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="supervisor">Supervisors</option>
            <option value="agent">Agents (Tier-1)</option>
            <option value="specialist">Tech Specialists</option>
          </select>
        </div>
      </div>

      {/* Team Members List Grouped by Department */}
      {Object.keys(groupedByDept).length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          margin: '20px 0'
        }}>
          <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            No staff members match your criteria
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
            {search ? `No staff members found matching "${search}".` : 'Try clearing your active filters.'}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { setSearch(''); setDeptFilter('all'); setRoleFilter('all'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        Object.entries(groupedByDept).map(([dept, deptMembers]) => (
          <div key={dept} style={{ marginBottom: '24px' }}>
            {/* Department Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>
              <Building2 size={15} style={{ color: '#60a5fa' }} />
              <span>{dept}</span>
              <span style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                padding: '1px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {deptMembers.length}
              </span>
            </div>

            {/* Department Table Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              overflow: 'visible'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member</th>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined</th>
                    <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deptMembers.map(m => {
                    const role = ROLES[m.role] || ROLES.agent;
                    const st = STATUS_STYLES[m.status] || STATUS_STYLES.offline;
                    const RoleIcon = role.icon;
                    const isMenuOpen = activeMenuId === m.id;

                    return (
                      <tr 
                        key={m.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Member Avatar & Details */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: m.color ? `${m.color}25` : 'rgba(59, 130, 246, 0.2)',
                              color: m.color || '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}>
                              {m.avatar}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.name}
                                </span>
                                {m.isCurrent && (
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(37, 99, 235, 0.15)',
                                    color: '#3b82f6',
                                    fontWeight: 700,
                                    border: '1px solid rgba(37, 99, 235, 0.3)'
                                  }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {m.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* In-Place Role Selector */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, m.name, e.target.value)}
                              aria-label={`Change role for ${m.name}`}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: `1.5px solid ${role.color}`,
                                background: role.bg,
                                color: role.color,
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="admin" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Administrator</option>
                              <option value="supervisor" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Supervisor</option>
                              <option value="agent" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Agent (Tier-1)</option>
                              <option value="specialist" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tech Specialist</option>
                            </select>
                          </div>
                        </td>

                        {/* In-Place Department Selector */}
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={m.department}
                            onChange={(e) => handleDepartmentChange(m.id, m.name, e.target.value)}
                            aria-label={`Change department for ${m.name}`}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-input, var(--bg-card))',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {DEPARTMENTS.map(d => (
                              <option key={d} value={d} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Interactive Status Toggle */}
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            type="button"
                            onClick={() => toggleStatus(m.id)}
                            title="Click to toggle availability status (Online / Away / Offline)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: st.bg,
                              border: `1px solid ${st.color}40`,
                              color: st.color,
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.color }} />
                            <span>{st.label}</span>
                          </button>
                        </td>

                        {/* Joined Date */}
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {m.joined}
                        </td>

                        {/* Actions Column with Functional Dropdown Menu */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => window.open(`mailto:${m.email}`)}
                              title={`Send email to ${m.name}`}
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              <Mail size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveMenuId(isMenuOpen ? null : m.id)}
                              title="Member actions menu"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: isMenuOpen ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                                background: isMenuOpen ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                color: isMenuOpen ? '#3b82f6' : 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>

                          {/* Action Popover Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              style={{
                                position: 'absolute',
                                right: '16px',
                                top: '48px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-strong, #cbd5e1)',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                zIndex: 100,
                                width: '180px',
                                padding: '6px',
                                textAlign: 'left'
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => copyEmail(m.email)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Copy size={13} color="#60a5fa" />
                                <span>Copy Email</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => { toggleStatus(m.id); setActiveMenuId(null); }}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <RefreshCw size={13} color="#f59e0b" />
                                <span>Cycle Status</span>
                              </button>

                              {!m.isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => { setDeleteConfirmMember(m); setActiveMenuId(null); }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    borderTop: '1px solid var(--border-subtle)',
                                    marginTop: '4px',
                                    paddingTop: '6px'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Trash2 size={13} color="#ef4444" />
                                  <span>Remove Member</span>
                                </button>
                              )}
                            </div>
                          )}
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

      {/* Invite Team Member Modal */}
      {showInvite && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowInvite(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            className="modal-card" 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '1px solid var(--border-strong)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Invite Team Member
              </h2>
              <button 
                type="button"
                onClick={() => setShowInvite(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Sarah Connor" 
                  value={inviteForm.name} 
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Work Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="email" 
                  placeholder="e.g. sarah@omnidesk.ai" 
                  value={inviteForm.email} 
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} 
                  required 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Team Role
                  </label>
                  <select 
                    value={inviteForm.role} 
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="agent">Agent (Tier-1)</option>
                    <option value="specialist">Tech Specialist</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Department
                  </label>
                  <select 
                    value={inviteForm.department} 
                    onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowInvite(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Mail size={13} />
                  <span>Send Staff Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {deleteConfirmMember && (
        <div 
          className="modal-overlay" 
          onClick={() => setDeleteConfirmMember(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            className="modal-card" 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '1px solid var(--border-strong)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertCircle size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Remove Team Member</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to remove <strong>{deleteConfirmMember.name}</strong> ({deleteConfirmMember.email}) from the OmniDesk support staff? This action will revoke their internal access.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setDeleteConfirmMember(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleRemoveMember(deleteConfirmMember)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
