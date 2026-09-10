import React, { useState, useEffect } from 'react';
import { 
  X, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Cloud, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  Lock,
  ExternalLink,
  Database
} from 'lucide-react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  signupWithEmail, 
  logoutUser, 
  isFirebaseConfigured,
  setLocalDemoUser
} from '../api/firebase';

export default function AuthModal({ isOpen, onClose, currentUser, onUserChange }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (onUserChange) onUserChange(user);
      setSuccess(`Signed in as ${user.displayName || user.email || 'Support Agent'}!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setError({
          type: 'unauthorized-domain',
          domain: host,
          projectId: 'omnidesk-e5899'
        });
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing login.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(err?.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (activeTab === 'login') {
        await loginWithEmail(loginEmail, loginPassword);
        setSuccess('Welcome back! Signed in successfully.');
      } else {
        await signupWithEmail(signupEmail, signupPassword, signupDisplayName);
        setSuccess('Account created! Signed in successfully.');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      const rawMsg = err?.message || '';
      if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
        setError('This email is already registered. Please click "Agent Sign In" above.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || rawMsg.includes('invalid-credential') || rawMsg.includes('wrong-password') || rawMsg.includes('Super Administrator') || rawMsg.includes('Incorrect password')) {
        setError(rawMsg.includes('Super Administrator') ? rawMsg : 'Incorrect email or password. Please verify your credentials.');
      } else if (code === 'auth/user-not-found' || rawMsg.includes('user-not-found')) {
        setError('No account found with this email. Please click "Create Account" above.');
      } else if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
        setError('Password too weak. Please use at least 6 characters.');
      } else {
        setError(rawMsg || 'Authentication error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-card auth-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cloud size={20} color="#93c5fd" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                Firebase Cloud & Auth
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#bfdbfe' }}>
                Real-time sync, Ticket Firestore & Agent Login
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)'
        }}>
          <button
            onClick={() => { setActiveTab('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'login' ? '#ffffff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'login' ? '2px solid #2563eb' : 'none',
              fontWeight: activeTab === 'login' ? 700 : 500,
              color: activeTab === 'login' ? '#1d4ed8' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Agent Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(null); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'signup' ? '#ffffff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signup' ? '2px solid #2563eb' : 'none',
              fontWeight: activeTab === 'signup' ? 700 : 500,
              color: activeTab === 'signup' ? '#1d4ed8' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px', maxHeight: '520px', overflowY: 'auto' }}>
          {/* Status Banners */}
          {error && typeof error === 'string' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {error && typeof error === 'object' && error.type === 'unauthorized-domain' && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 700, fontSize: '13px' }}>
                <AlertCircle size={17} style={{ color: '#d97706', flexShrink: 0 }} />
                <span>Domain Not Authorized in Firebase Console</span>
              </div>
              
              <p style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.5, margin: 0 }}>
                Google Sign-In is blocked because your deployed Streamlit domain is not whitelisted in your Firebase project. To enable real Google accounts, add this domain in Firebase Console.
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                color: '#1e293b',
                gap: '8px'
              }}>
                <span style={{ wordBreak: 'break-all' }}>{error.domain}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(error.domain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    color: '#92400e',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '3px 8px',
                    flexShrink: 0
                  }}
                >
                  {copiedDomain ? '✓ Copied!' : 'Copy Domain'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                <a
                  href={error.projectId ? `https://console.firebase.google.com/project/${error.projectId}/authentication/settings` : 'https://console.firebase.google.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#d97706',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <span>Open Firebase Settings ↗</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const mock = setLocalDemoUser('Google Agent', 'Tier-1 Specialist', 'agent.google@omnidesk.ai');
                    if (onUserChange) onUserChange(mock);
                    setSuccess('Signed in under Instant Google Agent Fallback.');
                    setTimeout(() => onClose(), 600);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Instant Google Agent Fallback →</span>
                </button>
              </div>
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Current User Card if Logged In */}
          {currentUser && (
            <div style={{
              padding: '14px 16px',
              background: '#eff6ff',
              borderRadius: '10px',
              border: '1px solid #bfdbfe',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '13.5px' }}>
                    {currentUser.displayName || 'Support Agent'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#3b82f6' }}>
                    {currentUser.email || 'offline-agent'} · {currentUser.role || 'Tier-1 Specialist'}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logoutUser();
                  if (onUserChange) onUserChange(null);
                  setSuccess('Logged out successfully');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}

          {/* TAB 1 & 2: LOGIN / SIGN UP */}
          {(activeTab === 'login' || activeTab === 'signup') && (
            <div>
              {/* Google One-Click Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '16px 0',
                color: 'var(--text-subtle)',
                fontSize: '12px'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                <span style={{ padding: '0 10px' }}>or email sign in</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeTab === 'signup' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={signupDisplayName}
                        onChange={(e) => setSignupDisplayName(e.target.value)}
                        autoComplete="name"
                        style={{
                          width: '100%',
                          padding: '9px 12px 9px 34px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '13px',
                          outline: 'none',
                          background: 'var(--bg-input)'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={activeTab === 'signup' ? signupEmail : loginEmail}
                      onChange={(e) => activeTab === 'signup' ? setSignupEmail(e.target.value) : setLoginEmail(e.target.value)}
                      autoComplete={activeTab === 'signup' ? 'off' : 'email'}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '13px',
                        outline: 'none',
                        background: 'var(--bg-input)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <input
                      type="password"
                      required
                      placeholder="Enter your password (min. 6 characters)"
                      value={activeTab === 'signup' ? signupPassword : loginPassword}
                      onChange={(e) => activeTab === 'signup' ? setSignupPassword(e.target.value) : setLoginPassword(e.target.value)}
                      autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '13px',
                        outline: 'none',
                        background: 'var(--bg-input)'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                >
                  <LogIn size={15} />
                  {loading ? 'Authenticating...' : activeTab === 'login' ? 'Sign In as Agent' : 'Create Agent Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
