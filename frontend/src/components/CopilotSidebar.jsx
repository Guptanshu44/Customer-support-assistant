import React from 'react';
import { Zap, AlertTriangle, BrainCircuit, CheckCircle2, ArrowLeftRight, Sparkles, ClipboardPaste } from 'lucide-react';

export default function CopilotSidebar({
  copilotFeedback,
  latency,
  isAnalyzing,
  supervisorStats,
  onApplySnippet,
}) {
  const analysis  = copilotFeedback?.analysis  || null;
  const feedback  = copilotFeedback?.feedback  || null;
  const compliance = copilotFeedback?.compliance || null;

  const cleanIssue = (analysis?.key_issue || '')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '').trim();

  const cleanTip = (feedback?.coaching_tip || 'Response is well structured.')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '').trim();

  const sentimentTag = 'tag-' + (analysis?.sentiment || 'neutral').toLowerCase();
  const urgencyTag   = 'tag-' + (analysis?.urgency   || 'low').toLowerCase();
  const riskTag      = 'tag-' + (analysis?.escalation_risk || 'low').toLowerCase();

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

  return (
    <aside className="copilot-sidebar">
      {/* Header */}
      <div className="copilot-header">
        <div className="copilot-title">
          <BrainCircuit size={15} style={{ color: '#60a5fa' }} />
          <span>AI Coaching Panel</span>
        </div>
        <span className={`latency-pill ${isAnalyzing ? 'latency-pill--analyzing' : ''}`} id="latency-indicator">
          {isAnalyzing ? '⚡ Analyzing…' : latency || 'Waiting…'}
        </span>
      </div>

      <div className="copilot-content" id="copilot-content">
        {!copilotFeedback ? (
          /* ── Empty / waiting state with instructions ── */
          <div className="coaching-guide">
            <div className="coaching-guide-icon">
              <BrainCircuit size={28} style={{ color: '#3b82f6' }} />
            </div>
            <div className="coaching-guide-title">How It Works</div>
            <ol className="coaching-guide-steps">
              <li>
                <span className="guide-step-num">1</span>
                <div>
                  <strong>Paste customer message</strong>
                  <p>Enter or click a quick template in the composer on the left.</p>
                </div>
              </li>
              <li>
                <span className="guide-step-num">2</span>
                <div>
                  <strong>Click "Get AI Coaching"</strong>
                  <p>CareBot AI analyzes sentiment, urgency &amp; escalation risk instantly.</p>
                </div>
              </li>
              <li>
                <span className="guide-step-num">3</span>
                <div>
                  <strong>Apply coaching &amp; reply</strong>
                  <p>Use the coaching tip and knowledge suggestion to craft a perfect response, then click "Apply to Response".</p>
                </div>
              </li>
            </ol>
            <div className="coaching-guide-hint">
              <ArrowLeftRight size={11} />
              Results appear here after Step 2
            </div>
          </div>
        ) : (
          <>
            {/* ── Customer Signal Analysis ── */}
            <div className="intel-card">
              <div className="intel-card-header">
                <span className="intel-card-title">📡 Customer Signal Analysis</span>
                <CheckCircle2 size={12} style={{ color: 'var(--emerald)' }} />
              </div>
              <div className="intent-grid">
                <div className="intent-cell">
                  <div className="intent-cell-lbl">Sentiment</div>
                  <div className={`intent-cell-val ${sentimentTag}`}>
                    {capitalize(analysis?.sentiment || 'Neutral')}
                  </div>
                </div>
                <div className="intent-cell">
                  <div className="intent-cell-lbl">Urgency</div>
                  <div className={`intent-cell-val ${urgencyTag}`}>
                    {capitalize(analysis?.urgency || 'Low')}
                  </div>
                </div>
                <div className="intent-cell" style={{ gridColumn: '1 / -1' }}>
                  <div className="intent-cell-lbl">Escalation Risk</div>
                  <div className={`intent-cell-val ${riskTag}`}>
                    {capitalize(analysis?.escalation_risk || 'Low')}
                  </div>
                </div>
              </div>
              {cleanIssue && (
                <div className="issue-summary">
                  <strong>Identified Issue:</strong> {cleanIssue}
                </div>
              )}
            </div>

            {/* ── Coaching Recommendation ── */}
            <div className="advice-card advice-card--prominent">
              <div className="advice-title">
                <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                AI Coaching Recommendation
              </div>
              <div className="advice-text">{cleanTip}</div>
            </div>

            {/* ── Response Quality Scores ── */}
            <div className="intel-card">
              <div className="intel-card-header">
                <span className="intel-card-title">📊 Response Quality Scores</span>
              </div>
              <div className="meter-group">
                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Tone Alignment</span>
                    <span className="meter-score">{feedback?.tone_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div className="meter-bar-fill fill-tone" style={{ width: `${(feedback?.tone_score || 0) * 10}%` }}></div>
                  </div>
                </div>
                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Customer Empathy</span>
                    <span className="meter-score">{feedback?.empathy_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div className="meter-bar-fill fill-empathy" style={{ width: `${(feedback?.empathy_score || 0) * 10}%` }}></div>
                  </div>
                </div>
                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Clarity &amp; Directness</span>
                    <span className="meter-score">{feedback?.clarity_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div className="meter-bar-fill fill-clarity" style={{ width: `${(feedback?.clarity_score || 0) * 10}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Compliance Alert ── */}
            {compliance?.violation && (
              <div className="compliance-alert">
                <div className="compliance-alert-title">
                  <AlertTriangle size={12} /> Compliance Warning
                </div>
                <div>{compliance.issue}</div>
                <div className="compliance-fix">Fix: {compliance.suggestion}</div>
              </div>
            )}

            {/* ── Knowledge Base — big CTA ── */}
            {feedback?.knowledge_suggestion && (
              <div className="kb-snippet-card">
                <div className="kb-snippet-title">📚 Relevant Knowledge Base Match</div>
                <div className="kb-snippet-body">{feedback.knowledge_suggestion}</div>
                <button
                  type="button"
                  className="apply-snippet-btn apply-snippet-btn--big"
                  onClick={() => onApplySnippet(feedback.knowledge_suggestion)}
                >
                  <ClipboardPaste size={13} />
                  Apply to My Response
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Session Quality KPIs ── */}
        <div className="kpi-section">
          <div className="section-label" style={{ marginBottom: 8 }}>Session Quality Metrics</div>
          <div className="supervisor-strip">
            <div className="stat-pill">
              <div className="stat-pill-label">Avg Tone</div>
              <div className="stat-pill-num" id="avg-tone">
                {supervisorStats?.avg_tone ? `${supervisorStats.avg_tone}/10` : '—'}
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-label">Empathy</div>
              <div className="stat-pill-num" id="avg-empathy">
                {supervisorStats?.avg_empathy ? `${supervisorStats.avg_empathy}/10` : '—'}
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-label">Clarity</div>
              <div className="stat-pill-num" id="avg-clarity">
                {supervisorStats?.avg_clarity ? `${supervisorStats.avg_clarity}/10` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
