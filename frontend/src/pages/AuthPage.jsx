import React, { useState } from 'react';
import { Bot, Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthPage({ onNavigate, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', company: '',
  });

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  };

  const validate = () => {
    if (!form.email) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.';
    if (tab !== 'forgot' && !form.password) return 'Password is required.';
    if (tab !== 'forgot' && form.password.length < 6) return 'Password must be at least 6 characters.';
    if (tab === 'signup' && !form.name.trim()) return 'Full name is required.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    // Simulate async call
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    if (tab === 'forgot') {
      setSuccess('Password reset link sent! Check your inbox.');
      return;
    }
    // Navigate to dashboard
    onNavigate('dashboard');
  };

  return (
    <div className="auth-root">
      <div className="auth-bg-glow" />
      <div className="auth-bg-grid" />

      {/* Back to Landing */}
      <button className="auth-back-btn" onClick={() => onNavigate('landing')}>
        <ChevronLeft size={16} /> Back to home
      </button>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon"><Bot size={20} color="#fff" /></div>
          <span className="auth-logo-text">CareBot <span className="auth-logo-ai">AI</span></span>
        </div>

        {/* Tab switcher */}
        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
            >
              Log In
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Header */}
        <div className="auth-header">
          {tab === 'login' && <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your CareBot AI workspace</p>
          </>}
          {tab === 'signup' && <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start your 14-day free trial. No credit card required.</p>
          </>}
          {tab === 'forgot' && <>
            <button className="auth-back-inline" onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>
              <ChevronLeft size={14} /> Back to login
            </button>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">We'll send a reset link to your email address.</p>
          </>}
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-alert auth-alert-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="auth-alert auth-alert-success">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {tab === 'signup' && (
            <>
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <div className="auth-input-wrap">
                  <User size={15} className="auth-input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className="auth-input"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Company</label>
                <div className="auth-input-wrap">
                  <Building2 size={15} className="auth-input-icon" />
                  <input
                    id="auth-company"
                    type="text"
                    className="auth-input"
                    placeholder="Acme Corporation"
                    value={form.company}
                    onChange={e => update('company', e.target.value)}
                    autoComplete="organization"
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-label">Work Email</label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="jane@company.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Password</label>
                {tab === 'login' && (
                  <button type="button" className="auth-forgot-link" onClick={() => { setTab('forgot'); setError(''); setSuccess(''); }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder={tab === 'login' ? '••••••••' : 'At least 6 characters'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {tab === 'signup' && (
            <label className="auth-checkbox-row">
              <input type="checkbox" className="auth-checkbox" required />
              <span>I agree to the <a href="#" className="auth-link">Terms of Service</a> and <a href="#" className="auth-link">Privacy Policy</a></span>
            </label>
          )}

          <button id="auth-submit-btn" type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                {tab === 'login' && 'Sign In'}
                {tab === 'signup' && 'Create Account'}
                {tab === 'forgot' && 'Send Reset Link'}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Google SSO */}
        {tab !== 'forgot' && (
          <>
            <div className="auth-divider"><span>or continue with</span></div>
            <button className="auth-google-btn" onClick={() => onNavigate('dashboard')}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </>
        )}

        <p className="auth-footer-note">
          {tab === 'login' && <>Don't have an account? <button className="auth-link-btn" onClick={() => { setTab('signup'); setError(''); }}>Sign up free</button></>}
          {tab === 'signup' && <>Already have an account? <button className="auth-link-btn" onClick={() => { setTab('login'); setError(''); }}>Sign in</button></>}
        </p>
      </div>
    </div>
  );
}
