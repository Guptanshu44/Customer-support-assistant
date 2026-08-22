import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

export default function CopilotSidebar({
  copilotFeedback,
  latency,
  supervisorStats,
  onApplySnippet,
}) {
  const analysis = copilotFeedback?.analysis || null;
  const feedback = copilotFeedback?.feedback || null;
  const compliance = copilotFeedback?.compliance || null;

  const cleanIssue = (analysis?.key_issue || '')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '')
    .trim();

  const cleanTip = (feedback?.coaching_tip || 'Response is well structured.')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s🔑🎯💡📌]+/gu, '')
    .trim();

  const sentimentTag = 'tag-' + (analysis?.sentiment || 'neutral').toLowerCase();
  const urgencyTag = 'tag-' + (analysis?.urgency || 'low').toLowerCase();
  const riskTag = 'tag-' + (analysis?.escalation_risk || 'low').toLowerCase();

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

  return (
    <aside className="copilot-sidebar">
      <div className="copilot-header">
        <div className="copilot-title">
          <Zap size={14} style={{ color: '#60a5fa' }} />
          <span>Real-Time Coaching Copilot</span>
        </div>
        <span className="latency-pill" id="latency-indicator">
          {latency || 'Ready'}
        </span>
      </div>

      <div className="copilot-content" id="copilot-content">
        {!copilotFeedback ? (
          <div className="empty-state-box" id="empty-coaching-box">
            Send a conversation turn to generate live sentiment analysis, coaching guidance, and FAQ suggestions.
          </div>
        ) : (
          <>
            {/* Customer Signal Analysis */}
            <div className="intel-card">
              <div className="intel-card-header">
                <span className="intel-card-title">Customer Signal Analysis</span>
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

            {/* Response Quality Scores */}
            <div className="intel-card">
              <div className="intel-card-header">
                <span className="intel-card-title">Response Quality Scores</span>
              </div>
              <div className="meter-group">
                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Tone Alignment</span>
                    <span className="meter-score">{feedback?.tone_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div
                      className="meter-bar-fill fill-tone"
                      style={{ width: `${(feedback?.tone_score || 0) * 10}%` }}
                    ></div>
                  </div>
                </div>

                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Customer Empathy</span>
                    <span className="meter-score">{feedback?.empathy_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div
                      className="meter-bar-fill fill-empathy"
                      style={{ width: `${(feedback?.empathy_score || 0) * 10}%` }}
                    ></div>
                  </div>
                </div>

                <div className="meter-item">
                  <div className="meter-label-row">
                    <span className="meter-name">Clarity &amp; Directness</span>
                    <span className="meter-score">{feedback?.clarity_score || 0}/10</span>
                  </div>
                  <div className="meter-bar-track">
                    <div
                      className="meter-bar-fill fill-clarity"
                      style={{ width: `${(feedback?.clarity_score || 0) * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advice Box */}
            <div className="advice-card">
              <div className="advice-title">Coaching Recommendation</div>
              <div className="advice-text">{cleanTip}</div>
            </div>

            {/* Compliance Alert */}
            {compliance?.violation && (
              <div
                style={{
                  background: 'var(--rose-subtle)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#fca5a5',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '10.5px',
                    color: 'var(--rose)',
                    marginBottom: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={12} />
                  Compliance Warning
                </div>
                <div>{compliance.issue}</div>
                <div style={{ marginTop: '4px', color: '#fecdd3' }}>
                  Fix: {compliance.suggestion}
                </div>
              </div>
            )}

            {/* Knowledge Base Snippet */}
            {feedback?.knowledge_suggestion && (
              <div className="kb-snippet-card" style={{ display: 'block' }}>
                <div className="kb-snippet-title">Relevant Knowledge Base Match</div>
                <div className="kb-snippet-body">{feedback.knowledge_suggestion}</div>
                <button
                  type="button"
                  className="apply-snippet-btn"
                  onClick={() => onApplySnippet(feedback.knowledge_suggestion)}
                >
                  Apply to Response
                </button>
              </div>
            )}
          </>
        )}

        {/* Supervisor KPI Strip inside scrollable content with clear bottom spacing */}
        <div
          style={{
            padding: '10px 12px',
            marginTop: '8px',
            marginBottom: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div className="section-label" style={{ marginBottom: 6 }}>
            Session Quality Metrics
          </div>
          <div className="supervisor-strip">
            <div className="stat-pill">
              <div className="stat-pill-label">Avg Tone</div>
              <div className="stat-pill-num" id="avg-tone">
                {supervisorStats?.avg_tone ? `${supervisorStats.avg_tone}/10` : '8.8/10'}
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-label">Empathy</div>
              <div className="stat-pill-num" id="avg-empathy">
                {supervisorStats?.avg_empathy ? `${supervisorStats.avg_empathy}/10` : '8.5/10'}
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-label">Clarity</div>
              <div className="stat-pill-num" id="avg-clarity">
                {supervisorStats?.avg_clarity ? `${supervisorStats.avg_clarity}/10` : '9.0/10'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
