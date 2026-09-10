import React, { useState, useEffect } from 'react';
import {
  Bot, LayoutDashboard, MessageSquare, ListOrdered, Users, BarChart3,
  Award, UserCog, FileText, Settings, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Activity, Zap, Menu, X, Cloud, CloudOff, UserCheck
} from 'lucide-react';
import { onAuthChange, isFirebaseConfigured, getStoredFirebaseConfig, logoutUser, listenToTickets } from '../api/firebase';
import AuthModal from './AuthModal';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workspace', label: 'Live Workspace', icon: Zap, highlight: true },
  { id: 'live-queue', label: 'Live Queue', icon: Activity },
  { id: 'tickets', label: 'Tickets', icon: MessageSquare },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'agent-perf', label: 'Agent Performance', icon: Award },
  { id: 'team', label: 'Team Management', icon: UserCog },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  workspace: 'Live Workspace',
  'live-queue': 'Live Queue',
  tickets: 'Tickets',
  customers: 'Customers',
  analytics: 'Analytics',
  'agent-perf': 'Agent Performance',
  team: 'Team Management',
  reports: 'Reports',
  settings: 'Settings',
};

export default function AppShell({ children, currentPage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(() => isFirebaseConfigured());
  const [firebaseConfig, setFirebaseConfig] = useState(() => getStoredFirebaseConfig());
  const [liveTickets, setLiveTickets] = useState([]);

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setCurrentUser(user);
      setIsConfigured(isFirebaseConfigured());
      setFirebaseConfig(getStoredFirebaseConfig());
    });
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    const unsubTickets = listenToTickets((fireTickets) => {
      if (Array.isArray(fireTickets)) {
        setLiveTickets(fireTickets);
      }
    });
    return () => { if (unsubTickets) unsubTickets(); };
  }, []);

  // Compute live notifications from real tickets
  const notifications = liveTickets.slice(0, 5).map((t, idx) => ({
    id: t.id || idx,
    text: `Ticket #${t.id}: ${t.subject || 'New inquiry'} (${t.customer || 'Customer'})`,
    time: t.created || 'Active',
    unread: t.status === 'open'
  }));
  const unreadCount = notifications.filter(n => n.unread).length;
  const queueCount = liveTickets.filter(t => t.status === 'open' || t.status === 'pending').length;
  const totalTicketsCount = liveTickets.length;

  const handleNav = (pageId) => {
    onNavigate(pageId);
    setMobileNavOpen(false);
  };

  const isAdmin = Boolean(
    currentUser && (
      ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(String(currentUser.email || '').toLowerCase().trim()) ||
      String(currentUser.role || '').toLowerCase().includes('admin') ||
      String(currentUser.role || '').toLowerCase().includes('supervisor') ||
      (Array.isArray(currentUser.roles) && currentUser.roles.some(r => String(r).toLowerCase().includes('admin') || String(r).toLowerCase().includes('supervisor')))
    )
  );

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (isAdmin) return true;
    return ['dashboard', 'workspace', 'tickets', 'reports', 'settings'].includes(item.id);
  });

  return (
    <div className="shell-root">
      <div
        className={`shell-backdrop ${mobileNavOpen ? 'active' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <aside className={`shell-sidebar ${collapsed ? 'collapsed' : ''} ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="shell-logo" onClick={() => handleNav('dashboard')}>
          <div className="shell-logo-icon">
            <Bot size={16} color="#fff" />
          </div>
          {!collapsed && (
          <span className="shell-logo-text">
              OmniDesk <span className="shell-logo-ai">Copilot</span>
            </span>
          )}
          <button
            className="shell-mobile-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMobileNavOpen(false);
            }}
            title="Close Menu"
            aria-label="Close Navigation"
          >
            <X size={15} />
          </button>
        </div>

        <nav className="shell-nav">
          {visibleNavItems.map(item => {
            const isActive = currentPage === item.id;
            const badgeValue = item.id === 'live-queue'
              ? (queueCount > 0 ? queueCount : null)
              : item.id === 'tickets'
                ? (totalTicketsCount > 0 ? totalTicketsCount : null)
                : null;

            return (
              <button
                key={item.id}
                className={`shell-nav-item ${isActive ? 'active' : ''} ${item.highlight ? 'nav-highlight' : ''}`}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} className="shell-nav-icon" />
                {!collapsed && (
                  <>
                    <span className="shell-nav-label">{item.label}</span>
                    {badgeValue && (
                      <span className="shell-nav-badge">
                        {badgeValue > 99 ? '99+' : badgeValue}
                      </span>
                    )}
                  </>
                )}
                {collapsed && badgeValue && (
                  <span className="shell-nav-badge-dot" />
                )}
              </button>
            );
          })}
        </nav>

        <button
          className="shell-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <div 
          className="shell-user" 
          onClick={() => setIsAuthModalOpen(true)} 
          title="Click to view Agent Profile / Manage Firebase"
          style={{ cursor: 'pointer' }}
        >
          <div className="shell-user-avatar">
            {currentUser?.displayName
              ? currentUser.displayName.substring(0, 2).toUpperCase()
              : (currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : 'AG')}
          </div>
          {!collapsed && (
            <div className="shell-user-info">
              <div className="shell-user-name">{currentUser?.displayName || currentUser?.email || 'Active Agent'}</div>
              <div className="shell-user-role">{currentUser?.role || (isAdmin ? 'Administrator' : 'Specialist')}</div>
            </div>
          )}
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <button
              className="shell-mobile-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              title="Open Menu"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>
            <div className="shell-breadcrumb">
              <Bot size={14} style={{ color: 'var(--primary)' }} />
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-page">{PAGE_TITLES[currentPage] || 'Dashboard'}</span>
            </div>
          </div>
          <div className="shell-topbar-right">
            {/* Cloud Sync Status Indicator */}
            <button
              className={`shell-cloud-badge ${isConfigured ? 'cloud-online' : 'cloud-local'}`}
              onClick={() => setIsAuthModalOpen(true)}
              title={isConfigured ? `Cloud Firestore Connected (Project: ${firebaseConfig?.projectId || 'active'})` : 'Firebase Unconfigured — Click to set up'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: 'var(--radius-full)',
                border: isConfigured ? '1px solid #86efac' : '1px solid #fde047',
                background: isConfigured ? '#f0fdf4' : '#fefce8',
                color: isConfigured ? '#15803d' : '#854d0e',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isConfigured ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  <Cloud size={13} />
                  <span>Cloud Synced</span>
                </>
              ) : (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
                  <CloudOff size={13} />
                  <span>Local Mode</span>
                </>
              )}
            </button>

            {/* Agent Profile Pill */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              title="Manage Account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#1d4ed8',
                color: '#fff',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'A'}
              </div>
              <span>{currentUser ? (currentUser.displayName?.split(' ')[0] || 'Agent') : 'Sign In'}</span>
            </button>

            <div className="notif-wrap">
              <button
                className="shell-icon-btn"
                onClick={() => setNotifOpen(o => !o)}
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    Notifications
                    <span className="notif-unread-count">{unreadCount} new</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No active notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                        <div className="notif-text">{n.text}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              className="shell-icon-btn"
              onClick={async () => {
                await logoutUser();
                onNavigate('landing');
              }}
              title="Sign out"
              aria-label="Sign out to landing page"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="shell-content">
          {children}
        </main>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setIsConfigured(isFirebaseConfigured());
          setFirebaseConfig(getStoredFirebaseConfig());
        }}
        currentUser={currentUser}
        onUserChange={(u) => {
          setCurrentUser(u);
          setIsConfigured(isFirebaseConfigured());
          setFirebaseConfig(getStoredFirebaseConfig());
        }}
      />
    </div>
  );
}
