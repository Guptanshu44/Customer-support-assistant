import React, { useState } from 'react';

export default function CustomUserModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('Rachel Green');
  const [email, setEmail] = useState('rachel@ralphlauren.com');
  const [plan, setPlan] = useState('Enterprise Tier');
  const [initialMessage, setInitialMessage] = useState(
    'Hi team, could you please provide a breakdown of the recent invoice charges?'
  );

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide at least a customer name.');
      return;
    }
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      plan: plan.trim(),
      initial_message: initialMessage.trim(),
      title: `${name.trim()} — Support Session`,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Create Custom Customer Session</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="modal-field">
            <label>Customer Name</label>
            <input
              type="text"
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rachel Green"
              required
              autoFocus
            />
          </div>

          <div className="modal-field">
            <label>Customer Email</label>
            <input
              type="email"
              className="modal-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rachel@ralphlauren.com"
            />
          </div>

          <div className="modal-field">
            <label>Subscription Plan</label>
            <input
              type="text"
              className="modal-input"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="e.g. Enterprise Tier"
            />
          </div>

          <div className="modal-field">
            <label>Initial Inbound Query / Issue</label>
            <textarea
              className="modal-input"
              rows="2"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="e.g. I need an invoice for our accounting team..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="action-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="action-btn btn-new-ticket">
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
