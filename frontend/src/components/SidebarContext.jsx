import React from 'react';
import { X, Plus, UserPlus } from 'lucide-react';

export default function SidebarContext({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onOpenCustomModal,
  onDeleteSessionById,
  activeCustomer,
}) {
  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="sidebar-context">
      <div className="sidebar-top-action">
        <button
          className="btn-new-session-main"
          onClick={onNewSession}
          title="Create next sample ticket"
        >
          <Plus size={14} />
          <span>New Session</span>
        </button>
        <button
          className="btn-custom-user"
          onClick={onOpenCustomModal}
          title="Create custom customer ticket"
        >
          <UserPlus size={13} style={{ display: 'inline', marginRight: 4 }} />
          Custom
        </button>
      </div>

      <div className="sidebar-scrollable">
        {/* Sessions List */}
        <div>
          <div className="section-label">
            <span>Active &amp; Recent Sessions</span>
            <span
              id="sessions-count"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}
            >
              {sessions.length}
            </span>
          </div>

          <div className="history-list" id="history-list">
            {sessions.length === 0 ? (
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-subtle)',
                  textAlign: 'center',
                  padding: '12px 0',
                }}
              >
                No active sessions. Click + New Session to start.
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === currentSessionId;
                const sentiment = (s.last_sentiment || 'neutral').toLowerCase();
                const pillClass =
                  sentiment === 'positive'
                    ? 'pill-positive'
                    : sentiment === 'negative'
                    ? 'pill-negative'
                    : 'pill-neutral';

                return (
                  <div
                    key={s.id}
                    className={`history-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectSession(s.id)}
                  >
                    <div className="history-item-header">
                      <span className="history-ticket-code">#{s.id}</span>
                      <div className="history-right-meta">
                        <span className={`history-pill ${pillClass}`}>
                          {sentiment.toUpperCase()}
                        </span>
                        <button
                          className="btn-delete-session-card"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSessionById(s.id);
                          }}
                          title="Delete this session"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="history-customer-name">
                      {s.customer_name || 'Customer'}
                    </div>
                    <div className="history-meta-sub">
                      <span>
                        {s.turns_count} turn{s.turns_count === 1 ? '' : 's'}
                      </span>
                      <span>{s.updated_at || 'Just now'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Customer Context */}
        <div>
          <div className="section-label">Active Customer Context</div>
          {activeCustomer ? (
            <div className="profile-card" id="profile-card">
              <div className="user-info-row">
                <div className="avatar" id="cust-avatar">
                  {getInitials(activeCustomer.name)}
                </div>
                <div>
                  <div className="user-meta-name" id="cust-name">
                    {activeCustomer.name}
                  </div>
                  <div className="user-meta-email" id="cust-email">
                    {activeCustomer.email}
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Subscription</span>
                <span className="detail-val" id="cust-plan" style={{ color: '#60a5fa' }}>
                  {activeCustomer.plan}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Account Value</span>
                <span className="detail-val" id="cust-value">
                  {activeCustomer.value || '$1,200 / yr'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-val" style={{ color: 'var(--emerald)' }}>
                  Active
                </span>
              </div>
            </div>
          ) : (
            <div
              className="profile-card"
              style={{
                textAlign: 'center',
                color: 'var(--text-subtle)',
                fontSize: '12px',
                padding: '18px',
              }}
            >
              No active customer selected.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
