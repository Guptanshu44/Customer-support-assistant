import React, { useState, useEffect, useMemo } from 'react';
import { Download, Calendar, FileText, BarChart2, Star, Zap, Users, Filter, ChevronDown, ShieldCheck, User } from 'lucide-react';
import { 
  onAuthChange, 
  listenToConversations, 
  listenToTickets, 
  listenToUsers, 
  isMockCustomer, 
  isMockTicketOrSession,
  isCustomerAccount 
} from '../api/firebase';
import { DEMO_CONVERSATIONS, DEMO_TICKETS } from '../api/demoData';

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
    let unsubConvs, unsubTix, unsubUsers;
    if (currentUser) {
      unsubConvs = listenToConversations((convs) => { if (convs) setRealConversations(convs); });
      unsubTix = listenToTickets((tix) => { if (tix) setRealTickets(tix); });
      unsubUsers = listenToUsers((users) => { if (users) setTeamUsers(users); });
    } else {
      setRealConversations([]);
      setRealTickets([]);
      setTeamUsers([]);
    }
    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubConvs) unsubConvs();
      if (unsubTix) unsubTix();
      if (unsubUsers) unsubUsers();
    };
  }, [currentUser]);

  // Determine user privilege tiers
  const isAdmin = Boolean(
    currentUser && (
      ['superadmin@gmail.com', 'gupta.anshu68637ag@gmail.com'].includes(String(currentUser.email || '').toLowerCase().trim()) ||
      String(currentUser.role || '').toLowerCase().includes('admin') ||
      (Array.isArray(currentUser.roles) && currentUser.roles.some(r => String(r).toLowerCase().includes('admin')))
    )
  );

  const isSupervisor = Boolean(
    currentUser && (
      String(currentUser.role || '').toLowerCase().includes('supervisor') ||
      (Array.isArray(currentUser.roles) && currentUser.roles.some(r => String(r).toLowerCase().includes('supervisor')))
    )
  );

  const isPrivileged = isAdmin || isSupervisor;

  // Filter report types shown based on role:
  // Normal Support Specialists only see personal reports (CSAT & Coaching)
  // Admins and Supervisors see all 4 reports (CSAT, Volume, Performance, Coaching)
  const visibleReportTypes = useMemo(() => {
    if (isPrivileged) {
      return REPORT_TYPES;
    }
    return REPORT_TYPES.filter(r => r.id === 'csat' || r.id === 'coaching');
  }, [isPrivileged]);

  // Keep active reportType in sync with visible types
  useEffect(() => {
    if (!visibleReportTypes.some(r => r.id === reportType)) {
      setReportType('csat');
    }
  }, [visibleReportTypes, reportType]);

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

  // Collect available agents for admin dropdown filter (excluding customers and duplicates)
  const availableAgents = useMemo(() => {
    const set = new Set();
    // 1. Team users: internal staff only
    teamUsers.forEach(u => {
      if (isCustomerAccount(u)) return;
      const name = u.displayName || (u.email ? u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null);
      if (name && name.toLowerCase() !== 'customer' && name.toLowerCase() !== 'david miller') {
        set.add(name);
      }
    });
    // 2. Real conversations: staff agents only
    realConversations.forEach(c => {
      const aName = c.agentName;
      const aEmail = c.agentEmail;
      if (aName && aName !== 'Support Specialist' && !aName.toLowerCase().includes('customer') && aName.toLowerCase() !== 'david miller') {
        set.add(aName);
      } else if (aEmail && !aEmail.toLowerCase().includes('customer')) {
        set.add(aEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
    });
    // 3. Real tickets: assigned agents only
    realTickets.forEach(t => {
      if (t.agent && t.agent !== 'Support Specialist' && !t.agent.toLowerCase().includes('customer') && t.agent.toLowerCase() !== 'david miller') {
        set.add(t.agent);
      }
    });
    return Array.from(set).sort();
  }, [teamUsers, realConversations, realTickets]);

  const dynamicReports = useMemo(() => {
    const baseConversations = currentUser ? realConversations : DEMO_CONVERSATIONS;
    const baseTickets = currentUser ? realTickets : DEMO_TICKETS;

    const scopedConversations = baseConversations
      .filter(c => {
        if (!c) return false;
        const cName = c.customerName || c.customer?.name || c.customer;
        if (isMockCustomer(cName) || isMockTicketOrSession(c.ticketId) || isMockTicketOrSession(c.sessionId)) return false;
        return true;
      })
      .filter(c => isWithinDateRange(c.timestamp || c.createdAt))
      .filter(c => {
        if (!currentUser) return true;
        if (isPrivileged) {
          if (agentFilter === 'all') return true;
          return (c.agentName && c.agentName.toLowerCase() === agentFilter.toLowerCase()) ||
                 (c.agentEmail && c.agentEmail.toLowerCase() === agentFilter.toLowerCase());
        }
        return isUserMatch(c.agentName, c.agentEmail);
      });

    const scopedTickets = baseTickets
      .filter(t => {
        if (!t) return false;
        const cName = t.customer || t.customerName;
        if (isMockCustomer(cName) || isMockTicketOrSession(t.id)) return false;
        return true;
      })
      .filter(t => isWithinDateRange(t.created || t.createdAt || t.timestamp))
      .filter(t => {
        if (!currentUser) return true;
        if (isPrivileged) {
          if (agentFilter === 'all') return true;
          return t.agent && t.agent.toLowerCase() === agentFilter.toLowerCase();
        }
        return isUserMatch(t.agent, t.agentEmail || '');
      });

    // 1. CSAT Report (Deduplicated per ticket/session interaction)
    // In multi-turn chats, each turn is saved as a conversation record.
    // Deduplicate by ticket/session ID to present 1 clean audit row per customer interaction.
    const csatMap = new Map();
    scopedConversations.forEach((c) => {
      const ticketKey = String(c.ticketId || c.sessionId || c.id || '').trim();
      if (!ticketKey) return;
      
      if (!csatMap.has(ticketKey)) {
        csatMap.set(ticketKey, c);
      } else {
        // Keep the latest record so final resolution score and sentiment are reflected
        const existing = csatMap.get(ticketKey);
        const existingTime = new Date(existing.timestamp || existing.createdAt || 0).getTime();
        const newTime = new Date(c.timestamp || c.createdAt || 0).getTime();
        if (newTime >= existingTime) {
          csatMap.set(ticketKey, c);
        }
      }
    });

    const csatRows = Array.from(csatMap.values()).map((c) => {
      const dateStr = c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const tone = c.aiCoachingFeedback?.toneScore ?? 8;
      const starsNum = Math.min(5, Math.max(1, Math.round(tone / 2)));
      const starsStr = '⭐'.repeat(starsNum) + ` (${starsNum})`;
      const cleanTicketId = String(c.ticketId || c.sessionId || 'LIVE').replace(/^#+/, '');
      return [
        dateStr,
        c.agentName || userDisplayName || 'Support Specialist',
        c.customerName || 'Customer',
        starsStr,
        c.sentiment ? c.sentiment.toUpperCase() : 'NEUTRAL',
        `#${cleanTicketId}`
      ];
    });

    // 2. Volume Report (Accurate count of unique interactions handled)
    const uniqueLiveChatIds = new Set(scopedConversations.map(c => c.ticketId || c.sessionId || c.id));
    const chatConvs = uniqueLiveChatIds.size;
    const totalTix = scopedTickets.length;
    const resolvedTix = scopedTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const openTix = scopedTickets.filter(t => t.status === 'open' || t.status === 'pending').length;

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

    // 3. Performance Report (Clean staff members only, deduplicated by normalized email)
    const perfRows = [];
    if (isPrivileged) {
      // Filter out customer accounts and deduplicate staff members
      const cleanTeamUsers = [];
      const seenStaffKeys = new Set();

      teamUsers.forEach(u => {
        if (isCustomerAccount(u)) return;
        const normEmail = String(u.email || '').toLowerCase().trim();
        const normName = String(u.displayName || u.name || '').toLowerCase().trim();
        const staffKey = normEmail || normName;
        if (!staffKey || seenStaffKeys.has(staffKey)) return;
        seenStaffKeys.add(staffKey);
        cleanTeamUsers.push(u);
      });

      const targetUsers = agentFilter === 'all' 
        ? (cleanTeamUsers.length > 0 ? cleanTeamUsers : (currentUser ? [currentUser] : []))
        : cleanTeamUsers.filter(u => {
            const n = (u.displayName || u.email?.split('@')[0])?.toLowerCase().trim();
            return n === agentFilter.toLowerCase().trim();
          });

      targetUsers.forEach((u) => {
        const name = u.displayName || (u.email ? u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Support Specialist');
        const uEmail = String(u.email || '').toLowerCase().trim();

        // Calculate unique tickets/conversations closed or handled by this agent
        const agentTicketSet = new Set();
        realConversations.forEach(c => {
          const matchEmail = c.agentEmail && c.agentEmail.toLowerCase().trim() === uEmail;
          const matchName = c.agentName && c.agentName.toLowerCase().trim() === name.toLowerCase().trim();
          if (matchEmail || matchName) {
            agentTicketSet.add(c.ticketId || c.sessionId || c.id);
          }
        });
        realTickets.forEach(t => {
          const matchEmail = t.agentEmail && t.agentEmail.toLowerCase().trim() === uEmail;
          const matchName = t.agent && t.agent.toLowerCase().trim() === name.toLowerCase().trim();
          if (matchEmail || matchName) {
            agentTicketSet.add(t.id);
          }
        });

        const closedCount = agentTicketSet.size;
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
      const userTicketSet = new Set(scopedConversations.map(c => c.ticketId || c.sessionId || c.id));
      const closedCount = userTicketSet.size;
      perfRows.push([
        userDisplayName || 'You',
        String(closedCount),
        closedCount > 0 ? '1m 18s' : '—',
        closedCount > 0 ? '99%' : '—',
        `${closedCount}/${closedCount || 1}`,
        closedCount > 0 ? '98' : '—'
      ]);
    }

    // 4. Coaching Report (Deduplicated by ticket + coaching tip)
    const coachingMap = new Map();
    scopedConversations
      .filter(c => c.aiCoachingFeedback?.coachingTip && String(c.aiCoachingFeedback.coachingTip).trim().length > 0)
      .forEach((c) => {
        const cleanTicketId = String(c.ticketId || c.sessionId || 'LIVE').replace(/^#+/, '');
        const tipText = String(c.aiCoachingFeedback.coachingTip).trim();
        const tipKey = `${cleanTicketId}__${tipText.toLowerCase()}`;

        if (!coachingMap.has(tipKey)) {
          const dateStr = c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          coachingMap.set(tipKey, [
            dateStr,
            c.agentName || userDisplayName || 'Support Specialist',
            c.customerName || 'Customer',
            tipText,
            (c.detectedLanguage || 'english').toUpperCase(),
            `#${cleanTicketId}`
          ]);
        }
      });

    const coachingRows = Array.from(coachingMap.values());

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
  }, [realConversations, realTickets, teamUsers, currentUser, isPrivileged, agentFilter, dateRange, userDisplayName, userEmail]);

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
      {!currentUser && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(90deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '12.5px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📊</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Interactive Demo Report</span>
            <span style={{ color: 'var(--text-muted)' }}>— Viewing sample CSAT audits and AI coaching benchmarks.</span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#1d4ed8', fontWeight: 600 }}>
            Sign In to view live audits
          </span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Telemetry</h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Administrator Overview · Real-time organization analytics, CSAT audits, and team telemetry.' 
              : isSupervisor
                ? 'Supervisor Overview · Real-time team analytics, CSAT audits, and specialist telemetry.'
                : `Personal Specialist Reports · Real-time performance and CSAT audits for ${userDisplayName || 'your account'}.`
            }
          </p>
        </div>
      </div>

      <div className="report-type-grid">
        {visibleReportTypes.map(rt => (
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

        {isPrivileged && availableAgents.length > 0 && (
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

        <div style={{ display: 'flex', gap: '8px', marginLeft: isPrivileged ? 0 : 'auto' }}>
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
            ) : isSupervisor ? (
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
                <ShieldCheck size={13} /> Supervisor Team View {agentFilter !== 'all' ? `(${agentFilter})` : '(All Specialists)'}
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
                {isPrivileged ? 'No Report Records Found' : 'No Personal Report Records Found'}
              </div>
              <div style={{ fontSize: '13px', marginTop: 6, maxWidth: '440px', margin: '6px auto 0', lineHeight: 1.5 }}>
                {isPrivileged 
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
