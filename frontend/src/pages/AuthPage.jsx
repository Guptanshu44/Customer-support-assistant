import React, { useState } from 'react';
import { Bot, Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight, ChevronLeft, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, signupWithEmail, isFirebaseConfigured, setLocalDemoUser } from '../api/firebase';

export default function AuthPage({ onNavigate, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState(null); // string or { type, msg }
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', company: '',
  });

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (fieldErrors[k]) {
      setFieldErrors(prev => ({ ...prev, [k]: null }));
    }
    setError(null);
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError(null);
    setSuccess('');
    setFieldErrors({});
  };

  const validate = () => {
    const errs = {};
    if (tab === 'signup' && !form.name.trim()) {
      errs.name = 'Please enter your full name.';
    }

    if (!form.email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. user@domain.com).';
    }

    if (tab !== 'forgot') {
      if (!form.password) {
        errs.password = 'Please enter your password.';
      } else if (form.password.length < 6) {
        errs.password = 'Password must be at least 6 characters.';
      }
    }

    if (tab === 'signup' && !agreeTerms) {
      errs.terms = 'Please accept the Terms of Service to create an account.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstMsg = Object.values(errs)[0];
      setError(firstMsg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (tab === 'forgot') {
        await new Promise(r => setTimeout(r, 600));
        setLoading(false);
        setSuccess('Password reset link sent! Check your inbox.');
        return;
      }

      if (isFirebaseConfigured()) {
        if (tab === 'login') {
          await loginWithEmail(form.email, form.password);
        } else {
          await signupWithEmail(form.email, form.password, form.name);
        }
      } else {
        // Graceful offline fallback
        setLocalDemoUser(form.name || form.email.split('@')[0], 'Agent');
        await new Promise(r => setTimeout(r, 500));
      }
      setLoading(false);
      onNavigate('dashboard');
    } catch (authErr) {
      console.error(authErr);
      setLoading(false);
      const code = authErr?.code || '';
      const rawMsg = authErr?.message || '';

      if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
        setError({
          type: 'email-in-use',
          msg: `The email "${form.email}" is already registered. Please sign in with your password.`
        });
        setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || rawMsg.includes('invalid-credential') || rawMsg.includes('wrong-password')) {
        setError({
          type: 'invalid-credential',
          msg: 'Incorrect email or password. Please verify your credentials and try again.'
        });
        setFieldErrors(prev => ({ ...prev, password: 'Incorrect password.' }));
      } else if (code === 'auth/user-not-found' || rawMsg.includes('user-not-found')) {
        setError({
          type: 'user-not-found',
          msg: `No account found with email "${form.email}". Please create an account.`
        });
        setFieldErrors(prev => ({ ...prev, email: 'Account does not exist.' }));
      } else if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
        setError({
          type: 'weak-password',
          msg: 'Password is too weak. Please use at least 6 characters.'
        });
        setFieldErrors(prev => ({ ...prev, password: 'Password too weak (min. 6 characters).' }));
      } else if (code === 'auth/invalid-email' || rawMsg.includes('invalid-email')) {
        setError({
          type: 'invalid-email',
          msg: 'Invalid email format. Please check the address format.'
        });
        setFieldErrors(prev => ({ ...prev, email: 'Invalid email address.' }));
      } else {
        setError({
          type: 'general',
          msg: rawMsg || 'Authentication failed. Please check your credentials.'
        });
      }
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setLoading(false);
      onNavigate('dashboard');
    } catch (err) {
      console.error(err);
      setLoading(false);
      if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setError({
          type: 'unauthorized-domain',
          msg: `Domain "${host}" is not whitelisted in Firebase Console -> Authentication -> Settings -> Authorized domains.`
        });
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError({ type: 'cancelled', msg: 'Sign-in cancelled: popup was closed.' });
      } else if (err?.code === 'auth/popup-blocked') {
        setError({ type: 'blocked', msg: 'Sign-in popup was blocked by your browser. Please allow popups.' });
      } else {
        setError({ type: 'general', msg: err?.message || 'Google authentication failed.' });
      }
    }
  };

  const errorMessage = typeof error === 'string' ? error : error?.msg;

  return (
    <div className="auth-root">
      <div className="auth-bg-glow" />
      <div className="auth-bg-grid" />

      <button className="auth-back-btn" onClick={() => onNavigate('landing')}>
        <ChevronLeft size={16} /> Back to home
      </button>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Bot size={20} color="#fff" /></div>
          <span className="auth-logo-text">OmniDesk <span className="auth-logo-ai">Copilot</span></span>
        </div>

        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Log In
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        <div className="auth-header">
          {tab === 'login' && <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your OmniDesk Copilot workspace</p>
          </>}
          {tab === 'signup' && <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start your 14-day free trial. No credit card required.</p>
          </>}
          {tab === 'forgot' && <>
            <button className="auth-back-inline" onClick={() => switchTab('login')}>
              <ChevronLeft size={14} /> Back to login
            </button>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">We'll send a reset link to your email address.</p>
          </>}
        </div>

        {errorMessage && (
          <div className="auth-alert auth-alert-error" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', lineHeight: 1.4 }}>{errorMessage}</span>
            </div>
            {typeof error === 'object' && error?.type === 'email-in-use' && (
              <button
                type="button"
                className="btn-primary-sm"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  fontSize: '11.5px',
                  padding: '5px 12px',
                  borderRadius: '6px'
                }}
                onClick={() => switchTab('login')}
              >
                Switch to Log In Tab →
              </button>
            )}
            {typeof error === 'object' && error?.type === 'user-not-found' && (
              <button
                type="button"
                className="btn-primary-sm"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  fontSize: '11.5px',
                  padding: '5px 12px',
                  borderRadius: '6px'
                }}
                onClick={() => switchTab('signup')}
              >
                Switch to Sign Up Tab →
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="auth-alert auth-alert-success">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {tab === 'signup' && (
            <>
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-name">
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="auth-input-wrap">
                  <User size={15} className="auth-input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className={`auth-input ${fieldErrors.name ? 'auth-input-error' : ''}`}
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && (
                  <div className="auth-field-error">
                    <AlertCircle size={12} /> {fieldErrors.name}
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-company">
                  Company / Organization <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className="auth-input-wrap">
                  <Building2 size={15} className="auth-input-icon" />
                  <input
                    id="auth-company"
                    type="text"
                    className="auth-input"
                    placeholder="Enter your company name"
                    value={form.company}
                    onChange={e => update('company', e.target.value)}
                    autoComplete="organization"
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Work Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                className={`auth-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
                placeholder="Enter your email address"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <div className="auth-field-error">
                <AlertCircle size={12} /> {fieldErrors.email}
              </div>
            )}
          </div>

          {tab !== 'forgot' && (
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="auth-password">
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {tab === 'login' && (
                  <button type="button" className="auth-forgot-link" onClick={() => switchTab('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${fieldErrors.password ? 'auth-input-error' : ''}`}
                  placeholder={tab === 'login' ? 'Enter your password' : 'Create a password (min. 6 characters)'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="auth-field-error">
                  <AlertCircle size={12} /> {fieldErrors.password}
                </div>
              )}
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label className="auth-checkbox-row">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={agreeTerms}
                  onChange={e => {
                    setAgreeTerms(e.target.checked);
                    if (fieldErrors.terms) setFieldErrors(prev => ({ ...prev, terms: null }));
                  }}
                />
                <span>I agree to the <a href="#" className="auth-link">Terms of Service</a> and <a href="#" className="auth-link">Privacy Policy</a></span>
              </label>
              {fieldErrors.terms && (
                <div className="auth-field-error" style={{ marginTop: '5px' }}>
                  <AlertCircle size={12} /> {fieldErrors.terms}
                </div>
              )}
            </div>
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

        {tab !== 'forgot' && (
          <>
            <div className="auth-divider"><span>or continue with</span></div>
            <button className="auth-google-btn" type="button" onClick={handleGoogleClick} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </>
        )}

        <p className="auth-footer-note">
          {tab === 'login' && <>Don't have an account? <button className="auth-link-btn" onClick={() => switchTab('signup')}>Sign up free</button></>}
          {tab === 'signup' && <>Already have an account? <button className="auth-link-btn" onClick={() => switchTab('login')}>Sign in</button></>}
        </p>
      </div>
    </div>
  );
}
