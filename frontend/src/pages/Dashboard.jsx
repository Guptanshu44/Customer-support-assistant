import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, MessageSquare, Clock, Star, Users,
  ArrowUp, ArrowDown, Zap, AlertTriangle, CheckCircle, Activity,
  MoreHorizontal, ExternalLink
} from 'lucide-react';

const kpiCards = [
  {
    id: 'open-tickets',
    label: 'Open Tickets',
    value: '247',
    change: '+12',
    changeDir: 'up',
    changeBad: true,
    icon: MessageSquare,
    color: '#6366f1',
    sub: 'vs yesterday',
  },
  {
    id: 'avg-response',
    label: 'Avg Response Time',
    value: '1m 42s',
    change: '-18s',
    changeDir: 'down',
    changeBad: false,
    icon: Clock,
    color: '#10b981',
    sub: 'vs last week',
  },
  {
    id: 'csat-score',
    label: 'CSAT Score',
    value: '91.4%',
    change: '+2.3%',
    changeDir: 'up',
    changeBad: false,
    icon: Star,
    color: '#f59e0b',
    sub: 'this month',
  },
  {
    id: 'active-agents',
    label: 'Active Agents',
    value: '18',
    change: '+3',
    changeDir: 'up',
    changeBad: false,
    icon: Users,
    color: '#8b5cf6',
    sub: 'online now',
  },
];

const recentActivity = [
  { id: 1, type: 'ticket', msg: 'New ticket #2341 from Sarah M. — Billing issue', time: '2 min ago', severity: 'high', icon: AlertTriangle, color: '#f43f5e' },
  { id: 2, type: 'resolved', msg: 'Ticket #2338 resolved by Agent Alex K.', time: '5 min ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
  { id: 3, type: 'coaching', msg: 'AI coaching suggestion accepted by Maya P. (91% confidence)', time: '8 min ago', severity: 'info', icon: Zap, color: '#6366f1' },
  { id: 4, type: 'escalation', msg: 'Ticket #2330 escalated to Tier 2 — Enterprise customer', time: '14 min ago', severity: 'high', icon: AlertTriangle, color: '#f59e0b' },
  { id: 5, type: 'resolved', msg: 'Ticket #2325 resolved — CSAT: ⭐⭐⭐⭐⭐', time: '22 min ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
  { id: 6, type: 'coaching', msg: 'Burnout risk detected for Agent Jordan T. — review workload', time: '35 min ago', severity: 'warning', icon: Activity, color: '#f59e0b' },
  { id: 7, type: 'ticket', msg: 'New ticket #2340 from TechFlow Inc. — API timeout error', time: '41 min ago', severity: 'medium', icon: AlertTriangle, color: '#8b5cf6' },
  { id: 8, type: 'resolved', msg: 'Ticket #2319 closed — Customer left 5-star review', time: '1 hr ago', severity: 'success', icon: CheckCircle, color: '#10b981' },
];

const topAgents = [
  { name: 'Alex Kim', score: 97, tickets: 34, csat: '98%', avatar: 'AK', color: '#6366f1' },
  { name: 'Maya Patel', score: 94, tickets: 29, csat: '95%', avatar: 'MP', color: '#10b981' },
  { name: 'Jordan Torres', score: 88, tickets: 31, csat: '91%', avatar: 'JT', color: '#f59e0b' },
  { name: 'Sam Nguyen', score: 85, tickets: 26, csat: '89%', avatar: 'SN', color: '#8b5cf6' },
];

// Mini sparkline SVG component
function Sparkline({ data, color }) {
  const w = 120, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${h} ` + pts + ` ${w},${h}`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const sparkData = {
  tickets: [180, 210, 195, 240, 220, 250, 247],
  response: [130, 115, 120, 105, 108, 98, 102],
  csat: [86, 88, 87, 90, 89, 91, 91.4],
  agents: [12, 14, 13, 16, 15, 17, 18],
};
const sparkColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];

export default function Dashboard({ onNavigate }) {
  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Good afternoon — here's what's happening across your support org.</p>
        </div>
        <button className="btn-primary-sm" onClick={() => onNavigate('workspace')}>
          <Zap size={14} /> Open Workspace
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiCards.map((card, i) => (
          <div className="kpi-card" key={card.id} id={card.id}>
            <div className="kpi-card-top">
              <div className="kpi-icon" style={{ background: `${card.color}18`, color: card.color }}>
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
              <Sparkline data={sparkData[Object.keys(sparkData)[i]]} color={card.color} />
            </div>
            <div className="kpi-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dash-main-grid">
        {/* Activity Feed */}
        <div className="dash-panel activity-panel">
          <div className="panel-header">
            <h2 className="panel-title">Live Activity Feed</h2>
            <button className="panel-action-btn" onClick={() => onNavigate('tickets')}>
              View All <ExternalLink size={12} />
            </button>
          </div>
          <div className="activity-list">
            {recentActivity.map(item => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon-wrap" style={{ background: `${item.color}18`, color: item.color }}>
                  <item.icon size={13} />
                </div>
                <div className="activity-body">
                  <span className="activity-msg">{item.msg}</span>
                  <span className="activity-time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="dash-panel agents-panel">
          <div className="panel-header">
            <h2 className="panel-title">Top Performers</h2>
            <button className="panel-action-btn" onClick={() => onNavigate('agent-perf')}>
              Full Report <ExternalLink size={12} />
            </button>
          </div>
          <div className="top-agents-list">
            {topAgents.map((a, i) => (
              <div key={a.name} className="top-agent-row">
                <div className="top-agent-rank">#{i + 1}</div>
                <div className="top-agent-avatar" style={{ background: `${a.color}25`, color: a.color }}>{a.avatar}</div>
                <div className="top-agent-info">
                  <div className="top-agent-name">{a.name}</div>
                  <div className="top-agent-meta">{a.tickets} tickets · CSAT {a.csat}</div>
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

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <div className="panel-label">Quick Actions</div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => onNavigate('live-queue')}>
                <Activity size={14} /> Live Queue
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('analytics')}>
                <TrendingUp size={14} /> Analytics
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('tickets')}>
                <MessageSquare size={14} /> Tickets
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('reports')}>
                <Star size={14} /> Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
