import React, { useState, useEffect } from 'react';
import {
  Bot, LayoutDashboard, MessageSquare, ListOrdered, Users, BarChart3,
  Award, UserCog, FileText, Settings, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Activity, Zap, Menu, X, Cloud, CloudOff, UserCheck
} from 'lucide-react';
import { onAuthChange, isFirebaseConfigured, getStoredFirebaseConfig } from '../api/firebase';
import AuthModal from './AuthModal';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workspace', label: 'Live Workspace', icon: Zap, highlight: true },
  { id: 'live-queue', label: 'Live Queue', icon: Activity, badge: 9 },
  { id: 'tickets', label: 'Tickets', icon: MessageSquare, badge: 247 },
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

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setCurrentUser(user);
      setIsConfigured(isFirebaseConfigured());
      setFirebaseConfig(getStoredFirebaseConfig());
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const notifications = [
    { id: 1, text: 'New urgent ticket #2341 from TechFlow Inc.', time: '2 min ago', unread: true },
    { id: 2, text: 'Agent Jordan T. burnout risk detected', time: '35 min ago', unread: true },
    { id: 3, text: 'CSAT report ready for download', time: '1 hr ago', unread: false },
    { id: 4, text: 'Ticket #2338 escalated to Tier 2', time: '2 hr ago', unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  const handleNav = (pageId) => {
    onNavigate(pageId);
    setMobileNavOpen(false);
  };

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
          {NAV_ITEMS.map(item => {
            const isActive = currentPage === item.id;
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
                    {item.badge && (
                      <span className="shell-nav-badge">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
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
            {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'AK'}
          </div>
          {!collapsed && (
            <div className="shell-user-info">
              <div className="shell-user-name">{currentUser?.displayName || 'Alex Kim'}</div>
              <div className="shell-user-role">{currentUser?.role || 'Admin'}</div>
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
                  {notifications.map(n => (
                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                      <div className="notif-text">{n.text}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="shell-icon-btn"
              onClick={() => onNavigate('landing')}
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
