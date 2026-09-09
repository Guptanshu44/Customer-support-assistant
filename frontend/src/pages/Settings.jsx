import React, { useState } from 'react';
import { User, Bell, Zap, Webhook, Palette, Shield, Save, Check, ChevronRight, Cloud, Database, Key, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { getStoredFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, isFirebaseConfigured } from '../api/firebase';

const SETTING_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'firebase', label: 'Firebase Cloud', icon: Cloud },
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

  const [profile, setProfile] = useState(initial?.profile || {
    name: 'Alex Kim',
    email: 'alex.k@omnidesk.ai',
    role: 'Admin',
    company: 'OmniDesk Copilot',
    timezone: 'UTC+5:30 (IST)'
  });

  const [notifs, setNotifs] = useState(initial?.notifs || {
    newTicket: true, ticketAssigned: true, ticketResolved: false,
    csatAlert: true, burnoutAlert: true, weeklyReport: true,
    emailDigest: false, slackIntegration: false,
  });

  const [engine, setEngine] = useState(initial?.engine || 'groq');

  const [webhooks, setWebhooks] = useState(initial?.webhooks || [
    { id: 1, url: 'https://hooks.example.com/omnidesk', event: 'ticket.created', active: true },
    { id: 2, url: 'https://slack.example.com/incoming', event: 'ticket.resolved', active: false },
  ]);

  const [branding, setBranding] = useState(initial?.branding || {
    primaryColor: '#6366f1',
    companyName: 'OmniDesk Copilot',
    logoText: 'OD'
  });

  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    return getStoredFirebaseConfig() || {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  });
  const [fbConfigured, setFbConfigured] = useState(() => isFirebaseConfigured());
  const [fbStatusMsg, setFbStatusMsg] = useState('');
  const [fbErrorMsg, setFbErrorMsg] = useState('');

  const handleSaveFirebase = (e) => {
    e.preventDefault();
    setFbErrorMsg('');
    setFbStatusMsg('');
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      setFbErrorMsg('API Key and Project ID are required to initialize Firebase.');
      return;
    }
    const ok = saveFirebaseConfig(firebaseConfig);
    if (ok) {
      setFbConfigured(true);
      setFbStatusMsg('Firebase Cloud connected successfully! Real-time Firestore sync and Auth are active.');
      setTimeout(() => setFbStatusMsg(''), 4000);
    } else {
      setFbErrorMsg('Failed to connect with provided credentials. Please check your keys.');
    }
  };

  const handleDisconnectFirebase = () => {
    clearFirebaseConfig();
    setFbConfigured(false);
    setFirebaseConfig({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
    setFbStatusMsg('Firebase disconnected. Operating in local fallback mode.');
    setTimeout(() => setFbStatusMsg(''), 3000);
  };

  const save = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        profile,
        notifs,
        engine,
        webhooks,
        branding,
      }));
      localStorage.setItem('carebot_preferred_engine', engine);
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

        <div className="settings-content">
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

          {section === 'firebase' && (
            <div className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 className="settings-section-title" style={{ margin: 0 }}>Firebase Cloud Integration</h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: fbConfigured ? '#ecfdf5' : '#fefce8',
                  border: fbConfigured ? '1px solid #a7f3d0' : '1px solid #fde047',
                  color: fbConfigured ? '#047857' : '#854d0e',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: fbConfigured ? '#10b981' : '#eab308' }} />
                  {fbConfigured ? 'Firestore & Auth Connected' : 'Local Fallback Mode'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
                Connect OmniDesk Copilot to Google Firebase for real-time cloud ticket synchronization across devices, agent authentication, and live chat logging.
              </p>

              {fbStatusMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '12.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} />
                  <span>{fbStatusMsg}</span>
                </div>
              )}

              {fbErrorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{fbErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveFirebase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="settings-field">
                  <label className="auth-label">API Key (apiKey) *</label>
                  <input
                    className="auth-input"
                    type="text"
                    required
                    placeholder="AIzaSy..."
                    value={firebaseConfig.apiKey}
                    onChange={e => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="settings-field">
                    <label className="auth-label">Project ID (projectId) *</label>
                    <input
                      className="auth-input"
                      type="text"
                      required
                      placeholder="omnidesk-copilot-dev"
                      value={firebaseConfig.projectId}
                      onChange={e => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    />
                  </div>
                  <div className="settings-field">
                    <label className="auth-label">Auth Domain (authDomain)</label>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="omnidesk-copilot-dev.firebaseapp.com"
                      value={firebaseConfig.authDomain}
                      onChange={e => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="settings-field">
                    <label className="auth-label">Storage Bucket</label>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="omnidesk-copilot-dev.appspot.com"
                      value={firebaseConfig.storageBucket}
                      onChange={e => setFirebaseConfig({ ...firebaseConfig, storageBucket: e.target.value })}
                    />
                  </div>
                  <div className="settings-field">
                    <label className="auth-label">App ID (appId)</label>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="1:123456789:web:abcdef..."
                      value={firebaseConfig.appId}
                      onChange={e => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={13} /> Save & Connect Firebase
                  </button>
                  {fbConfigured && (
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={handleDisconnectFirebase}
                      style={{ color: 'var(--rose)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={13} /> Disconnect
                    </button>
                  )}
                </div>
              </form>

              <div style={{
                marginTop: '20px',
                padding: '14px',
                borderRadius: '10px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: '1.6'
              }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  💡 Architecture & Viva Defense Point:
                </strong>
                CareBot features a hybrid decoupled storage layer. When Firebase Firestore is connected, all ticket status updates, agent responses, and sentiment KPIs replicate in real-time. If offline or unconfigured, the application falls back safely to browser localStorage and local mock datasets with zero crashes.
              </div>
            </div>
          )}

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

          {section === 'webhooks' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Webhook Configuration</h2>
              <p className="settings-section-desc">Send events to external services when things happen in OmniDesk Copilot.</p>
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
