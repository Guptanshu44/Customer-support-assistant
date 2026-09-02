import React, { useState } from 'react';
import { Download, Calendar, FileText, BarChart2, Star, Zap, Users, Filter, ChevronDown } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'csat', label: 'CSAT Report', icon: Star, color: '#f59e0b', desc: 'Customer satisfaction scores and trends' },
  { id: 'volume', label: 'Volume Report', icon: BarChart2, color: '#6366f1', desc: 'Ticket volume by channel, agent, and time' },
  { id: 'performance', label: 'Performance Report', icon: Users, color: '#10b981', desc: 'Agent KPIs, resolution times, and efficiency' },
  { id: 'coaching', label: 'Coaching Report', icon: Zap, color: '#8b5cf6', desc: 'AI coaching usage, acceptance rates, and impact' },
];

const PREVIEW_DATA = {
  csat: {
    headers: ['Date', 'Agent', 'Customer', 'Score', 'Channel', 'Ticket'],
    rows: [
      ['2025-09-02', 'Alex Kim', 'Sarah Mitchell', '⭐⭐⭐⭐⭐ (5)', 'Chat', '#2341'],
      ['2025-09-02', 'Maya Patel', 'Tom Zhang', '⭐⭐⭐⭐⭐ (5)', 'Chat', '#2336'],
      ['2025-09-01', 'Jordan Torres', 'Emma Wilson', '⭐⭐⭐⭐ (4)', 'Email', '#2337'],
      ['2025-09-01', 'Sam Nguyen', 'Daniel Brown', '⭐⭐⭐⭐ (4)', 'Email', '#2334'],
      ['2025-08-31', 'Alex Kim', 'Sophie Turner', '⭐⭐⭐⭐⭐ (5)', 'Chat', '#2333'],
      ['2025-08-31', 'Maya Patel', 'Robert Lee', '⭐⭐⭐ (3)', 'Email', '#2330'],
      ['2025-08-30', 'Olivia Chen', 'Mark Davis', '⭐⭐⭐⭐ (4)', 'Email', '#2332'],
    ],
  },
  volume: {
    headers: ['Date', 'Channel', 'New Tickets', 'Resolved', 'Pending', 'Avg Wait'],
    rows: [
      ['2025-09-02', 'Chat', '42', '38', '4', '1m 12s'],
      ['2025-09-02', 'Email', '31', '28', '3', '2m 45s'],
      ['2025-09-02', 'Phone', '15', '14', '1', '0m 58s'],
      ['2025-09-01', 'Chat', '55', '50', '5', '1m 30s'],
      ['2025-09-01', 'Email', '40', '36', '4', '3m 10s'],
      ['2025-08-31', 'Chat', '48', '47', '1', '1m 05s'],
    ],
  },
  performance: {
    headers: ['Agent', 'Tickets Closed', 'Avg Res. Time', 'CSAT', 'Coaching Used', 'Score'],
    rows: [
      ['Alex Kim', '34', '1m 12s', '98%', '28/30', '97'],
      ['Maya Patel', '29', '1m 28s', '95%', '24/26', '94'],
      ['Jordan Torres', '31', '1m 55s', '91%', '20/25', '88'],
      ['Sam Nguyen', '26', '2m 10s', '89%', '17/22', '85'],
      ['Olivia Chen', '22', '2m 34s', '85%', '15/20', '79'],
      ['Ryan Miller', '28', '2m 48s', '82%', '10/24', '74'],
    ],
  },
  coaching: {
    headers: ['Date', 'Agent', 'Suggestions', 'Accepted', 'Rejected', 'Acceptance Rate', 'Impact'],
    rows: [
      ['2025-09-02', 'Alex Kim', '12', '11', '1', '92%', '+4.2% CSAT'],
      ['2025-09-02', 'Maya Patel', '9', '8', '1', '89%', '+3.8% CSAT'],
      ['2025-09-01', 'Jordan Torres', '10', '8', '2', '80%', '+2.9% CSAT'],
      ['2025-09-01', 'Sam Nguyen', '8', '6', '2', '75%', '+2.1% CSAT'],
      ['2025-08-31', 'Olivia Chen', '7', '5', '2', '71%', '+1.8% CSAT'],
    ],
  },
};

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This month', 'Last month', 'Custom'];

export default function Reports() {
  const [reportType, setReportType] = useState('csat');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true);

  const preview = PREVIEW_DATA[reportType];

  const generateReport = async () => {
    setGenerating(true);
    setGenerated(false);
    await new Promise(r => setTimeout(r, 1000));
    setGenerating(false);
    setGenerated(true);
  };

  const currentType = REPORT_TYPES.find(r => r.id === reportType);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate, preview, and export detailed support analytics reports.</p>
        </div>
      </div>

      {/* Report Type Selector */}
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

      {/* Filters Row */}
      <div className="toolbar-row">
        <div className="filter-bar" style={{ margin: 0 }}>
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          {DATE_RANGES.slice(0, 5).map(r => (
            <button key={r} className={`filter-chip ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
          ))}
        </div>
        <button className="btn-primary-sm" onClick={generateReport} disabled={generating}>
          {generating ? <span className="auth-spinner" /> : <FileText size={14} />}
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
        {generated && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost-sm"><Download size={13} /> Export CSV</button>
            <button className="btn-ghost-sm"><Download size={13} /> Export PDF</button>
          </div>
        )}
      </div>

      {/* Preview */}
      {generated && (
        <div className="table-card">
          <div className="report-preview-header">
            <div>
              <div className="report-preview-title" style={{ color: currentType.color }}>
                <currentType.icon size={15} /> {currentType.label}
              </div>
              <div className="report-preview-meta">{dateRange} · {preview.rows.length} records</div>
            </div>
          </div>
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
        </div>
      )}
    </div>
  );
}
