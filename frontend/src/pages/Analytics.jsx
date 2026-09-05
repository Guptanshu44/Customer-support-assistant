import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Star, Zap, MessageSquare, Clock, BarChart2, Calendar } from 'lucide-react';

// --- SVG Line Chart ---
function LineChart({ data = [], labels = [], color = '#6366f1', height = 160 }) {
  if (!data || data.length === 0) return null;
  const w = 100, h = 100;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const divisor = data.length > 1 ? (data.length - 1) : 1;
  const pts = data.map((v, i) => {
    const x = (i / divisor) * w;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    return [x, y];
  });
  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPts = `0,${h} ` + polyPts + ` ${w},${h}`;

  return (
    <div className="chart-wrap" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={height - 32}>
        <defs>
          <linearGradient id={`cg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill={`url(#cg-${color.replace('#','')})`} />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill={color} />
        ))}
      </svg>
      <div className="chart-x-labels">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

// --- SVG Bar Chart ---
function BarChart({ data, labels, colors }) {
  const max = Math.max(...data) || 1;
  return (
    <div className="bar-chart-wrap">
      <div className="bar-chart-bars">
        {data.map((v, i) => (
          <div key={i} className="bar-col">
            <div className="bar-value-label">{v}</div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
            <div className="bar-label">{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days'];

const chartData = {
  'Last 7 days': {
    csat: { data: [88, 87, 90, 89, 91, 92, 91.4], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    volume: { data: [42, 55, 61, 48, 70, 38, 29], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    resolution: { data: [95, 110, 88, 102, 94, 78, 85], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    coaching: { data: [23, 31, 28, 35, 40, 22, 18], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  },
  'Last 30 days': {
    csat: { data: [84, 86, 85, 88, 87, 90, 89, 91, 92, 91, 90, 93, 91, 92, 94, 91, 93, 92, 90, 91, 93, 95, 94, 93, 92, 91, 92, 93, 92, 91.4], labels: Array.from({length:30},(_,i)=>`D${i+1}`) },
    volume: { data: [40,45,50,55,48,52,58,42,61,55,48,65,70,63,58,52,48,55,60,58,65,72,68,65,60,55,50,45,40,35], labels: Array.from({length:30},(_,i)=>`D${i+1}`) },
    resolution: { data: [110,105,100,98,102,96,95,100,92,94,88,90,85,88,90,92,86,84,82,80,85,88,82,80,78,82,85,88,84,85], labels: Array.from({length:30},(_,i)=>`D${i+1}`) },
    coaching: { data: [15,18,22,25,20,28,30,24,32,28,25,35,38,32,30,28,25,30,34,32,38,42,40,38,35,30,28,25,22,20], labels: Array.from({length:30},(_,i)=>`D${i+1}`) },
  },
};
chartData['Last 90 days'] = chartData['Last 30 days'];

const channelData = [320, 185, 95, 52];
const channelLabels = ['Chat', 'Email', 'Phone', 'Social'];
const channelColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];

const summaryCards = [
  { label: 'Avg CSAT', value: '91.4%', change: '+2.3%', up: true, color: '#f59e0b', icon: Star },
  { label: 'Tickets Resolved', value: '1,842', change: '+12%', up: true, color: '#10b981', icon: MessageSquare },
  { label: 'Avg Resolution Time', value: '1m 42s', change: '-18s', up: true, color: '#6366f1', icon: Clock },
  { label: 'AI Coaching Usage', value: '78%', change: '+5%', up: true, color: '#8b5cf6', icon: Zap },
];

export default function Analytics() {
  const [range, setRange] = useState('Last 7 days');
  const d = chartData[range];
  const labels = d.csat.labels.length > 15 ? d.csat.labels.filter((_, i) => i % 5 === 0) : d.csat.labels;
  const slim = (arr) => arr.length > 15 ? arr.filter((_, i) => i % 5 === 0) : arr;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Performance metrics and trends across your support organization.</p>
        </div>
        <div className="filter-bar" style={{ margin: 0 }}>
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          {RANGES.map(r => (
            <button key={r} className={`filter-chip ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary-grid">
        {summaryCards.map((c, i) => (
          <div className="analytics-summary-card" key={i}>
            <div className="analytics-card-icon" style={{ background: `${c.color}18`, color: c.color }}>
              <c.icon size={16} />
            </div>
            <div className="analytics-card-body">
              <div className="analytics-card-value">{c.value}</div>
              <div className="analytics-card-label">{c.label}</div>
            </div>
            <div className={`analytics-card-change ${c.up ? 'good' : 'bad'}`}>
              {c.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {c.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="analytics-charts-row">
        <div className="analytics-chart-card wide">
          <div className="chart-card-header">
            <h3 className="chart-title">CSAT Score Trend</h3>
            <span className="chart-subtitle">Customer Satisfaction over {range.toLowerCase()}</span>
          </div>
          <LineChart data={slim(d.csat.data)} labels={labels} color="#f59e0b" height={180} />
        </div>
        <div className="analytics-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">Volume by Channel</h3>
            <span className="chart-subtitle">Ticket distribution</span>
          </div>
          <BarChart data={channelData} labels={channelLabels} colors={channelColors} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="analytics-charts-row">
        <div className="analytics-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">Resolution Time</h3>
            <span className="chart-subtitle">Avg seconds per resolution</span>
          </div>
          <LineChart data={slim(d.resolution.data)} labels={labels} color="#6366f1" height={160} />
        </div>
        <div className="analytics-chart-card wide">
          <div className="chart-card-header">
            <h3 className="chart-title">AI Coaching Suggestions</h3>
            <span className="chart-subtitle">Daily coaching events generated</span>
          </div>
          <LineChart data={slim(d.coaching.data)} labels={labels} color="#8b5cf6" height={160} />
        </div>
      </div>
    </div>
  );
}
