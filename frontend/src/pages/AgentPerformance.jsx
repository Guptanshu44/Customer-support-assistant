import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Award, Zap, MessageSquare, Clock, Star, Activity, AlertTriangle, ChevronUp, ChevronDown, Sparkles, Target } from 'lucide-react';
import { api } from '../api/client';

const agents = [
  { id: 1, name: 'Alex Kim', email: 'alex.k@omnidesk.ai', role: 'Senior Agent', avatar: 'AK', color: '#6366f1', score: 97, tickets: 34, csat: 98, resTime: '1m 12s', coachingAccepted: 28, streak: 14, trend: 'up', burnoutRisk: 'low', badges: ['Top Performer', 'Speed Champion'] },
  { id: 2, name: 'Maya Patel', email: 'maya.p@omnidesk.ai', role: 'Senior Agent', avatar: 'MP', color: '#10b981', score: 94, tickets: 29, csat: 95, resTime: '1m 28s', coachingAccepted: 24, streak: 9, trend: 'up', burnoutRisk: 'low', badges: ['Empathy Star'] },
  { id: 3, name: 'Jordan Torres', email: 'jordan.t@omnidesk.ai', role: 'Agent', avatar: 'JT', color: '#f59e0b', score: 88, tickets: 31, csat: 91, resTime: '1m 55s', coachingAccepted: 20, streak: 5, trend: 'up', burnoutRisk: 'medium', badges: ['Fast Responder'] },
  { id: 4, name: 'Sam Nguyen', email: 'sam.n@omnidesk.ai', role: 'Agent', avatar: 'SN', color: '#8b5cf6', score: 85, tickets: 26, csat: 89, resTime: '2m 10s', coachingAccepted: 17, streak: 3, trend: 'down', burnoutRisk: 'low', badges: [] },
  { id: 5, name: 'Olivia Chen', email: 'olivia.c@omnidesk.ai', role: 'Junior Agent', avatar: 'OC', color: '#ec4899', score: 79, tickets: 22, csat: 85, resTime: '2m 34s', coachingAccepted: 15, streak: 0, trend: 'up', burnoutRisk: 'low', badges: ['Rising Star'] },
  { id: 6, name: 'Ryan Miller', email: 'ryan.m@omnidesk.ai', role: 'Agent', avatar: 'RM', color: '#06b6d4', score: 74, tickets: 28, csat: 82, resTime: '2m 48s', coachingAccepted: 10, streak: 0, trend: 'down', burnoutRisk: 'high', badges: [] },
];

const BURNOUT = {
  low: { color: '#10b981', bg: '#10b98118', label: 'Low' },
  medium: { color: '#f59e0b', bg: '#f59e0b18', label: 'Medium' },
  high: { color: '#f43f5e', bg: '#f43f5e18', label: 'High Risk' },
};

function ScoreRing({ score, color }) {
  const r = 28, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
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
  const [sort, setSort] = useState('score');
  const [dir, setDir] = useState('desc');
  const [selectedAgentId, setSelectedAgentId] = useState(1);
  const [habitCard, setHabitCard] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getAgentHabits(selectedAgentId).then(card => {
      if (mounted) setHabitCard(card);
    });
    return () => { mounted = false; };
  }, [selectedAgentId]);

  const toggle = (col) => {
    if (sort === col) setDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setDir('desc'); }
  };

  const sorted = [...agents].sort((a, b) => {
    const diff = typeof a[sort] === 'string' ? a[sort].localeCompare(b[sort]) : a[sort] - b[sort];
    return dir === 'desc' ? -diff : diff;
  });

  const SortIcon = ({ col }) => sort === col
    ? (dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
    : null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Performance &amp; AI Habit Coach</h1>
          <p className="page-subtitle">Real-time coaching analytics, leaderboard, and personalized skill development.</p>
        </div>
      </div>

      {habitCard && (
        <div className="micro-habit-container">
          <div className="micro-habit-card">
            <div className="micro-habit-badge">
              <Sparkles size={12} /> AI Micro-Habit Coach
            </div>
            <div className="micro-habit-main">
              <div className="micro-habit-left">
                <h3 className="micro-habit-title">{habitCard.title || 'Targeted Micro-Habit Exercise'}</h3>
                <p className="micro-habit-exercise">{habitCard.exercise}</p>
                <div className="micro-habit-meta">
                  <span className="habit-tag"><Target size={11} style={{ display: 'inline', marginRight: 4 }} />{habitCard.target_metric}</span>
                  <span className="habit-tag-subtle">🔥 {habitCard.duration || 'Day 4 Active Streak'}</span>
                  <span className="habit-tag-subtle">📊 {habitCard.turns_analysed || 34} turns evaluated</span>
                </div>
              </div>
              <div className="micro-habit-right">
                <div className="habit-dimension-pill">Target Dimension: <strong>{habitCard.dimension || habitCard.weakest_dimension}</strong></div>
                <div className="habit-agent-select">
                  <label htmlFor="agent-habit-select">Agent:</label>
                  <select
                    id="agent-habit-select"
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(Number(e.target.value))}
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

      <div className="podium-row">
        {[sorted[1], sorted[0], sorted[2]].map((a, idx) => {
          if (!a) return null;
          const pos = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const heights = [80, 110, 60];
          const isFirst = pos === 1;
          return (
            <div key={a.id} className={`podium-card ${isFirst ? 'podium-first' : ''}`} style={{ '--podium-h': `${heights[idx]}px` }}>
              {isFirst && <div className="podium-crown">👑</div>}
              <div className="podium-avatar" style={{ background: `${a.color}25`, color: a.color, width: isFirst ? 56 : 44, height: isFirst ? 56 : 44, fontSize: isFirst ? 18 : 14 }}>
                {a.avatar}
              </div>
              <ScoreRing score={a.score} color={a.color} />
              <div className="podium-name">{a.name}</div>
              <div className="podium-rank" style={{ color: a.color }}>#{pos}</div>
              <div className="podium-stat">{a.tickets} tickets · {a.csat}% CSAT</div>
              <div className="podium-bar" style={{ height: heights[idx], background: `${a.color}15`, borderTop: `2px solid ${a.color}` }} />
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
            {sorted.map((a, i) => {
              const br = BURNOUT[a.burnoutRisk];
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
    </div>
  );
}
