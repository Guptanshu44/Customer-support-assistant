import React from 'react';
import {
  Zap, AlertTriangle, BrainCircuit, CheckCircle2, ArrowLeftRight,
  Sparkles, ClipboardPaste, HeartPulse, TrendingUp, Target,
  DollarSign, Dna, ChevronRight, Activity, Tag
} from 'lucide-react';
import { extractShortIssue } from '../api/client';

export default function CopilotSidebar({
  copilotFeedback,
  latency,
  isAnalyzing,
  supervisorStats,
  onApplySnippet,
  width,
}) {
  const analysis   = copilotFeedback?.analysis   || null;
  const feedback   = copilotFeedback?.feedback   || null;
  const compliance = copilotFeedback?.compliance || null;
  const burnout    = copilotFeedback?.burnout    || null;
  const momentum   = copilotFeedback?.momentum   || null;
  const clvRisk    = copilotFeedback?.clv_risk   || null;

  const rawIssue = (analysis?.key_issue || '')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '').trim();
  const cleanIssue = rawIssue ? extractShortIssue(rawIssue) : '';

  const cleanTip = (feedback?.coaching_tip || 'Response is well structured.')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '').trim();

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—');

  // Color maps for sentiment / urgency / risk
  const SIGNAL_COLORS = {
    positive:  { bg: '#10b98118', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    negative:  { bg: '#f43f5e18', color: '#f43f5e', border: 'rgba(244,63,94,0.25)' },
    neutral:   { bg: '#f59e0b18', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    low:       { bg: '#10b98118', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    medium:    { bg: '#f59e0b18', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    high:      { bg: '#f43f5e18', color: '#f43f5e', border: 'rgba(244,63,94,0.25)' },
    critical:  { bg: '#f43f5e18', color: '#f43f5e', border: 'rgba(244,63,94,0.25)' },
  };
  const getSignalStyle = (val) => SIGNAL_COLORS[(val || 'neutral').toLowerCase()] || SIGNAL_COLORS.neutral;

  // Score bar color
  const scoreColor = (score) => score >= 8 ? '#10b981' : score >= 6 ? '#6366f1' : '#f59e0b';

  // Burnout / momentum helpers
  const burnoutColorClass = { low: 'burnout-low', moderate: 'burnout-moderate', high: 'burnout-high', critical: 'burnout-critical' }[burnout?.burnout_risk] || 'burnout-low';
  const momentumIcon = { resolution: '🟢', escalation: '🔴', stalemate: '🟡', too_early: '⏳' }[momentum?.outcome_prediction] || '⏳';
  const momentumColorClass = { resolution: 'momentum-good', escalation: 'momentum-bad', stalemate: 'momentum-neutral', too_early: 'momentum-neutral' }[momentum?.outcome_prediction] || 'momentum-neutral';
  const clvColorClass = { low: 'clv-low', medium: 'clv-medium', high: 'clv-high', critical: 'clv-critical' }[clvRisk?.clv_risk] || 'clv-low';

  return (
    <aside className="copilot-sidebar" style={width ? { width: width, flexShrink: 0 } : undefined}>

      {/* ── Header ── */}
      <div className="copilot-header">
        <div className="copilot-title">
          <BrainCircuit size={15} style={{ color: '#818cf8' }} />
          <span>AI Coaching Panel</span>
        </div>
        <span className={`copilot-latency-pill ${isAnalyzing ? 'latency-analyzing' : ''}`} id="latency-indicator">
          {isAnalyzing ? '⚡ Analyzing…' : latency || 'Waiting…'}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="copilot-body" id="copilot-content">

        {!copilotFeedback ? (
          /* Empty / guide state */
          <div className="copilot-guide">
            <div className="copilot-guide-icon"><BrainCircuit size={30} style={{ color: '#6366f1' }} /></div>
            <div className="copilot-guide-title">How It Works</div>
            <ol className="copilot-guide-steps">
              <li>
                <span className="guide-num">1</span>
                <div><strong>Paste customer message</strong><p>Enter or click a quick template in the composer.</p></div>
              </li>
              <li>
                <span className="guide-num">2</span>
                <div><strong>AI analyzes instantly</strong><p>Sentiment, urgency, escalation risk &amp; reply suggestion appear here.</p></div>
              </li>
              <li>
                <span className="guide-num">3</span>
                <div><strong>Apply &amp; reply</strong><p>Click "Apply to My Response" to use the knowledge base suggestion, then send.</p></div>
              </li>
            </ol>
            <div className="copilot-guide-hint">
              <ArrowLeftRight size={11} /> Results appear here after analysis
            </div>
          </div>
        ) : (
          <>
            {/* ══ CUSTOMER SIGNAL ANALYSIS ══ */}
            <div className="cp-section">
              <div className="cp-section-header">
                <span className="cp-section-icon">📡</span>
                <span className="cp-section-title">Customer Signal Analysis</span>
                <CheckCircle2 size={13} style={{ color: 'var(--emerald)', marginLeft: 'auto' }} />
              </div>

              {/* 2×2 compact pill grid — all 4 signals together */}
              <div className="signal-pills-grid">
                {[
                  { label: 'Sentiment',       val: analysis?.sentiment        || 'Neutral' },
                  { label: 'Urgency',         val: analysis?.urgency          || 'Low'     },
                  { label: 'Escalation Risk', val: analysis?.escalation_risk  || 'Low'     },
                  { label: 'Intention',       val: analysis?.intent || analysis?.detected_intent || 'General' },
                ].map(s => {
                  const st = getSignalStyle(s.val);
                  return (
                    <div className="signal-pill-block" key={s.label}>
                      <div className="signal-pill-label">{s.label}</div>
                      <div className="signal-pill-val" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {capitalize(s.val)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Identified issue — truncated to 2 lines */}
              {cleanIssue && (
                <div className="identified-issue">
                  <span className="issue-label">Identified Issue: </span>
                  <span className="issue-text">{cleanIssue}</span>
                </div>
              )}
            </div>

            {/* ══ AI COACHING RECOMMENDATION ══ */}
            <div className="cp-section cp-section--coaching">
              <div className="cp-section-header">
                <Sparkles size={13} style={{ color: '#a78bfa' }} />
                <span className="cp-section-title">AI Coaching Recommendation</span>
              </div>
              <p className="coaching-tip-text">{cleanTip}</p>
            </div>

            {/* ══ RESPONSE QUALITY SCORES ══ */}
            <div className="cp-section">
              <div className="cp-section-header">
                <span className="cp-section-icon">📊</span>
                <span className="cp-section-title">Response Quality Scores</span>
              </div>
              <div className="quality-scores-list">
                {[
                  { label: 'Tone Alignment',    score: feedback?.tone_score    || 0 },
                  { label: 'Customer Empathy',  score: feedback?.empathy_score || 0 },
                  { label: 'Clarity & Directness', score: feedback?.clarity_score || 0 },
                ].map(s => (
                  <div className="quality-score-row" key={s.label}>
                    <span className="quality-score-label">{s.label}</span>
                    <div className="quality-score-track">
                      <div
                        className="quality-score-fill"
                        style={{ width: `${s.score * 10}%`, background: scoreColor(s.score) }}
                      />
                    </div>
                    <span className="quality-score-num" style={{ color: scoreColor(s.score) }}>{s.score}/10</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ NOVEL: Burnout Detector ══ */}
            {burnout && (
              <div className={`novel-card novel-card--burnout ${burnoutColorClass}`}>
                <div className="novel-card-header">
                  <HeartPulse size={13} />
                  <span>Agent Stress Monitor</span>
                  <span className={`novel-badge ${burnoutColorClass}`}>{capitalize(burnout.burnout_risk)}</span>
                </div>
                <div className="burnout-gauge-row">
                  <div className="burnout-gauge-wrap">
                    <svg viewBox="0 0 80 48" className="burnout-arc-svg">
                      <path d="M8,44 A36,36 0 0,1 72,44" stroke="#1e293b" strokeWidth="7" fill="none" strokeLinecap="round"/>
                      <path d="M8,44 A36,36 0 0,1 72,44"
                        stroke={burnout.burnout_risk === 'critical' ? '#f43f5e' : burnout.burnout_risk === 'high' ? '#f59e0b' : '#10b981'}
                        strokeWidth="7" fill="none" strokeLinecap="round"
                        strokeDasharray={`${(burnout.burnout_index / 100) * 101} 101`} />
                    </svg>
                    <div className="burnout-gauge-num">{Math.round(burnout.burnout_index)}</div>
                    <div className="burnout-gauge-label">/ 100</div>
                  </div>
                  <div className="burnout-signals">
                    {burnout.signals?.lexical_richness_drop_pct !== undefined && <div className="burnout-signal-row"><span className="bsig-label">Vocab Drop</span><span className="bsig-val">{burnout.signals.lexical_richness_drop_pct}%</span></div>}
                    {burnout.signals?.empathy_density_drop_pct !== undefined && <div className="burnout-signal-row"><span className="bsig-label">Empathy Drop</span><span className="bsig-val">{burnout.signals.empathy_density_drop_pct}%</span></div>}
                    {burnout.signals?.recent_brevity_score !== undefined && <div className="burnout-signal-row"><span className="bsig-label">Brevity</span><span className="bsig-val">{Math.round(burnout.signals.recent_brevity_score * 100)}%</span></div>}
                  </div>
                </div>
                {burnout.burnout_risk !== 'low' && <div className="novel-action-tip"><Activity size={10} />{burnout.supervisor_action}</div>}
              </div>
            )}

            {/* ══ NOVEL: Momentum Forecaster ══ */}
            {momentum && momentum.outcome_prediction !== 'too_early' && (
              <div className={`novel-card novel-card--momentum ${momentumColorClass}`}>
                <div className="novel-card-header">
                  <TrendingUp size={13} />
                  <span>Outcome Forecast</span>
                  <span className={`novel-badge ${momentumColorClass}`}>{momentumIcon} {capitalize(momentum.outcome_prediction)}</span>
                </div>
                <div className="momentum-conf-row">
                  <div className="momentum-conf-bar-track">
                    <div className={`momentum-conf-bar-fill ${momentumColorClass}`} style={{ width: `${momentum.confidence}%` }} />
                  </div>
                  <span className="momentum-conf-pct">{momentum.confidence}%</span>
                </div>
                <div className="momentum-meta-row">
                  <span className="momentum-meta-item">ETA: <strong>{momentum.turns_until_outcome} turn{momentum.turns_until_outcome !== 1 ? 's' : ''}</strong></span>
                  {momentum.momentum_signals?.sentiment_slope !== undefined && (
                    <span className="momentum-meta-item">Trend: <strong style={{ color: momentum.momentum_signals.sentiment_slope > 0 ? '#10b981' : '#f43f5e' }}>{momentum.momentum_signals.sentiment_slope > 0 ? '↑ Improving' : '↓ Declining'}</strong></span>
                  )}
                </div>
                <div className="novel-action-tip"><ChevronRight size={10} />{momentum.reasoning}</div>
              </div>
            )}

            {/* ══ NOVEL: CLV Risk ══ */}
            {clvRisk && (
              <div className={`novel-card novel-card--clv ${clvColorClass}`}>
                <div className="novel-card-header">
                  <DollarSign size={13} />
                  <span>Revenue at Risk</span>
                  <span className={`novel-badge ${clvColorClass}`}>{clvRisk.priority_flag ? '🚨 Priority' : capitalize(clvRisk.clv_risk)}</span>
                </div>
                <div className="clv-amounts-row">
                  <div className="clv-amount-block"><div className="clv-amount-num clv-at-risk">{clvRisk.revenue_at_risk}</div><div className="clv-amount-label">At Risk</div></div>
                  <div className="clv-divider" />
                  <div className="clv-amount-block"><div className="clv-amount-num">{clvRisk.annual_plan_value}</div><div className="clv-amount-label">Annual Value</div></div>
                  <div className="clv-divider" />
                  <div className="clv-amount-block"><div className="clv-amount-num">{Math.round((clvRisk.churn_probability || 0) * 100)}%</div><div className="clv-amount-label">Churn Risk</div></div>
                </div>
                {clvRisk.issue_type && <div className="clv-issue-type">Issue type: <strong>{capitalize(clvRisk.issue_type)}</strong></div>}
                <div className="novel-action-tip"><Target size={10} />{clvRisk.retention_tip}</div>
              </div>
            )}

            {/* ══ Compliance Alert ══ */}
            {compliance?.violation && (
              <div className="compliance-alert">
                <div className="compliance-alert-title"><AlertTriangle size={12} /> Compliance Warning</div>
                <div>{compliance.issue}</div>
                <div className="compliance-fix">Fix: {compliance.suggestion}</div>
              </div>
            )}

            {/* ══ Knowledge Base — Apply CTA ══ */}
            {feedback?.knowledge_suggestion && (
              <div className="kb-card">
                <div className="kb-card-header">📚 Relevant Knowledge Base Match</div>
                <div className="kb-card-body">{feedback.knowledge_suggestion}</div>
                <button
                  type="button"
                  className="apply-to-response-btn"
                  onClick={() => onApplySnippet(feedback.knowledge_suggestion)}
                >
                  <ClipboardPaste size={13} />
                  Apply to My Response
                </button>
              </div>
            )}
          </>
        )}

        {/* ══ Session Quality Metrics ══ */}
        <div className="session-quality-section">
          <div className="cp-section-label">Session Quality Metrics</div>
          <div className="session-quality-grid">
            {[
              { label: 'Avg Tone',    val: supervisorStats?.avg_tone,    id: 'avg-tone' },
              { label: 'Empathy',     val: supervisorStats?.avg_empathy, id: 'avg-empathy' },
              { label: 'Clarity',     val: supervisorStats?.avg_clarity, id: 'avg-clarity' },
            ].map(s => (
              <div className="session-quality-card" key={s.label}>
                <div className="session-quality-val" id={s.id}>{s.val ? `${s.val}/10` : '—'}</div>
                <div className="session-quality-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
