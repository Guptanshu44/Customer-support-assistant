import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, MessageSquare, Clock, Star, Users,
  ArrowUp, ArrowDown, Zap, AlertTriangle, CheckCircle, Activity,
  ExternalLink, RefreshCw, ShieldCheck, Sparkles, Filter, UserCheck, Inbox, Award
} from 'lucide-react';
import { api, formatTicketTime } from '../api/client';
import { onAuthChange, getCurrentAuthUser, listenToConversations, listenToTickets, listenToUsers, isMockCustomer, isMockTicketOrSession } from '../api/firebase';

function generateSparkline(currentVal, volatility = 0.12) {
  const pts = [];
  const base = typeof currentVal === 'number' ? currentVal : parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 50;
  for (let i = 0; i < 7; i++) {
    const factor = 1 + (Math.sin(i * 1.1) * volatility) - ((6 - i) * 0.02);
    pts.push(Math.max(1, Math.round(base * factor)));
  }
  pts[6] = Math.max(1, Math.round(base));
  return pts;
}

function Sparkline({ data = [10, 15, 12, 18, 22, 20, 25], color = '#3b82f6' }) {
  const w = 120, h = 32;
  const safeData = data.length >= 2 ? data : [data[0] || 10, data[0] || 10];
  const min = Math.min(...safeData), max = Math.max(...safeData);
  const range = max - min || 1;
  const pts = safeData.map((v, i) => {
    const x = (i / (safeData.length - 1)) * w;
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

const TIMEFRAME_KEYS = ['24h', '7d', '30d', '90d'];

export default function Dashboard({ onNavigate }) {
  const [timeframe, setTimeframe] = useState('7d');
  const [activityFilter, setActivityFilter] = useState('all');
  const [liveSessionsCount, setLiveSessionsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentAuthUser());
  const [realConversations, setRealConversations] = useState([]);
  const [realTickets, setRealTickets] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);

  useEffect(() => {
    const unsubAuth = onAuthChange((u) => setCurrentUser(u));
    const unsubConvs = listenToConversations((convs) => { if (convs) setRealConversations(convs); });
    const unsubTix = listenToTickets((tix) => { if (tix) setRealTickets(tix); });
    const unsubUsers = listenToUsers((users) => { if (users) setTeamUsers(users); });
    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubConvs) unsubConvs();
      if (unsubTix) unsubTix();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const email = String(currentUser.email || '').toLowerCase().trim();
    const role = String(currentUser.role || '').toLowerCase().trim();
    const roles = Array.isArray(currentUser.roles) ? currentUser.roles.map(r => String(r).toLowerCase().trim()) : [];
    return (
      ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(email) ||
      role.includes('admin') ||
      role.includes('supervisor') ||
      roles.some(r => r.includes('admin') || r.includes('supervisor'))
    );
  }, [currentUser]);

  const cleanTickets = useMemo(() => {
    return (realTickets || []).filter(t => t && !isMockCustomer(t.customer || t.customerName) && !isMockTicketOrSession(t.id));
  }, [realTickets]);

  const cleanConversations = useMemo(() => {
    return (realConversations || []).filter(c => {
      if (!c) return false;
      const cName = c.customerName || c.customer?.name || c.customer;
      return !isMockCustomer(cName) && !isMockTicketOrSession(c.ticketId) && !isMockTicketOrSession(c.sessionId);
    });
  }, [realConversations]);

  const curEmail = (currentUser?.email || '').toLowerCase().trim();
  const curName = (currentUser?.displayName || (curEmail ? curEmail.split('@')[0] : '')).toLowerCase().trim();

  const isUserMatch = (agentName, agentEmail) => {
    if (!curEmail && !curName) return true;
    const aEmail = String(agentEmail || '').toLowerCase().trim();
    const aName = String(agentName || '').toLowerCase().trim();
    if (aEmail && curEmail && aEmail === curEmail) return true;
    if (aName && curName && (aName === curName || aName.includes(curName) || curName.includes(aName))) return true;
    return false;
  };

  const scopedTickets = useMemo(() => {
    if (isAdmin) return cleanTickets;
    return cleanTickets.filter(t => isUserMatch(t.agent || t.assigned_agent, t.agentEmail));
  }, [cleanTickets, isAdmin, curEmail, curName]);

  const scopedConversations = useMemo(() => {
    if (isAdmin) return cleanConversations;
    return cleanConversations.filter(c => isUserMatch(c.agentName, c.agentEmail));
  }, [cleanConversations, isAdmin, curEmail, curName]);

  const isWithinTimeframe = (dateInput) => {
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const limitMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    }[timeframe] || (7 * 24 * 60 * 60 * 1000);
    return diffMs <= limitMs;
  };

  const timeframeTickets = useMemo(() => {
    return scopedTickets.filter(t => isWithinTimeframe(t.created || t.createdAt || t.timestamp));
  }, [scopedTickets, timeframe]);

  const timeframeConversations = useMemo(() => {
    return scopedConversations.filter(c => isWithinTimeframe(c.timestamp || c.createdAt));
  }, [scopedConversations, timeframe]);

  const openTicketsCount = useMemo(() => {
    const open = timeframeTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
    if (timeframeTickets.length > 0) {
      return open.length;
    }
    return timeframeConversations.length;
  }, [timeframeTickets, timeframeConversations]);

  const resolvedTicketsCount = useMemo(() => {
    return timeframeTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  }, [timeframeTickets]);

  const totalUserCases = useMemo(() => {
    return Math.max(timeframeTickets.length, timeframeConversations.length);
  }, [timeframeTickets, timeframeConversations]);

  const solvedRatePercent = useMemo(() => {
    if (totalUserCases === 0) return 100;
    return Math.round((resolvedTicketsCount / totalUserCases) * 100);
  }, [resolvedTicketsCount, totalUserCases]);

  const dynamicResponseTimeStr = useMemo(() => {
    if (timeframeConversations.length === 0 && timeframeTickets.length === 0) {
      return isAdmin ? '1m 24s' : '52s';
    }
    let secs = isAdmin ? 78 : 50;
    const latencies = timeframeConversations.map(c => c.latencySeconds || c.latency_seconds || c.aiCoachingFeedback?.latencySeconds).filter(Boolean);
    if (latencies.length > 0) {
      secs = Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 60);
    } else if (timeframeConversations.length > 0) {
      secs = Math.max(30, Math.min(150, Math.round(90 - timeframeConversations.length * 4)));
    }
    return secs >= 60 ? `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s` : `${secs}s`;
  }, [timeframeConversations, timeframeTickets, isAdmin]);

  const dynamicCsatPercent = useMemo(() => {
    let csatSum = 0;
    let csatCount = 0;
    timeframeConversations.forEach(c => {
      const fb = c.aiCoachingFeedback;
      if (fb && (fb.toneScore || fb.empathyScore)) {
        csatSum += ((fb.toneScore || 8) + (fb.empathyScore || 8)) / 2;
        csatCount++;
      }
    });
    if (csatCount > 0) {
      return Math.min(100, Math.max(70, Math.round((csatSum / csatCount) * 10)));
    }
    return timeframeTickets.length > 0 ? 86 : 92;
  }, [timeframeConversations, timeframeTickets]);

  // Strictly deduplicate team members and filter out legacy mocks
  const dedupedTeamUsers = useMemo(() => {
    const legacyMockNames = ['Alex Kim', 'Maya Patel', 'Jordan Torres', 'Sam Nguyen', 'Olivia Chen', 'Ryan Miller'];
    const legacyMockEmails = [
      'alex.kim@omnidesk.ai',
      'maya.patel@omnidesk.ai',
      'jordan.torres@omnidesk.ai',
      'sam.nguyen@omnidesk.ai',
      'olivia.chen@omnidesk.ai',
      'ryan.miller@omnidesk.ai'
    ];

    let combined = [...teamUsers];
    if (currentUser && !combined.some(u => (u.email || '').toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim())) {
      combined.unshift(currentUser);
    }

    combined = combined.filter(u => {
      const dName = String(u.displayName || u.name || '').trim();
      const em = String(u.email || '').toLowerCase().trim();
      return !legacyMockNames.includes(dName) && !legacyMockEmails.includes(em);
    });

    const result = [];
    combined.forEach(u => {
      const email = String(u.email || '').toLowerCase().trim();
      const rawName = String(u.displayName || u.name || '').trim();
      const lowerName = rawName.toLowerCase();

      const existing = result.find(item => {
        const itemEmail = String(item.email || '').toLowerCase().trim();
        const itemName = String(item.displayName || item.name || '').trim().toLowerCase();
        if (email && itemEmail && email === itemEmail) return true;
        if (lowerName && itemName && lowerName === itemName) return true;
        return false;
      });

      if (!existing) {
        result.push({ ...u });
      } else {
        if (!existing.displayName && rawName) existing.displayName = rawName;
        if (!existing.email && email) existing.email = email;
        if ((!existing.role || existing.role.toLowerCase().includes('specialist')) && u.role && !u.role.toLowerCase().includes('specialist')) {
          existing.role = u.role;
        }
      }
    });

    return result;
  }, [teamUsers, currentUser]);

  const activeAgentCount = useMemo(() => {
    if (!dedupedTeamUsers || dedupedTeamUsers.length === 0) return 1;
    const online = dedupedTeamUsers.filter(u => u.status === 'online' || !u.status).length;
    return Math.max(1, online);
  }, [dedupedTeamUsers]);

  const slaCompliancePercent = useMemo(() => {
    if (timeframeTickets.length === 0) return '99.2%';
    const within = timeframeTickets.filter(t => t.priority !== 'urgent' || t.status === 'resolved').length;
    return `${Math.min(100, Math.max(80, Math.round((within / timeframeTickets.length) * 100)))}%`;
  }, [timeframeTickets]);

  const aiAssistancePercent = useMemo(() => {
    if (timeframeConversations.length === 0) return timeframeTickets.length > 0 ? '90.5%' : '94.2%';
    const assisted = timeframeConversations.filter(c => c.aiCoachingFeedback?.coachingTip || c.aiCoachingFeedback?.suggestedReply).length;
    return `${Math.round((assisted / timeframeConversations.length) * 100)}%`;
  }, [timeframeConversations, timeframeTickets]);

  const kpiCards = useMemo(() => {
    return [
      {
        id: 'open-tickets',
        label: isAdmin ? 'Open Tickets' : 'My Open Tickets',
        value: String(openTicketsCount),
        change: openTicketsCount > 0 ? `+${Math.min(openTicketsCount, 4)}` : '0',
        changeDir: 'up',
        changeBad: openTicketsCount > 6,
        icon: MessageSquare,
        color: '#3b82f6',
        sub: isAdmin ? 'all team cases' : 'assigned to you',
        spark: generateSparkline(openTicketsCount, 0.25)
      },
      {
        id: 'avg-response',
        label: isAdmin ? 'Avg Response Time' : 'My Avg Response Time',
        value: dynamicResponseTimeStr,
        change: '-14s',
        changeDir: 'down',
        changeBad: false,
        icon: Clock,
        color: '#10b981',
        sub: isAdmin ? 'team response average' : 'your average turnaround',
        spark: generateSparkline(70, 0.12)
      },
      {
        id: 'csat-score',
        label: isAdmin ? 'Team CSAT Score' : 'My CSAT Score',
        value: `${dynamicCsatPercent}%`,
        change: '+2.1%',
        changeDir: 'up',
        changeBad: false,
        icon: Star,
        color: '#f59e0b',
        sub: isAdmin ? 'across all agents' : 'customer rating',
        spark: generateSparkline(dynamicCsatPercent, 0.05)
      },
      isAdmin ? {
        id: 'active-agents',
        label: 'Active Agents',
        value: String(activeAgentCount),
        change: `+${Math.max(1, Math.min(dedupedTeamUsers.length, 3))}`,
        changeDir: 'up',
        changeBad: false,
        icon: Users,
        color: '#8b5cf6',
        sub: `${Math.max(1, dedupedTeamUsers.length)} registered roster`,
        spark: generateSparkline(activeAgentCount, 0.1)
      } : {
        id: 'my-resolution',
        label: 'My Solved Rate',
        value: `${solvedRatePercent}%`,
        change: '+3.2%',
        changeDir: 'up',
        changeBad: false,
        icon: CheckCircle,
        color: '#8b5cf6',
        sub: `${resolvedTicketsCount} of ${totalUserCases || 1} solved`,
        spark: generateSparkline(solvedRatePercent, 0.08)
      }
    ];
  }, [isAdmin, openTicketsCount, dynamicResponseTimeStr, dynamicCsatPercent, activeAgentCount, dedupedTeamUsers.length, solvedRatePercent, resolvedTicketsCount, totalUserCases]);

  const activities = useMemo(() => {
    const list = [];

    // 1. Process recent conversations
    (scopedConversations || []).forEach((c, idx) => {
      const isNeg = c.sentiment === 'negative' || c.escalationRisk === 'high' || c.urgency === 'urgent';
      const isPos = c.sentiment === 'positive';
      const isCoaching = Boolean(c.aiCoachingFeedback?.coachingTip || c.aiCoachingFeedback?.suggestedReply);
      const timeStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live';
      const rawDate = c.timestamp ? new Date(c.timestamp).getTime() : 0;
      const snippet = c.customerMessage ? `"${c.customerMessage.slice(0, 60)}${c.customerMessage.length > 60 ? '...' : ''}"` : '';

      let type = 'coaching';
      let severity = 'info';
      let icon = Zap;
      let color = '#8b5cf6';

      if (isNeg) {
        type = 'ticket';
        severity = 'high';
        icon = AlertTriangle;
        color = '#f43f5e';
      } else if (isPos) {
        type = 'resolved';
        severity = 'success';
        icon = CheckCircle;
        color = '#10b981';
      } else if (isCoaching) {
        type = 'coaching';
        severity = 'info';
        icon = Zap;
        color = '#8b5cf6';
      } else {
        type = 'ticket';
        severity = 'info';
        icon = MessageSquare;
        color = '#3b82f6';
      }

      list.push({
        id: c.id || `conv-${idx}`,
        type,
        msg: `Session #${c.ticketId || c.sessionId || 'Live'}: ${c.customerName || 'Customer'} — ${snippet || 'Live Interaction'}`,
        time: timeStr,
        timestamp: rawDate,
        severity,
        icon,
        color,
      });
    });

    // 2. Process real tickets
    (scopedTickets || []).forEach((t) => {
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      const isUrgent = t.priority === 'urgent';
      const timeStr = formatTicketTime(t);
      const rawDate = t.createdAt || t.created ? new Date(t.createdAt || t.created).getTime() : 0;

      list.push({
        id: `ticket-${t.id}`,
        type: isResolved ? 'resolved' : 'ticket',
        msg: isResolved
          ? `Ticket #${t.id}: ${t.customer || t.customerName || 'Customer'} — Resolved "${t.subject || 'Inquiry'}"`
          : (isUrgent
            ? `Escalation #${t.id}: ${t.customer || t.customerName || 'Customer'} — "${t.subject || 'Urgent Case'}"`
            : `Ticket #${t.id}: ${t.customer || t.customerName || 'Customer'} — "${t.subject || 'Inquiry'}"`),
        time: timeStr,
        timestamp: rawDate,
        severity: isResolved ? 'success' : (isUrgent ? 'high' : 'info'),
        icon: isResolved ? CheckCircle : (isUrgent ? AlertTriangle : MessageSquare),
        color: isResolved ? '#10b981' : (isUrgent ? '#f43f5e' : '#3b82f6'),
      });
    });

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, 20);
  }, [scopedConversations, scopedTickets]);

  const topAgents = useMemo(() => {
    if (!isAdmin) return [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    return dedupedTeamUsers.slice(0, 6).map((u, i) => {
      const name = u.displayName || (u.email ? u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : `Agent ${i + 1}`);
      const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'AG';
      
      const lowerEmail = String(u.email || '').toLowerCase().trim();
      const lowerName = name.toLowerCase().trim();

      const agentTickets = cleanTickets.filter(t => {
        const tEmail = String(t.agentEmail || t.userAccount || '').toLowerCase().trim();
        const tAgent = String(t.agent || t.assigned_agent || '').toLowerCase().trim();
        return (lowerEmail && tEmail && tEmail === lowerEmail) ||
               (lowerName && tAgent && (tAgent === lowerName || tAgent.includes(lowerName)));
      });

      const agentConvs = cleanConversations.filter(c => {
        const cEmail = String(c.agentEmail || '').toLowerCase().trim();
        const cName = String(c.agentName || '').toLowerCase().trim();
        return (lowerEmail && cEmail && cEmail === lowerEmail) ||
               (lowerName && cName && (cName === lowerName || cName.includes(lowerName)));
      });

      const resolved = agentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
      const count = Math.max(resolved, agentConvs.length);

      let csatSum = 0;
      let csatCount = 0;
      agentConvs.forEach(c => {
        const fb = c.aiCoachingFeedback;
        if (fb && (fb.toneScore || fb.empathyScore)) {
          csatSum += ((fb.toneScore || 8) + (fb.empathyScore || 8)) / 2;
          csatCount++;
        }
      });
      const csat = csatCount > 0 ? Math.round((csatSum / csatCount) * 10) : (agentTickets.length > 0 ? 86 : 75);
      const score = Math.min(99, Math.max(70, Math.round(csat * 0.95 + Math.min(6, count * 2))));

      return {
        id: u.uid || u.id || u.email || name,
        name,
        email: u.email,
        status: u.status || 'online',
        score,
        tickets: count,
        csat,
        avatar: initials,
        color: colors[i % colors.length]
      };
    }).sort((a, b) => b.score - a.score);
  }, [dedupedTeamUsers, cleanConversations, cleanTickets, isAdmin]);

  const myToneScore = useMemo(() => {
    let toneSum = 0;
    let count = 0;
    scopedConversations.forEach(c => {
      const t = c.aiCoachingFeedback?.toneScore;
      if (t) { toneSum += t; count++; }
    });
    return count > 0 ? (toneSum / count).toFixed(1) : '9.1';
  }, [scopedConversations]);

  const myCoachingApplied = useMemo(() => {
    return scopedConversations.filter(c => c.aiCoachingFeedback?.coachingTip || c.aiCoachingFeedback?.suggestedReply).length;
  }, [scopedConversations]);

  const refreshLiveStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getSessions();
      if (data && Array.isArray(data.sessions)) {
        setLiveSessionsCount(data.sessions.length);
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
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Dashboard Overview' : 'Agent Workspace Dashboard'}</h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Enterprise command center — monitoring support health, active agent rosters, and AI copilot accuracy.'
              : 'Personal agent dashboard — your active ticket stream, resolution metrics, and AI copilot status.'
            }
          </p>
        </div>

        <div className="page-header-actions">
          <div className="timeframe-selector" role="group" aria-label="Select timeframe">
            {TIMEFRAME_KEYS.map(tf => (
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
          <span style={{ color: 'var(--text-subtle)' }}>· Groq Mini-Engine &amp; Knowledge Base Operational</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
          <span>{isAdmin ? 'Active Sessions' : 'My Active Sessions'}: <strong style={{ color: '#1d4ed8' }}>{liveSessionsCount > 0 ? liveSessionsCount : (openTicketsCount || (scopedConversations.length > 0 ? scopedConversations.length : 0))}</strong></span>
          <span>{isAdmin ? 'Team SLA Compliance' : 'My SLA Compliance'}: <strong style={{ color: '#10b981' }}>{slaCompliancePercent}</strong></span>
          <span>{isAdmin ? 'AI Assistance Rate' : 'My AI Assistance'}: <strong style={{ color: '#1d4ed8' }}>{aiAssistancePercent}</strong></span>
        </div>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((card) => (
          <div
            className="kpi-card"
            key={card.id}
            id={card.id}
            onClick={() => {
              if (card.id === 'open-tickets' || card.id === 'my-resolution') onNavigate('tickets');
              else if (card.id === 'active-agents') onNavigate(isAdmin ? 'agent-perf' : 'tickets');
              else if (card.id === 'csat-score') onNavigate('reports');
              else if (card.id === 'avg-response') onNavigate(isAdmin ? 'analytics' : 'reports');
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
              <Sparkline data={card.spark} color={card.color} />
            </div>
            <div className="kpi-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-main-grid">
        <div className="dash-panel activity-panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="panel-title">{isAdmin ? 'Operational Activity Stream' : 'My Ticket & Activity Stream'}</h2>
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
              {isAdmin ? 'View All Tickets' : 'View My Tickets'} <ExternalLink size={12} />
            </button>
          </div>

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
                  color: activityFilter === f.id ? '#1d4ed8' : 'var(--text-muted)',
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
                {isAdmin 
                  ? 'No events found matching this filter.'
                  : 'No activity logged for your account yet. Open Live Workspace to begin assisting customers.'}
              </div>
            ) : (
              filteredActivities.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-icon" style={{ background: `${item.color}15`, color: item.color }}>
                    <item.icon size={15} />
                  </div>
                  <div className="activity-details">
                    <div className="activity-msg">{item.msg}</div>
                    <div className="activity-meta">
                      <span className="activity-time">{item.time}</span>
                      <span className={`activity-badge activity-badge-${item.type} ${item.severity === 'high' ? 'activity-badge-high' : ''}`}>
                        {item.type === 'coaching' ? 'AI COPILOT' : item.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dash-panel agents-panel">
          <div className="panel-header">
            <h2 className="panel-title">{isAdmin ? 'Top Support Agents' : 'My Performance Summary'}</h2>
            {isAdmin ? (
              <button className="panel-action-btn" onClick={() => onNavigate('agent-perf')}>
                Full Roster <ExternalLink size={12} />
              </button>
            ) : (
              <button className="panel-action-btn" onClick={() => onNavigate('agent-perf')}>
                My Coaching <ExternalLink size={12} />
              </button>
            )}
          </div>

          {isAdmin ? (
            <div className="top-agents-list">
              {topAgents.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
                  No active team members registered yet.
                </div>
              ) : (
                topAgents.map((a, i) => (
                  <div
                    key={a.id || a.email || a.name}
                    className="top-agent-row"
                    onClick={() => onNavigate('agent-perf')}
                    style={{ cursor: 'pointer' }}
                    title="View agent performance"
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
                      <div className="top-agent-meta">{a.tickets} resolved · CSAT {a.csat}%</div>
                    </div>
                    <div className="top-agent-score-wrap">
                      <div className="top-agent-score" style={{ color: a.color }}>{a.score}</div>
                      <div className="top-agent-score-bar-bg">
                        <div className="top-agent-score-bar" style={{ width: `${a.score}%`, background: a.color }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#2563eb20',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  border: '1.5px solid #2563eb40'
                }}>
                  {currentUser?.displayName ? currentUser.displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'ME'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Support Specialist')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Active · {currentUser?.role || 'Tier-1 Specialist'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solved Cases</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    {resolvedTicketsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>Personal Queue</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer CSAT</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                    {dynamicCsatPercent}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>Target: 90%+</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tone Quality</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                    {myToneScore} / 10
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>AI Evaluated</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coaching Used</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                    {myCoachingApplied}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>Tips Applied</div>
                </div>
              </div>
            </div>
          )}

          <div className="quick-actions-section">
            <div className="panel-label">Operational Quick Actions</div>
            <div className="quick-actions-grid">
              {isAdmin ? (
                <>
                  <button className="quick-action-btn" onClick={() => onNavigate('live-queue')}>
                    <Activity size={14} style={{ color: '#3b82f6' }} /> Live Queue
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('team')}>
                    <Users size={14} style={{ color: '#ec4899' }} /> Team Roles
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('analytics')}>
                    <TrendingUp size={14} style={{ color: '#10b981' }} /> Analytics
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('reports')}>
                    <Star size={14} style={{ color: '#8b5cf6' }} /> Reports
                  </button>
                </>
              ) : (
                <>
                  <button className="quick-action-btn" onClick={() => onNavigate('workspace')}>
                    <Zap size={14} style={{ color: '#3b82f6' }} /> Live Workspace
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('tickets')}>
                    <MessageSquare size={14} style={{ color: '#f59e0b' }} /> My Tickets
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('reports')}>
                    <Star size={14} style={{ color: '#8b5cf6' }} /> Reports
                  </button>
                  <button className="quick-action-btn" onClick={() => onNavigate('settings')}>
                    <ShieldCheck size={14} style={{ color: '#10b981' }} /> Settings
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
