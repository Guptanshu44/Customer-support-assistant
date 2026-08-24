import React from 'react';
import { Trash2, Plus, RotateCcw } from 'lucide-react';

export default function TopNav({
  activeSession,
  onNewSession,
  onResetSession,
  onDeleteSession,
}) {
  return (
    <nav className="top-nav">
      <div className="nav-left">
        <a href="#" className="brand-mark" onClick={(e) => e.preventDefault()}>
          <div className="brand-icon">CB</div>
          <span className="brand-name">CareBot</span>
        </a>
        <div className="ticket-breadcrumb">
          <span>Ticket</span>
          <span className="ticket-id" id="top-ticket-id">
            {activeSession ? `#${activeSession.id}` : '#---'}
          </span>
          <span id="top-ticket-title">
            {activeSession?.title || 'Workspace Ready — Start a Session'}
          </span>
          {activeSession && <span className="priority-pill">Priority High</span>}
        </div>
      </div>

      <div className="nav-right">
        <button
          className="action-btn btn-new-ticket"
          onClick={onNewSession}
          title="Start a new ticket"
        >
          <Plus size={13} />
          <span>New Session</span>
        </button>
        <button
          className="action-btn"
          onClick={onResetSession}
          title="Reset conversation transcript"
          disabled={!activeSession}
        >
          <RotateCcw size={12} />
          <span>Clear Chat</span>
        </button>
        <button
          className="action-btn btn-danger-action"
          onClick={onDeleteSession}
          title="Delete current session"
          disabled={!activeSession}
        >
          <Trash2 size={12} />
          <span>Delete Session</span>
        </button>
      </div>
    </nav>
  );
}
