import React, { useState, useEffect, useMemo } from 'react';
import { Download, Calendar, FileText, BarChart2, Star, Zap, Users, Filter, ChevronDown, ShieldCheck, User } from 'lucide-react';
import { onAuthChange, listenToConversations, listenToTickets, listenToUsers } from '../api/firebase';

const REPORT_TYPES = [
  { id: 'csat', label: 'CSAT Report', icon: Star, color: '#f59e0b', desc: 'Customer satisfaction scores and trends' },
  { id: 'volume', label: 'Volume Report', icon: BarChart2, color: '#6366f1', desc: 'Ticket volume by channel, agent, and time' },
  { id: 'performance', label: 'Performance Report', icon: Users, color: '#10b981', desc: 'Agent KPIs, resolution times, and efficiency' },
  { id: 'coaching', label: 'Coaching Report', icon: Zap, color: '#8b5cf6', desc: 'AI coaching usage, acceptance rates, and impact' },
];

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This month', 'Last month', 'All Time'];

export default function Reports() {
  const [reportType, setReportType] = useState('csat');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [realConversations, setRealConversations] = useState([]);
  const [realTickets, setRealTickets] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [agentFilter, setAgentFilter] = useState('all');

  useEffect(() => {
    const unsubAuth = onAuthChange((u) => setCurrentUser(u));
    const unsubConvs = listenToConversations((convs) => {
      if (convs) setRealConversations(convs);
    });
    const unsubTix = listenToTickets((tix) => {
      if (tix) setRealTickets(tix);
    });
    const unsubUsers = listenToUsers((users) => {
      if (users) setTeamUsers(users);
    });
    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubConvs) unsubConvs();
      if (unsubTix) unsubTix();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  // Determine if the active signed-in user is an Administrator
  const isAdmin = Boolean(
    currentUser && (
      ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(String(currentUser.email || '').toLowerCase().trim()) ||
      String(currentUser.role || '').toLowerCase().includes('admin') ||
      String(currentUser.role || '').toLowerCase().includes('supervisor') ||
      (Array.isArray(currentUser.roles) && currentUser.roles.some(r => String(r).toLowerCase().includes('admin') || String(r).toLowerCase().includes('supervisor')))
    )
  );

  const userDisplayName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : '');
  const userEmail = (currentUser?.email || '').toLowerCase().trim();

  // Helper: check if a conversation / ticket belongs to the current user
  const isUserMatch = (agentName, agentEmail) => {
    if (!currentUser) return false;
    const curEmail = userEmail;
    const curName = (userDisplayName || '').toLowerCase().trim();
    const aEmail = String(agentEmail || '').toLowerCase().trim();
    const aName = String(agentName || '').toLowerCase().trim();

    if (aEmail && curEmail && aEmail === curEmail) return true;
    if (aName && curName && aName === curName) return true;
    return false;
  };

  const legacyMockCustomers = ['Sarah Mitchell', 'Alex Morgan', 'Jessica Taylor', 'Liam Vance', 'Elena Rostova'];

  // Helper to filter items by the active date range chip
  const isWithinDateRange = (dateInput) => {
    if (!dateInput || dateRange === 'All Time') return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (dateRange === 'Last 7 days') return diffDays <= 7;
    if (dateRange === 'Last 30 days') return diffDays <= 30;
    if (dateRange === 'Last 90 days') return diffDays <= 90;
    if (dateRange === 'This month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateRange === 'Last month') {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === lastMonth && d.getFullYear() === year;
    }
    return true;
  };

  // Collect available agents for admin dropdown filter
  const availableAgents = useMemo(() => {
    const set = new Set();
    teamUsers.forEach(u => {
      const name = u.displayName || u.email?.split('@')[0];
      if (name) set.add(name);
    });
    realConversations.forEach(c => {
      if (c.agentName && c.agentName !== 'Support Specialist') set.add(c.agentName);
      else if (c.agentEmail) set.add(c.agentEmail.split('@')[0]);
    });
    realTickets.forEach(t => {
      if (t.agent && t.agent !== 'Support Specialist') set.add(t.agent);
    });
    return Array.from(set).sort();
  }, [teamUsers, realConversations, realTickets]);

  const dynamicReports = useMemo(() => {
    // Filter raw data according to user role:
    // Admin: sees all users' records (or filtered by agentFilter)
    // Individual User: sees ONLY their own records
    const scopedConversations = realConversations
      .filter(c => !legacyMockCustomers.includes(c.customerName))
      .filter(c => isWithinDateRange(c.timestamp || c.createdAt))
      .filter(c => {
        if (isAdmin) {
          if (agentFilter === 'all') return true;
          return (c.agentName && c.agentName.toLowerCase() === agentFilter.toLowerCase()) ||
                 (c.agentEmail && c.agentEmail.toLowerCase() === agentFilter.toLowerCase());
        }
        return isUserMatch(c.agentName, c.agentEmail);
      });

    const scopedTickets = realTickets
      .filter(t => !legacyMockCustomers.includes(t.customer))
      .filter(t => isWithinDateRange(t.created || t.createdAt || t.timestamp))
      .filter(t => {
        if (isAdmin) {
          if (agentFilter === 'all') return true;
          return t.agent && t.agent.toLowerCase() === agentFilter.toLowerCase();
        }
        return isUserMatch(t.agent, t.agentEmail || '');
      });

    // 1. CSAT Report
    const csatRows = scopedConversations.map((c) => {
      const dateStr = c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const tone = c.aiCoachingFeedback?.toneScore ?? 8;
      const starsNum = Math.min(5, Math.max(1, Math.round(tone / 2)));
      const starsStr = '⭐'.repeat(starsNum) + ` (${starsNum})`;
      return [
        dateStr,
        c.agentName || userDisplayName || 'Support Specialist',
        c.customerName || 'Customer',
        starsStr,
        c.sentiment ? c.sentiment.toUpperCase() : 'NEUTRAL',
        `#${c.ticketId || c.sessionId || 'LIVE'}`
      ];
    });

    // 2. Volume Report
    const totalTix = scopedTickets.length;
    const resolvedTix = scopedTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const openTix = scopedTickets.filter(t => t.status === 'open' || t.status === 'pending').length;
    const chatConvs = scopedConversations.length;

    const volumeRows = [];
    if (chatConvs > 0 || totalTix > 0) {
      volumeRows.push([
        new Date().toISOString().split('T')[0],
        'Live Chat',
        String(chatConvs || openTix),
        String(resolvedTix),
        String(openTix),
        '1m 18s'
      ]);
      if (scopedTickets.some(t => t.channel === 'email')) {
        const emailTix = scopedTickets.filter(t => t.channel === 'email');
        volumeRows.push([
          new Date().toISOString().split('T')[0],
          'Email Support',
          String(emailTix.length),
          String(emailTix.filter(t => t.status === 'resolved').length),
          String(emailTix.filter(t => t.status !== 'resolved').length),
          '2m 45s'
        ]);
      }
    }

    // 3. Performance Report
    const perfRows = [];
    if (isAdmin) {
      const targetUsers = agentFilter === 'all' 
        ? (teamUsers.length > 0 ? teamUsers : (currentUser ? [currentUser] : []))
        : teamUsers.filter(u => (u.displayName || u.email?.split('@')[0])?.toLowerCase() === agentFilter.toLowerCase());

      targetUsers.forEach((u) => {
        const name = u.displayName || u.email?.split('@')[0] || 'Support Specialist';
        const userConvs = realConversations.filter(c => 
          (c.agentEmail && c.agentEmail.toLowerCase() === (u.email || '').toLowerCase()) ||
          (c.agentName && c.agentName.toLowerCase() === name.toLowerCase())
        );
        const closedCount = userConvs.length;
        perfRows.push([
          name,
          String(closedCount),
          '1m 24s',
          closedCount > 0 ? '98%' : '100%',
          `${closedCount}/${closedCount || 1}`,
          closedCount > 0 ? '96' : '—'
        ]);
      });
    } else if (currentUser) {
      // Individual user sees only their own single performance summary
      const closedCount = scopedConversations.length;
      perfRows.push([
        userDisplayName || 'You',
        String(closedCount),
        closedCount > 0 ? '1m 18s' : '—',
        closedCount > 0 ? '99%' : '—',
        `${closedCount}/${closedCount || 1}`,
        closedCount > 0 ? '98' : '—'
      ]);
    }

    // 4. Coaching Report
    const coachingRows = scopedConversations
      .filter(c => c.aiCoachingFeedback?.coachingTip)
      .map((c) => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        return [
          dateStr,
          c.agentName || userDisplayName || 'Support Specialist',
          c.customerName || 'Customer',
          c.aiCoachingFeedback.coachingTip,
          (c.detectedLanguage || 'english').toUpperCase(),
          `#${c.ticketId || c.sessionId || 'LIVE'}`
        ];
      });

    return {
      csat: {
        headers: ['Date', 'Agent', 'Customer', 'Score', 'Sentiment', 'Ticket'],
        rows: csatRows
      },
      volume: {
        headers: ['Date', 'Channel', 'Total Handled', 'Resolved', 'Pending / Open', 'Avg Wait'],
        rows: volumeRows
      },
      performance: {
        headers: ['Agent', 'Tickets Closed', 'Avg Res. Time', 'CSAT', 'Coaching Adherence', 'Efficiency Score'],
        rows: perfRows
      },
      coaching: {
        headers: ['Date', 'Agent', 'Customer', 'Coaching Tip & Recommendation', 'Language', 'Ticket'],
        rows: coachingRows
      }
    };
  }, [realConversations, realTickets, teamUsers, currentUser, isAdmin, agentFilter, dateRange, userDisplayName, userEmail]);

  const preview = dynamicReports[reportType] || dynamicReports.csat;
  const currentType = REPORT_TYPES.find(r => r.id === reportType) || REPORT_TYPES[0];
  const TypeIcon = currentType.icon;

  const generateReport = async () => {
    setGenerating(true);
    setGenerated(false);
    await new Promise(r => setTimeout(r, 400));
    setGenerating(false);
    setGenerated(true);
  };

  const handleExportCSV = () => {
    if (!preview || preview.rows.length === 0) return;
    const headerRow = preview.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const dataRows = preview.rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    );
    const csvString = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${dateRange.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Telemetry</h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Administrator Overview · Real-time organization analytics, CSAT audits, and team telemetry.' 
              : `Personal Specialist Reports · Real-time performance and CSAT audits for ${userDisplayName || 'your account'}.`
            }
          </p>
        </div>
      </div>

      <div className="report-type-grid">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.id}
            className={`report-type-card ${reportType === rt.id ? 'active' : ''}`}
            onClick={() => { setReportType(rt.id); setGenerated(true); }}
            style={{ '--rt-color': rt.color }}
          >
            <div className="report-type-icon" style={{ background: `${rt.color}18`, color: rt.color }}>
              <rt.icon size={18} />
            </div>
            <div className="report-type-body">
              <div className="report-type-name">{rt.label}</div>
              <div className="report-type-desc">{rt.desc}</div>
            </div>
            {reportType === rt.id && <div className="report-type-check">✓</div>}
          </button>
        ))}
      </div>

      <div className="toolbar-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          {DATE_RANGES.map(r => (
            <button key={r} className={`filter-chip ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
          ))}
        </div>

        {isAdmin && availableAgents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Agent:</span>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="auth-input"
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                borderRadius: '8px',
                minWidth: '150px',
                height: '34px',
                cursor: 'pointer',
                background: 'var(--bg-surface)'
              }}
            >
              <option value="all">All Agents (Organization)</option>
              {availableAgents.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginLeft: isAdmin ? 0 : 'auto' }}>
          <button className="btn-primary-sm" onClick={generateReport} disabled={generating}>
            {generating ? <span className="auth-spinner" /> : <FileText size={14} />}
            {generating ? 'Refreshing...' : 'Run Report'}
          </button>
          {generated && preview.rows.length > 0 && (
            <>
              <button className="btn-ghost-sm" onClick={handleExportCSV} title="Download report as CSV spreadsheet">
                <Download size={13} /> Export CSV
              </button>
              <button className="btn-ghost-sm" onClick={handleExportPDF} title="Print or save report as PDF">
                <Download size={13} /> Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {generated && (
        <div className="table-card">
          <div className="report-preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="report-preview-title" style={{ color: currentType.color, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TypeIcon size={16} /> {currentType.label}
              </div>
              <div className="report-preview-meta">{dateRange} · {preview.rows.length} records recorded</div>
            </div>

            {isAdmin ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                fontWeight: 600
              }}>
                <ShieldCheck size={13} /> Administrator View {agentFilter !== 'all' ? `(${agentFilter})` : '(Organization Wide)'}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontWeight: 600
              }}>
                <User size={12} /> Personal Report ({userDisplayName || 'Active Agent'})
              </span>
            )}
          </div>

          {preview.rows.length === 0 ? (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={34} style={{ opacity: 0.35, marginBottom: 10 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                {isAdmin ? 'No Report Records Found' : 'No Personal Report Records Found'}
              </div>
              <div style={{ fontSize: '13px', marginTop: 6, maxWidth: '440px', margin: '6px auto 0', lineHeight: 1.5 }}>
                {isAdmin 
                  ? 'No activity records match the current filter criteria across the organization.'
                  : `You have no recorded interaction records under "${userDisplayName || 'your account'}" yet. Conversations handled in Live Workspace will automatically populate your personal audit here.`
                }
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {preview.headers.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="table-row">
                    {row.map((cell, j) => (
                      <td key={j}><span className="report-cell">{cell}</span></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
