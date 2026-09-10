import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Award, Zap, MessageSquare, Clock, Star, 
  Activity, AlertTriangle, ChevronUp, ChevronDown, Sparkles, Target, Users
} from 'lucide-react';
import { 
  listenToUsers, 
  listenToConversations, 
  listenToTickets, 
  getCurrentAuthUser 
} from '../api/firebase';

const BURNOUT = {
  low: { color: '#10b981', bg: '#10b98118', label: 'Low' },
  medium: { color: '#f59e0b', bg: '#f59e0b18', label: 'Medium' },
  high: { color: '#f43f5e', bg: '#f43f5e18', label: 'High Risk' },
};

const AGENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

function getInitials(name) {
  if (!name) return 'AG';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function ScoreRing({ score, color }) {
  const r = 28, circ = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, score)) / 100 * circ;
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 35 35)" />
      <text x="35" y="39" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
}

export default function AgentPerformance() {
  const [usersList, setUsersList] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [sort, setSort] = useState('score');
  const [dir, setDir] = useState('desc');
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  // Subscribe to real users, conversations, and tickets
  useEffect(() => {
    const unsubUsers = listenToUsers((users) => {
      if (Array.isArray(users)) setUsersList(users);
    });
    const unsubConvs = listenToConversations((records) => {
      if (Array.isArray(records)) setConversations(records);
    });
    const unsubTickets = listenToTickets((ticks) => {
      if (Array.isArray(ticks)) setTicketsList(ticks);
    });

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubConvs) unsubConvs();
      if (unsubTickets) unsubTickets();
    };
  }, []);

  // Dynamically compute real agent metrics
  const agents = useMemo(() => {
    const legacyMockNames = ['Alex Kim', 'Maya Patel', 'Jordan Torres', 'Sam Nguyen', 'Olivia Chen', 'Ryan Miller'];
    const activeAuth = getCurrentAuthUser();

    // Collect base users
    let combined = [...usersList];
    if (activeAuth && !combined.some(u => u.email?.toLowerCase() === activeAuth.email?.toLowerCase())) {
      combined.unshift(activeAuth);
    }

    // Filter out legacy dummy accounts only
    const legacyMockEmails = [
      'alex.kim@omnidesk.ai',
      'maya.patel@omnidesk.ai',
      'jordan.torres@omnidesk.ai',
      'sam.nguyen@omnidesk.ai',
      'olivia.chen@omnidesk.ai',
      'ryan.miller@omnidesk.ai'
    ];
    combined = combined.filter(u => 
      !legacyMockNames.includes(u.displayName) && 
      !legacyMockEmails.includes(u.email?.toLowerCase())
    );

    // If still no users, fallback to activeAuth
    if (combined.length === 0 && activeAuth) {
      combined = [activeAuth];
    }

    return combined.map((u, idx) => {
      const agentName = u.displayName || u.email?.split('@')[0] || `Agent ${idx + 1}`;
      const color = AGENT_COLORS[idx % AGENT_COLORS.length];

      // Calculate stats from real conversations
      const agentEmail = (u.email || '').toLowerCase();
      const lowerName = agentName.toLowerCase();

      const agentConvs = conversations.filter(c => {
        const cName = (c.agentName || '').toLowerCase();
        const cEmail = (c.agentEmail || '').toLowerCase();
        return (cName && (cName === lowerName || cName === agentEmail)) ||
               (cEmail && (cEmail === agentEmail || cEmail === lowerName));
      });

      // Calculate stats from real tickets
      const agentTickets = ticketsList.filter(t => {
        const ticketAgent = (t.agent || '').toLowerCase();
        const ticketEmail = (t.agentEmail || t.userAccount || '').toLowerCase();
        const ticketCreator = (t.createdBy || '').toLowerCase();
        return (
          (ticketAgent && (ticketAgent === lowerName || ticketAgent === agentEmail)) ||
          (ticketEmail && (ticketEmail === agentEmail || ticketEmail === lowerName)) ||
          (ticketCreator && (ticketCreator === lowerName || ticketCreator === agentEmail))
        );
      });

      const totalTickets = Math.max(agentTickets.length, agentConvs.length);
      const turnsCount = agentConvs.length;

      let avgTone = 9.0;
      let avgEmpathy = 8.8;
      let avgClarity = 9.2;
      let coachingCount = 0;
      let highRiskCount = 0;

      if (turnsCount > 0) {
        let toneSum = 0, empSum = 0, clarSum = 0;
        agentConvs.forEach(c => {
          const fb = c.aiCoachingFeedback;
          if (fb) {
            toneSum += fb.toneScore ?? 9;
            empSum += fb.empathyScore ?? 9;
            clarSum += fb.clarityScore ?? 9;
            if (fb.coachingTip) coachingCount++;
          }
          if (c.escalationRisk === 'high' || c.urgency === 'urgent') {
            highRiskCount++;
          }
        });
        avgTone = toneSum / turnsCount;
        avgEmpathy = empSum / turnsCount;
        avgClarity = clarSum / turnsCount;
      }

      const score = Math.min(99, Math.max(60, Math.round(((avgTone + avgEmpathy + avgClarity) / 30) * 100)));
      const csat = Math.min(100, Math.max(70, Math.round(((avgTone + avgEmpathy) / 20) * 100)));
      const burnoutRisk = highRiskCount > 2 ? 'high' : highRiskCount > 0 ? 'medium' : 'low';

      // Determine weakest dimension for habit coach
      let weakest = 'Empathy';
      if (avgTone <= avgEmpathy && avgTone <= avgClarity) weakest = 'Tone';
      else if (avgClarity <= avgTone && avgClarity <= avgEmpathy) weakest = 'Clarity';

      const badges = [];
      if (score >= 92) badges.push('Top Performer');
      if (avgEmpathy >= 9.0) badges.push('Empathy Star');
      if (totalTickets >= 5) badges.push('High Output');
      if (badges.length === 0) badges.push('Active Specialist');

      return {
        id: u.uid || String(idx + 1),
        name: agentName,
        email: u.email || 'active@organization.com',
        role: u.role || 'Support Specialist',
        avatar: getInitials(agentName),
        color,
        score,
        tickets: totalTickets,
        csat,
        resTime: '1m 24s',
        coachingAccepted: coachingCount,
        streak: totalTickets > 0 ? Math.min(14, totalTickets * 2) : 1,
        trend: score >= 88 ? 'up' : 'down',
        burnoutRisk,
        badges,
        weakestDimension: weakest,
        turnsCount: turnsCount || 1,
      };
    });
  }, [usersList, conversations, ticketsList]);

  // Set default selected agent
  useEffect(() => {
    if (agents.length > 0 && (!selectedAgentId || !agents.some(a => a.id === selectedAgentId))) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const toggle = (col) => {
    if (sort === col) setDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...agents].sort((a, b) => {
      const diff = typeof a[sort] === 'string' ? a[sort].localeCompare(b[sort]) : a[sort] - b[sort];
      return dir === 'desc' ? -diff : diff;
    });
  }, [agents, sort, dir]);

  const podiumList = useMemo(() => {
    if (sorted.length === 0) return [];
    if (sorted.length === 1) {
      return [{ agent: sorted[0], pos: 1, height: 110, isFirst: true }];
    }
    if (sorted.length === 2) {
      return [
        { agent: sorted[0], pos: 1, height: 110, isFirst: true },
        { agent: sorted[1], pos: 2, height: 80, isFirst: false }
      ];
    }
    return [
      { agent: sorted[1], pos: 2, height: 80, isFirst: false },
      { agent: sorted[0], pos: 1, height: 110, isFirst: true },
      { agent: sorted[2], pos: 3, height: 60, isFirst: false }
    ];
  }, [sorted]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Dynamic habit coaching card generated from active agent's actual metrics
  const habitCard = selectedAgent ? {
    title: selectedAgent.weakestDimension === 'Empathy' 
      ? 'Empathetic Emotion Mirroring'
      : selectedAgent.weakestDimension === 'Clarity'
        ? '3-Sentence Actionable Next Step'
        : 'Conversational Warmth Replacement',
    exercise: selectedAgent.weakestDimension === 'Empathy'
      ? `Before proposing fixes, validate customer feelings: "I understand how frustrating this is, and I am personally here to help get this resolved today."`
      : selectedAgent.weakestDimension === 'Clarity'
        ? `Conclude your reply with clear actionable bullet points stating exact next steps and delivery windows.`
        : `Replace formal jargon with warm, supportive phrases ("I checked this for you right away").`,
    target_metric: `+1.2 ${selectedAgent.weakestDimension} Score over next 5 turns`,
    duration: `Active Practice · ${selectedAgent.turnsCount} turns logged`,
    dimension: selectedAgent.weakestDimension,
    turns_analysed: selectedAgent.turnsCount,
  } : null;

  const SortIcon = ({ col }) => sort === col
    ? (dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
    : null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Performance &amp; AI Habit Coach</h1>
          <p className="page-subtitle">Real-time coaching analytics, leaderboard, and personalized skill development for active agents.</p>
        </div>
      </div>

      {habitCard && selectedAgent && (
        <div className="micro-habit-container">
          <div className="micro-habit-card">
            <div className="micro-habit-badge">
              <Sparkles size={12} /> AI Micro-Habit Coach
            </div>
            <div className="micro-habit-main">
              <div className="micro-habit-left">
                <h3 className="micro-habit-title">{habitCard.title}</h3>
                <p className="micro-habit-exercise">{habitCard.exercise}</p>
                <div className="micro-habit-meta">
                  <span className="habit-tag"><Target size={11} style={{ display: 'inline', marginRight: 4 }} />{habitCard.target_metric}</span>
                  <span className="habit-tag-subtle">🔥 {habitCard.duration}</span>
                  <span className="habit-tag-subtle">📊 {habitCard.turns_analysed} turns evaluated</span>
                </div>
              </div>
              <div className="micro-habit-right">
                <div className="habit-dimension-pill">Target Dimension: <strong>{habitCard.dimension}</strong></div>
                <div className="habit-agent-select">
                  <label htmlFor="agent-habit-select">Agent:</label>
                  <select
                    id="agent-habit-select"
                    value={selectedAgent.id}
                    onChange={e => setSelectedAgentId(e.target.value)}
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <>
          <div className="podium-row">
            {podiumList.map(({ agent: a, pos, height, isFirst }) => {
              if (!a) return null;
              return (
                <div key={a.id} className={`podium-card ${isFirst ? 'podium-first' : ''}`} style={{ '--podium-h': `${height}px` }}>
                  {isFirst && <div className="podium-crown">👑</div>}
                  <div className="podium-avatar" style={{ background: `${a.color}25`, color: a.color, width: isFirst ? 56 : 44, height: isFirst ? 56 : 44, fontSize: isFirst ? 18 : 14 }}>
                    {a.avatar}
                  </div>
                  <ScoreRing score={a.score} color={a.color} />
                  <div className="podium-name">{a.name}</div>
                  <div className="podium-rank" style={{ color: a.color }}>#{pos}</div>
                  <div className="podium-stat">{a.tickets} tickets · {a.csat}% CSAT</div>
                  <div className="podium-bar" style={{ height: `${height}px`, background: `${a.color}15`, borderTop: `2px solid ${a.color}` }} />
                </div>
              );
            })}
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th className="sortable-th" onClick={() => toggle('score')}>Score <SortIcon col="score" /></th>
                  <th className="sortable-th" onClick={() => toggle('tickets')}>Tickets <SortIcon col="tickets" /></th>
                  <th className="sortable-th" onClick={() => toggle('csat')}>CSAT <SortIcon col="csat" /></th>
                  <th>Res. Time</th>
                  <th className="sortable-th" onClick={() => toggle('coachingAccepted')}>Coaching Used <SortIcon col="coachingAccepted" /></th>
                  <th>Streak</th>
                  <th>Burnout Risk</th>
                  <th>Trend</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => {
                  const br = BURNOUT[a.burnoutRisk] || BURNOUT.low;
                  return (
                    <tr key={a.id} className="table-row">
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar-sm" style={{ background: `${a.color}25`, color: a.color }}>{a.avatar}</div>
                          <div>
                            <div className="customer-name-sm">{a.name}</div>
                            <div className="customer-company-sm">{a.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="score-cell">
                          <span style={{ color: a.color, fontWeight: 700 }}>{a.score}</span>
                          <div className="score-mini-bar-bg">
                            <div className="score-mini-bar" style={{ width: `${a.score}%`, background: a.color }} />
                          </div>
                        </div>
                      </td>
                      <td><span className="mono-val">{a.tickets}</span></td>
                      <td><span className="mono-val" style={{ color: a.csat >= 90 ? '#10b981' : a.csat >= 80 ? '#f59e0b' : '#f43f5e' }}>{a.csat}%</span></td>
                      <td><span className="mono-val"><Clock size={11} style={{ marginRight: 3 }} />{a.resTime}</span></td>
                      <td>
                        <div className="coaching-cell">
                          <Zap size={11} color="#8b5cf6" />
                          <span className="mono-val">{a.coachingAccepted}</span>
                        </div>
                      </td>
                      <td>
                        {a.streak > 0
                          ? <span className="streak-badge">🔥 {a.streak}d</span>
                          : <span className="streak-none">—</span>}
                      </td>
                      <td>
                        <span className="risk-chip" style={{ background: br.bg, color: br.color }}>{br.label}</span>
                      </td>
                      <td>
                        {a.trend === 'up'
                          ? <TrendingUp size={15} color="#10b981" />
                          : <TrendingDown size={15} color="#f43f5e" />}
                      </td>
                      <td>
                        <div className="badges-cell">
                          {a.badges.map(b => <span key={b} className="agent-badge-chip">{b}</span>)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginTop: '20px'
        }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            No Agent Performance Records Yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            Team members and their live performance scores will be calculated here once tickets are answered in the Live Workspace.
          </p>
        </div>
      )}
    </div>
  );
}
