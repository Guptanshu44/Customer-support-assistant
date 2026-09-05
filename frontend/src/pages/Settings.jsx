import React, { useState } from 'react';
import { User, Bell, Zap, Webhook, Palette, Shield, Save, Check, ChevronRight } from 'lucide-react';

const SETTING_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai-engine', label: 'AI Engine', icon: Zap },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
];

const SETTINGS_STORAGE_KEY = 'carebot_user_settings_v1';

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function Toggle({ on, onChange }) {
  return (
    <button className={`toggle-btn ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="toggle-knob" />
    </button>
  );
}

function SaveBtn({ saved, onClick }) {
  return (
    <button className="btn-primary-sm" onClick={onClick}>
      {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Changes</>}
    </button>
  );
}

export default function Settings() {
  const [section, setSection] = useState('profile');
  const [saved, setSaved] = useState(false);

  const initial = getStoredSettings();

  // Profile state
  const [profile, setProfile] = useState(initial?.profile || {
    name: 'Alex Kim',
    email: 'alex.k@carebot.ai',
    role: 'Admin',
    company: 'CareBot AI',
    timezone: 'UTC+5:30 (IST)'
  });

  // Notifications state
  const [notifs, setNotifs] = useState(initial?.notifs || {
    newTicket: true, ticketAssigned: true, ticketResolved: false,
    csatAlert: true, burnoutAlert: true, weeklyReport: true,
    emailDigest: false, slackIntegration: false,
  });

  // AI engine
  const [engine, setEngine] = useState(initial?.engine || 'groq');

  // Webhook state
  const [webhooks, setWebhooks] = useState(initial?.webhooks || [
    { id: 1, url: 'https://hooks.example.com/carebot', event: 'ticket.created', active: true },
    { id: 2, url: 'https://slack.example.com/incoming', event: 'ticket.resolved', active: false },
  ]);

  // Branding
  const [branding, setBranding] = useState(initial?.branding || {
    primaryColor: '#6366f1',
    companyName: 'CareBot AI',
    logoText: 'CB'
  });

  const save = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        profile,
        notifs,
        engine,
        webhooks,
        branding,
      }));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your workspace, AI engine, and preferences.</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar nav */}
        <div className="settings-nav">
          {SETTING_SECTIONS.map(s => (
            <button
              key={s.id}
              className={`settings-nav-item ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <s.icon size={15} /> {s.label}
              <ChevronRight size={12} className="settings-nav-arrow" />
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="settings-content">
          {/* PROFILE */}
          {section === 'profile' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Profile Settings</h2>
              <div className="settings-avatar-row">
                <div className="settings-avatar">AK</div>
                <button className="btn-ghost-sm">Change Photo</button>
              </div>
              <div className="settings-fields">
                {[
                  { label: 'Full Name', key: 'name', type: 'text' },
                  { label: 'Email Address', key: 'email', type: 'email' },
                  { label: 'Role', key: 'role', type: 'text' },
                  { label: 'Company', key: 'company', type: 'text' },
                  { label: 'Timezone', key: 'timezone', type: 'text' },
                ].map(f => (
                  <div key={f.key} className="settings-field">
                    <label className="auth-label">{f.label}</label>
                    <input
                      className="auth-input"
                      type={f.type}
                      value={profile[f.key]}
                      onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <SaveBtn saved={saved} onClick={save} />
            </div>
          )}

          {/* NOTIFICATIONS */}
          {section === 'notifications' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Notification Preferences</h2>
              <div className="settings-toggles">
                {[
                  { key: 'newTicket', label: 'New ticket created', desc: 'Notify when a new ticket enters the queue' },
                  { key: 'ticketAssigned', label: 'Ticket assigned to me', desc: 'Notify when a ticket is assigned to you' },
                  { key: 'ticketResolved', label: 'Ticket resolved', desc: 'Notify when your tickets are resolved' },
                  { key: 'csatAlert', label: 'Low CSAT alert', desc: 'Alert when CSAT drops below threshold' },
                  { key: 'burnoutAlert', label: 'Burnout risk detected', desc: 'Alert when agent burnout risk is high' },
                  { key: 'weeklyReport', label: 'Weekly performance report', desc: 'Receive weekly digest every Monday' },
                  { key: 'emailDigest', label: 'Email digest', desc: 'Daily email summary of key metrics' },
                  { key: 'slackIntegration', label: 'Slack notifications', desc: 'Send alerts to connected Slack workspace' },
                ].map(n => (
                  <div key={n.key} className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-label">{n.label}</div>
                      <div className="toggle-desc">{n.desc}</div>
                    </div>
                    <Toggle on={notifs[n.key]} onChange={v => setNotifs(ns => ({ ...ns, [n.key]: v }))} />
                  </div>
                ))}
              </div>
              <SaveBtn saved={saved} onClick={save} />
            </div>
          )}

          {/* AI ENGINE */}
          {section === 'ai-engine' && (
            <div className="settings-section">
              <h2 className="settings-section-title">AI Engine Configuration</h2>
              <p className="settings-section-desc">Select the AI model powering your coaching suggestions.</p>
              <div className="engine-options">
                {[
                  { id: 'groq', name: 'Groq Engine', model: 'Llama-3.3-70B', desc: 'Ultra-fast inference. Best for real-time coaching with <200ms latency.', badge: 'Recommended', color: '#6366f1' },
                  { id: 'claude', name: 'Claude Engine', model: 'Claude Sonnet 4', desc: 'Exceptional reasoning and empathy. Best for complex, nuanced support scenarios.', badge: 'Premium', color: '#8b5cf6' },
                  { id: 'hf', name: 'HuggingFace Offline', model: 'Local Model', desc: 'Runs fully offline. No API key required. Best for air-gapped environments.', badge: 'Offline', color: '#64748b' },
                ].map(e => (
                  <div
                    key={e.id}
                    className={`engine-option ${engine === e.id ? 'active' : ''}`}
                    onClick={() => setEngine(e.id)}
                    style={{ '--ec': e.color }}
                  >
                    <div className="engine-option-header">
                      <div className="engine-radio" style={{ borderColor: engine === e.id ? e.color : undefined }}>
                        {engine === e.id && <div className="engine-radio-dot" style={{ background: e.color }} />}
                      </div>
                      <div className="engine-name">{e.name}</div>
                      <span className="engine-badge" style={{ background: `${e.color}20`, color: e.color }}>{e.badge}</span>
                    </div>
                    <div className="engine-model">{e.model}</div>
                    <div className="engine-desc">{e.desc}</div>
                  </div>
                ))}
              </div>
              <SaveBtn saved={saved} onClick={save} />
            </div>
          )}

          {/* WEBHOOKS */}
          {section === 'webhooks' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Webhook Configuration</h2>
              <p className="settings-section-desc">Send events to external services when things happen in CareBot AI.</p>
              <div className="webhooks-list">
                {webhooks.map(w => (
                  <div key={w.id} className="webhook-item">
                    <div className="webhook-url">{w.url}</div>
                    <div className="webhook-event-badge">{w.event}</div>
                    <Toggle on={w.active} onChange={v => setWebhooks(ws => ws.map(wh => wh.id === w.id ? { ...wh, active: v } : wh))} />
                  </div>
                ))}
              </div>
              <button className="btn-ghost-sm" style={{ marginTop: 12 }}>+ Add Webhook</button>
            </div>
          )}

          {/* BRANDING */}
          {section === 'branding' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Brand Settings</h2>
              <div className="settings-fields">
                <div className="settings-field">
                  <label className="auth-label">Company Name</label>
                  <input className="auth-input" type="text" value={branding.companyName} onChange={e => setBranding(b => ({ ...b, companyName: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label className="auth-label">Logo Text (2 chars)</label>
                  <input className="auth-input" type="text" maxLength={2} value={branding.logoText} onChange={e => setBranding(b => ({ ...b, logoText: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label className="auth-label">Primary Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input className="auth-input" type="text" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} />
                    <input type="color" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                  </div>
                </div>
              </div>
              <SaveBtn saved={saved} onClick={save} />
            </div>
          )}

          {/* SECURITY */}
          {section === 'security' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Security Settings</h2>
              <div className="settings-toggles">
                {[
                  { key: 'mfa', label: 'Two-Factor Authentication', desc: 'Require 2FA for all team members' },
                  { key: 'sso', label: 'SSO / SAML', desc: 'Enable single sign-on with your identity provider' },
                  { key: 'audit', label: 'Audit Logs', desc: 'Record all admin actions and data access' },
                  { key: 'ip', label: 'IP Allowlist', desc: 'Restrict access to specific IP ranges' },
                ].map((n, i) => (
                  <div key={n.key} className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-label">{n.label}</div>
                      <div className="toggle-desc">{n.desc}</div>
                    </div>
                    <Toggle on={i < 2} onChange={() => {}} />
                  </div>
                ))}
              </div>
              <div className="settings-field" style={{ marginTop: 16 }}>
                <label className="auth-label">Current Password</label>
                <input className="auth-input" type="password" placeholder="••••••••" />
              </div>
              <div className="settings-field">
                <label className="auth-label">New Password</label>
                <input className="auth-input" type="password" placeholder="At least 8 characters" />
              </div>
              <SaveBtn saved={saved} onClick={save} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
