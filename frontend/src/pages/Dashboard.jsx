import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, MessageSquare, Clock, Star, Users,
  ArrowUp, ArrowDown, Zap, AlertTriangle, CheckCircle, Activity,
  ExternalLink, RefreshCw, ShieldCheck, Sparkles, Filter
} from 'lucide-react';
import { api } from '../api/client';

// Preset timeframe data
const TIMEFRAME_DATA = {
  '24h': {
    label: 'Last 24 Hours',
    kpis: [
      { id: 'open-tickets', label: 'Open Tickets', value: '42', change: '+5', changeDir: 'up', changeBad: true, icon: MessageSquare, color: '#3b82f6', sub: 'vs yesterday' },
      { id: 'avg-response', label: 'Avg Response Time', value: '1m 18s', change: '-14s', changeDir: 'down', changeBad: false, icon: Clock, color: '#10b981', sub: 'vs yesterday' },
      { id: 'csat-score', label: 'CSAT Score', value: '94.6%', change: '+1.8%', changeDir: 'up', changeBad: false, icon: Star, color: '#f59e0b', sub: 'vs yesterday' },
      { id: 'active-agents', label: 'Active Agents', value: '18', change: '+2', changeDir: 'up', changeBad: false, icon: Users, color: '#8b5cf6', sub: 'online now' },
    ],
    spark: {
      tickets: [28, 32, 30, 36, 40, 38, 42],
      response: [95, 90, 88, 82, 80, 78, 78],
      csat: [91, 92, 92.5, 93, 94, 94.2, 94.6],
      agents: [14, 15, 16, 16, 17, 18, 18],
    }
  },
  '7d': {
    label: 'Last 7 Days',
    kpis: [
      { id: 'open-tickets', label: 'Open Tickets', value: '247', change: '+12', changeDir: 'up', changeBad: true, icon: MessageSquare, color: '#3b82f6', sub: 'vs last week' },
      { id: 'avg-response', label: 'Avg Response Time', value: '1m 42s', change: '-18s', changeDir: 'down', changeBad: false, icon: Clock, color: '#10b981', sub: 'vs last week' },
      { id: 'csat-score', label: 'CSAT Score', value: '91.4%', change: '+2.3%', changeDir: 'up', changeBad: false, icon: Star, color: '#f59e0b', sub: 'this week' },
      { id: 'active-agents', label: 'Active Agents', value: '22', change: '+4', changeDir: 'up', changeBad: false, icon: Users, color: '#8b5cf6', sub: 'peak roster' },
    ],
    spark: {
      tickets: [180, 210, 195, 240, 220, 250, 247],
      response: [130, 115, 120, 105, 108, 98, 102],
      csat: [86, 88, 87, 90, 89, 91, 91.4],
      agents: [16, 17, 18, 19, 20, 21, 22],
    }
  },
  '30d': {
    label: 'Last 30 Days',
    kpis: [
      { id: 'open-tickets', label: 'Tickets Handled', value: '1,142', change: '-84', changeDir: 'down', changeBad: false, icon: MessageSquare, color: '#3b82f6', sub: 'vs prev month' },
      { id: 'avg-response', label: 'Avg Response Time', value: '1m 55s', change: '-28s', changeDir: 'down', changeBad: false, icon: Clock, color: '#10b981', sub: 'vs prev month' },
      { id: 'csat-score', label: 'CSAT Score', value: '92.8%', change: '+3.1%', changeDir: 'up', changeBad: false, icon: Star, color: '#f59e0b', sub: 'monthly avg' },
      { id: 'active-agents', label: 'Active Agents', value: '26', change: '+6', changeDir: 'up', changeBad: false, icon: Users, color: '#8b5cf6', sub: 'avg staffing' },
    ],
    spark: {
      tickets: [850, 920, 990, 1050, 1100, 1130, 1142],
      response: [145, 138, 130, 122, 120, 116, 115],
      csat: [88, 89, 90, 90.5, 91.8, 92.4, 92.8],
      agents: [18, 20, 21, 22, 24, 25, 26],
    }
  },
  '90d': {
    label: 'Quarter to Date',
    kpis: [
      { id: 'open-tickets', label: 'Total Volume', value: '3,890', change: '+340', changeDir: 'up', changeBad: false, icon: MessageSquare, color: '#3b82f6', sub: 'vs last quarter' },
      { id: 'avg-response', label: 'Avg Response Time', value: '2m 04s', change: '-35s', changeDir: 'down', changeBad: false, icon: Clock, color: '#10b981', sub: 'quarterly avg' },
      { id: 'csat-score', label: 'CSAT Score', value: '93.2%', change: '+4.2%', changeDir: 'up', changeBad: false, icon: Star, color: '#f59e0b', sub: 'quarterly avg' },
      { id: 'active-agents', label: 'Total Agents', value: '28', change: '+8', changeDir: 'up', changeBad: false, icon: Users, color: '#8b5cf6', sub: 'team growth' },
    ],
    spark: {
      tickets: [2600, 2900, 3150, 3400, 3650, 3800, 3890],
      response: [160, 150, 142, 135, 130, 126, 124],
      csat: [87, 88.5, 89.5, 91.0, 92.1, 92.9, 93.2],
      agents: [20, 22, 23, 24, 25, 27, 28],
    }
  }
};

const INITIAL_ACTIVITIES = [
  { id: 1, type: 'ticket', msg: 'New ticket #2341 from Sarah M. — Billing inquiry regarding invoice discrepancy', time: '2 min ago', severity: 'high', icon: AlertTriangle, color: '#f43f5e' },
  { id: 2, type: 'resolved', msg: 'Ticket #2338 marked resolved by Agent Alex Kim', time: '5 min ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
  { id: 3, type: 'coaching', msg: 'AI coaching guidance accepted by Maya Patel (94% confidence)', time: '8 min ago', severity: 'info', icon: Sparkles, color: '#3b82f6' },
  { id: 4, type: 'ticket', msg: 'Ticket #2330 escalated to Tier 2 engineering support (Enterprise customer)', time: '14 min ago', severity: 'high', icon: AlertTriangle, color: '#f59e0b' },
  { id: 5, type: 'resolved', msg: 'Ticket #2325 closed with 5-star customer CSAT review', time: '22 min ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
  { id: 6, type: 'coaching', msg: 'Burnout risk signal flagged for Agent Jordan Torres — workload re-balanced', time: '35 min ago', severity: 'warning', icon: Activity, color: '#f59e0b' },
  { id: 7, type: 'ticket', msg: 'New ticket #2340 from TechFlow Inc. — API rate limiting threshold reached', time: '41 min ago', severity: 'info', icon: AlertTriangle, color: '#3b82f6' },
  { id: 8, type: 'resolved', msg: 'Ticket #2319 closed after automated knowledgebase solution confirmed', time: '1 hr ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
];

const TOP_AGENTS = [
  { name: 'Alex Kim', status: 'online', score: 98, tickets: 34, csat: '98%', avatar: 'AK', color: '#3b82f6' },
  { name: 'Maya Patel', status: 'online', score: 95, tickets: 29, csat: '96%', avatar: 'MP', color: '#10b981' },
  { name: 'Jordan Torres', status: 'in-call', score: 89, tickets: 31, csat: '91%', avatar: 'JT', color: '#f59e0b' },
  { name: 'Sam Nguyen', status: 'away', score: 86, tickets: 26, csat: '89%', avatar: 'SN', color: '#8b5cf6' },
];

// Clean, responsive SVG sparkline
function Sparkline({ data, color }) {
  const w = 120, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `0,${h} ` + pts + ` ${w},${h}`;
  const gradId = `sg-${color.replace('#', '')}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard({ onNavigate }) {
  const [timeframe, setTimeframe] = useState('7d');
  const [activityFilter, setActivityFilter] = useState('all'); // 'all' | 'ticket' | 'coaching' | 'resolved'
  const [liveSessionsCount, setLiveSessionsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  const currentData = TIMEFRAME_DATA[timeframe] || TIMEFRAME_DATA['7d'];

  const refreshLiveStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getSessions();
      if (data && Array.isArray(data.sessions)) {
        setLiveSessionsCount(data.sessions.length);
        if (data.sessions.length > 0) {
          // Merge real sessions into top of activity feed
          const realSessionActivities = data.sessions.slice(0, 3).map((s, idx) => ({
            id: `real-${s.id}-${idx}`,
            type: 'ticket',
            msg: `Active session #${s.id}: ${s.title || 'Support Session'} (${s.customer?.name || 'Customer'})`,
            time: 'Live',
            severity: 'info',
            icon: Zap,
            color: '#3b82f6',
            customer: s.customer,
          }));
          setActivities([...realSessionActivities, ...INITIAL_ACTIVITIES.slice(0, 7)]);
        }
      }
    } catch (err) {
      console.warn('Could not load live sessions:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshLiveStats();
  }, []);

  const filteredActivities = activities.filter(a => {
    if (activityFilter === 'all') return true;
    return a.type === activityFilter;
  });

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Enterprise command center — monitoring support health, active agent rosters, and AI copilot accuracy.
          </p>
        </div>

        <div className="page-header-actions">
          {/* Timeframe selector */}
          <div className="timeframe-selector" role="group" aria-label="Select timeframe">
            {Object.keys(TIMEFRAME_DATA).map(tf => (
              <button
                key={tf}
                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            className="shell-icon-btn"
            onClick={refreshLiveStats}
            title="Refresh metrics"
            disabled={isRefreshing}
            aria-label="Refresh metrics"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
          </button>

          <button className="btn-primary-sm" onClick={() => onNavigate('workspace')}>
            <Zap size={14} /> Open Live Workspace
          </button>
        </div>
      </div>

      {/* Live System Status Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '12.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-dot" />
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>All Systems Nominal</span>
          <span style={{ color: 'var(--text-subtle)' }}>· Groq Mini-Engine & Knowledge Base Operational</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
          <span>Active Sessions: <strong style={{ color: '#93c5fd' }}>{liveSessionsCount || 4}</strong></span>
          <span>SLA Compliance: <strong style={{ color: '#10b981' }}>99.2%</strong></span>
          <span>AI Assistance Rate: <strong style={{ color: '#3b82f6' }}>92.6%</strong></span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {currentData.kpis.map((card, i) => (
          <div
            className="kpi-card"
            key={card.id}
            id={card.id}
            onClick={() => {
              if (card.id === 'open-tickets') onNavigate('tickets');
              if (card.id === 'active-agents') onNavigate('agent-perf');
              if (card.id === 'csat-score') onNavigate('reports');
              if (card.id === 'avg-response') onNavigate('analytics');
            }}
            style={{ cursor: 'pointer' }}
            title="Click to inspect detailed view"
          >
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: `${card.color}20`, color: card.color, border: `1px solid ${card.color}40` }}>
                <card.icon size={18} />
              </div>
              <div className={`kpi-change ${card.changeBad ? 'bad' : 'good'}`}>
                {card.changeDir === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {card.change}
              </div>
            </div>
            <div className="kpi-value">{card.value}</div>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-sparkline">
              <Sparkline data={currentData.spark[Object.keys(currentData.spark)[i]]} color={card.color} />
            </div>
            <div className="kpi-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Activity Feed & Team Performance */}
      <div className="dash-main-grid">
        {/* Left: Live Activity Feed */}
        <div className="dash-panel activity-panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="panel-title">Operational Activity Stream</h2>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: '#dbeafe',
                color: '#1d4ed8',
                fontWeight: 700,
                border: '1px solid #93c5fd'
              }}>
                Real-time
              </span>
            </div>

            <button className="panel-action-btn" onClick={() => onNavigate('tickets')}>
              View All Tickets <ExternalLink size={12} />
            </button>
          </div>

          {/* Activity Category Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.01)',
            overflowX: 'auto'
          }}>
            {[
              { id: 'all', label: 'All Signals' },
              { id: 'ticket', label: 'Tickets & Escalations' },
              { id: 'coaching', label: 'AI Copilot' },
              { id: 'resolved', label: 'Resolutions' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActivityFilter(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: activityFilter === f.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
                  background: activityFilter === f.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  color: activityFilter === f.id ? '#93c5fd' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: activityFilter === f.id ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="activity-list">
            {filteredActivities.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
                No events found matching this filter.
              </div>
            ) : (
              filteredActivities.map(item => (
                <div
                  key={item.id}
                  className="activity-item"
                  onClick={() => {
                    if (item.customer) {
                      onNavigate('workspace', { customer: item.customer });
                    } else if (item.type === 'ticket') {
                      onNavigate('tickets');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Click to jump into context"
                >
                  <div className="activity-icon-wrap" style={{ background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}35` }}>
                    <item.icon size={13} />
                  </div>
                  <div className="activity-body">
                    <span className="activity-msg">{item.msg}</span>
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Team Performance & Quick Launcher */}
        <div className="dash-panel agents-panel">
          <div className="panel-header">
            <h2 className="panel-title">Top Support Agents</h2>
            <button className="panel-action-btn" onClick={() => onNavigate('agent-perf')}>
              Full Roster <ExternalLink size={12} />
            </button>
          </div>

          <div className="top-agents-list">
            {TOP_AGENTS.map((a, i) => (
              <div
                key={a.name}
                className="top-agent-row"
                onClick={() => onNavigate('agent-perf')}
                style={{ cursor: 'pointer' }}
                title="View agent score breakdown"
              >
                <div className="top-agent-rank">#{i + 1}</div>
                <div style={{ position: 'relative' }}>
                  <div className="top-agent-avatar" style={{ background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}30` }}>
                    {a.avatar}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: a.status === 'online' ? '#10b981' : a.status === 'in-call' ? '#f59e0b' : '#64748b',
                    border: '1.5px solid var(--bg-card)'
                  }} />
                </div>
                <div className="top-agent-info">
                  <div className="top-agent-name">{a.name}</div>
                  <div className="top-agent-meta">{a.tickets} resolved · CSAT {a.csat}</div>
                </div>
                <div className="top-agent-score-wrap">
                  <div className="top-agent-score" style={{ color: a.color }}>{a.score}</div>
                  <div className="top-agent-score-bar-bg">
                    <div className="top-agent-score-bar" style={{ width: `${a.score}%`, background: a.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Launcher */}
          <div className="quick-actions-section">
            <div className="panel-label">Operational Quick Actions</div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => onNavigate('live-queue')}>
                <Activity size={14} style={{ color: '#3b82f6' }} /> Live Queue
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('analytics')}>
                <TrendingUp size={14} style={{ color: '#10b981' }} /> Analytics
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('tickets')}>
                <MessageSquare size={14} style={{ color: '#f59e0b' }} /> Tickets
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('reports')}>
                <Star size={14} style={{ color: '#8b5cf6' }} /> Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
