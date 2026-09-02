import React, { useState } from 'react';
import {
  Bot, LayoutDashboard, MessageSquare, ListOrdered, Users, BarChart3,
  Award, UserCog, FileText, Settings, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Activity, Zap
} from 'lucide-react';

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
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'New urgent ticket #2341 from TechFlow Inc.', time: '2 min ago', unread: true },
    { id: 2, text: 'Agent Jordan T. burnout risk detected', time: '35 min ago', unread: true },
    { id: 3, text: 'CSAT report ready for download', time: '1 hr ago', unread: false },
    { id: 4, text: 'Ticket #2338 escalated to Tier 2', time: '2 hr ago', unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="shell-root">
      {/* Left Sidebar */}
      <aside className={`shell-sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="shell-logo" onClick={() => onNavigate('dashboard')}>
          <div className="shell-logo-icon">
            <Bot size={16} color="#fff" />
          </div>
          {!collapsed && (
            <span className="shell-logo-text">
              CareBot <span className="shell-logo-ai">AI</span>
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="shell-nav">
          {NAV_ITEMS.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                className={`shell-nav-item ${isActive ? 'active' : ''} ${item.highlight ? 'nav-highlight' : ''}`}
                onClick={() => onNavigate(item.id)}
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

        {/* Collapse Toggle */}
        <button className="shell-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User Profile */}
        <div className="shell-user" onClick={() => onNavigate('settings')}>
          <div className="shell-user-avatar">AK</div>
          {!collapsed && (
            <div className="shell-user-info">
              <div className="shell-user-name">Alex Kim</div>
              <div className="shell-user-role">Admin</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="shell-main">
        {/* Top Header */}
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <div className="shell-breadcrumb">
              <Bot size={14} style={{ color: 'var(--primary)' }} />
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-page">{PAGE_TITLES[currentPage] || 'Dashboard'}</span>
            </div>
          </div>
          <div className="shell-topbar-right">
            {/* Notification Bell */}
            <div className="notif-wrap">
              <button
                className="shell-icon-btn"
                onClick={() => setNotifOpen(o => !o)}
                title="Notifications"
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
            {/* Logout */}
            <button className="shell-icon-btn" onClick={() => onNavigate('landing')} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="shell-content">
          {children}
        </main>
      </div>
    </div>
  );
}
