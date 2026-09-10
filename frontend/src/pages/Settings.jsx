import React, { useState, useEffect } from 'react';
import { 
  User, Bell, Zap, Save, Check, ChevronRight, 
  CheckCircle, AlertCircle, Cpu, ShieldCheck, Database, Volume2
} from 'lucide-react';
import { 
  setLocalDemoUser, 
  saveUserToFirestore, 
  onAuthChange 
} from '../api/firebase';

const SETTING_SECTIONS = [
  { id: 'profile', label: 'Agent Profile', icon: User, desc: 'Specialist identity & role' },
  { id: 'ai-engine', label: 'AI Engine & RAG', icon: Zap, desc: 'Groq LPU & FAISS vector search' },
  { id: 'notifications', label: 'In-Flight Alerts', icon: Bell, desc: 'Escalations, CSAT & burnout guard' },
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

function SaveBtn({ saved, onClick, label = 'Save Changes' }) {
  return (
    <button className="btn-primary-sm" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {saved ? <><Check size={14} /> Saved Successfully</> : <><Save size={14} /> {label}</>}
    </button>
  );
}

export default function Settings() {
  const [section, setSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  const initial = getStoredSettings();

  const [profile, setProfile] = useState(() => {
    let localUser = null;
    try {
      const raw = localStorage.getItem('carebot_local_user');
      if (raw) localUser = JSON.parse(raw);
    } catch {}

    return {
      name: localUser?.displayName || initial?.profile?.name || 'Support Specialist',
      email: localUser?.email || initial?.profile?.email || 'agent@omnidesk.ai',
      role: localUser?.role || initial?.profile?.role || 'Tier-1 Specialist',
      department: initial?.profile?.department || 'Customer Experience & AI Operations',
      timezone: initial?.profile?.timezone || 'UTC+5:30 (IST)'
    };
  });

  // Keep profile synchronized with live auth listener
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (user) {
        setProfile(p => ({
          ...p,
          name: user.displayName || p.name,
          email: user.email || p.email,
          role: user.role || p.role
        }));
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const [notifs, setNotifs] = useState(initial?.notifs || {
    escalationAlert: true,
    liveCoaching: true,
    burnoutAlert: true,
    csatAlert: true,
    queueChime: true,
    resolvedAck: false
  });

  const [engine, setEngine] = useState(initial?.engine || 'groq');
  const [engineSettings, setEngineSettings] = useState(initial?.engineSettings || {
    minEmpathyScore: 8,
    autoAttachKB: true,
    turboMode: true
  });

  const initials = (profile.name || 'AG')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    try {
      // 1. Save to settings storage
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        profile,
        notifs,
        engine,
        engineSettings
      }));

      // 2. Update active agent identity across app (AppShell sidebar, topbar, tickets)
      setLocalDemoUser(profile.name, profile.role, profile.email);

      // 3. Sync to Firestore if configured
      saveUserToFirestore({
        uid: 'user-' + profile.email.replace(/[^a-zA-Z0-9]/g, '_'),
        displayName: profile.name,
        email: profile.email,
        role: profile.role,
        department: profile.department
      });

      // 4. Notify app
      window.dispatchEvent(new Event('storage'));
      setSaved(true);
      setProfileSuccessMsg('Profile updated! Agent identity updated in navigation, sidebar, and transcripts.');
      setTimeout(() => {
        setSaved(false);
        setProfileSuccessMsg('');
      }, 3500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleSaveGeneral = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        profile,
        notifs,
        engine,
        engineSettings
      }));
      localStorage.setItem('carebot_preferred_engine', engine);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your support specialist profile, AI coaching, and notification preferences.</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Left Sub-Navigation */}
        <div className="settings-nav">
          {SETTING_SECTIONS.map(s => (
            <button
              key={s.id}
              className={`settings-nav-item ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <s.icon size={15} /> 
              <span>{s.label}</span>
              <ChevronRight size={12} className="settings-nav-arrow" />
            </button>
          ))}
        </div>

        {/* Right Settings Content */}
        <div className="settings-content">
          {/* TAB 1: PROFILE SETTINGS */}
          {section === 'profile' && (
            <div className="settings-section">
              <div>
                <h2 className="settings-section-title">Support Specialist Profile</h2>
                <p className="settings-section-desc">Manage your support agent identity, role credentials, and operational preferences.</p>
              </div>

              {profileSuccessMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <div className="settings-avatar-row">
                <div className="settings-avatar">{initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{profile.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile.role} · Active in Live Queue</div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="settings-fields">
                <div className="settings-field">
                  <label className="auth-label">Full Name</label>
                  <input
                    className="auth-input"
                    type="text"
                    required
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="settings-field">
                  <label className="auth-label">Email Address</label>
                  <input
                    className="auth-input"
                    type="email"
                    required
                    value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="settings-field">
                  <label className="auth-label">Specialist Role</label>
                  <select
                    className="auth-input select-role"
                    value={profile.role}
                    onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Senior Tier-2 Specialist">Senior Tier-2 Specialist</option>
                    <option value="Tier-1 Support Specialist">Tier-1 Support Specialist</option>
                    <option value="AI Operations Lead">AI Operations Lead</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="auth-label">Department / Unit</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={profile.department}
                    onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                  />
                </div>

                <div className="settings-field">
                  <label className="auth-label">Timezone & Working Hours</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={profile.timezone}
                    onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <SaveBtn saved={saved} onClick={handleSaveProfile} label="Save Profile Changes" />
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: AI ENGINE & RAG */}
          {section === 'ai-engine' && (
            <div className="settings-section">
              <div>
                <h2 className="settings-section-title">AI Engine & Semantic Grounding (RAG)</h2>
                <p className="settings-section-desc">Select and configure the in-flight inference pipeline powering live coaching suggestions.</p>
              </div>

              <div className="engine-options">
                {[
                  { 
                    id: 'groq', 
                    name: 'Groq LPU In-Flight Acceleration', 
                    model: 'Llama-3.3-70B-Versatile', 
                    desc: 'Deterministic ultra-fast LPU inference delivering sub-0.4s response coaching, sentiment classification, and empathetic reply synthesis.', 
                    badge: 'Active & Recommended', 
                    color: '#2563eb' 
                  },
                  { 
                    id: 'faiss', 
                    name: 'Dense Vector RAG (FAISS Index)', 
                    model: 'all-MiniLM-L6-v2 (384-d)', 
                    desc: 'Sub-10ms semantic cosine similarity matching against customer support policies, SLA guidelines, and troubleshooting articles.', 
                    badge: 'Integrated', 
                    color: '#059669' 
                  },
                  { 
                    id: 'offline', 
                    name: 'Deterministic Heuristic Fallback', 
                    model: 'Local Sentiment & Brevity Heuristics', 
                    desc: 'Runs completely in-browser without external API calls. Evaluates customer emotional polarity, brevity drop, and escalation triggers.', 
                    badge: 'Resilient Offline', 
                    color: '#64748b' 
                  },
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

              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
                  In-Flight Telemetry Parameters
                </h3>
                <div className="settings-toggles">
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-label">Auto-Ground Replies with FAISS Knowledge Base</div>
                      <div className="toggle-desc">Automatically embed relevant policy excerpts into suggested replies</div>
                    </div>
                    <Toggle 
                      on={engineSettings.autoAttachKB} 
                      onChange={v => setEngineSettings(s => ({ ...s, autoAttachKB: v }))} 
                    />
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-label">Sub-0.4s Turbo Inference</div>
                      <div className="toggle-desc">Prioritizes Groq LPU hardware speed over lengthy reasoning chains</div>
                    </div>
                    <Toggle 
                      on={engineSettings.turboMode} 
                      onChange={v => setEngineSettings(s => ({ ...s, turboMode: v }))} 
                    />
                  </div>
                </div>
              </div>

              <SaveBtn saved={saved} onClick={handleSaveGeneral} label="Save AI Configuration" />
            </div>
          )}

          {/* TAB 4: IN-FLIGHT ALERTS */}
          {section === 'notifications' && (
            <div className="settings-section">
              <div>
                <h2 className="settings-section-title">In-Flight Alerts & Queue Audio</h2>
                <p className="settings-section-desc">Manage real-time supervisor notifications, audio cues, and fatigue monitoring alerts.</p>
              </div>

              <div className="settings-toggles">
                {[
                  { 
                    key: 'escalationAlert', 
                    label: '🚨 High Escalation & Churn Risk Warning', 
                    desc: 'Immediately trigger visual and badge warnings when customer message sentiment is severely negative or angry' 
                  },
                  { 
                    key: 'liveCoaching', 
                    label: '⚡ Sub-0.4s Live Coaching Suggestions', 
                    desc: 'Display instant empathy, clarity, and tone recommendations while drafting ticket replies' 
                  },
                  { 
                    key: 'burnoutAlert', 
                    label: '🧠 Agent Burnout & Fatigue Guard', 
                    desc: 'Alert agent and supervisor when vocabulary diversity drops significantly, indicating cognitive fatigue' 
                  },
                  { 
                    key: 'csatAlert', 
                    label: '⭐ Low CSAT Dip Warning (< 80%)', 
                    desc: 'Highlight interactions where predicted customer satisfaction drops below the quality threshold' 
                  },
                  { 
                    key: 'queueChime', 
                    label: '🔊 Inbound Ticket Audio Chime', 
                    desc: 'Play a subtle notification sound when high-urgency tickets enter the live support queue' 
                  },
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

              <SaveBtn saved={saved} onClick={handleSaveGeneral} label="Save Alert Preferences" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
