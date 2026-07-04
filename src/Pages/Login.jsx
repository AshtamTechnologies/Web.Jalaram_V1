import React, { useState, useEffect } from 'react';
import './Common.css';
import { apiService } from '../api/api';

export default function Login({ onLogin, onNavigate }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // ── Forgot password ──────────────────────────────────────
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // ── Forced password change ───────────────────────────────
  const [forceChange, setForceChange] = useState(false);
  const [changeStep, setChangeStep] = useState(1);
  const [changeData, setChangeData] = useState({
    email: '', userId: null, resetToken: '', newPassword: '', confirmPassword: '',
  });
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* ─── helpers ─── */
  const decodeJWT = (token) => {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch { return null; }
  };

  const clearFieldError = (name) => {
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  /* ─── handlers ─── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    clearFieldError(name);
    if (forgotError) setForgotError('');
    if (forgotSuccess) setForgotSuccess('');
  };

  const handleChangeInput = (e) => {
    const { name, value } = e.target;
    setChangeData(p => ({ ...p, [name]: value }));
    clearFieldError(name);
  };

  const validateLogin = () => {
    const e = {};
    if (!formData.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid';
    if (!formData.password) e.password = 'Password is required';
    return e;
  };

  const validateNewPassword = () => {
    const e = {};
    if (!changeData.newPassword) e.newPassword = 'New password is required';
    else if (changeData.newPassword.length < 6) e.newPassword = 'Minimum 6 characters';
    if (!changeData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (changeData.newPassword !== changeData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  /* ─── forgot password ─── */
  const handleForgotPassword = async () => {
    setForgotError('');
    const email = formData.email.trim();
    if (!email) { setForgotError('Enter your email above, then click Forgot Password.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setForgotError('Enter a valid email address first.'); return; }

    setForgotLoading(true);
    try {
      await apiService.forgotPassword(email);
      setForgotError('');
      setForgotSuccess('Reset link sent! Please check your inbox.');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  /* ─── forced password change submit ─── */
  const handlePasswordChangeSubmit = async () => {
    const errs = validateNewPassword();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      await apiService.resetPassword({
        email: changeData.email,
        newPassword: changeData.newPassword,
      });
      setChangeStep(3);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ─── login submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    try {
      // apiService.loginUser now throws if:
      //   • the HTTP status is non-2xx (wrong credentials → 401/400)
      //   • the response has no valid JWT token
      //   • the JWT is already expired
      // So if we reach the lines below, the login is genuinely successful.
      const response = await apiService.loginUser(formData);

      // forced password change — apiService returns early without storing tokens
      if (response.forcePasswordChange === true) {
        setChangeData({
          email: formData.email,
          userId: response.userId,
          resetToken: '',
          newPassword: '',
          confirmPassword: '',
        });
        setChangeStep(2);
        setForceChange(true);
        setLoading(false);
        return;
      }

      // Role-based navigation — localStorage is already set by apiService
      const roleStr = (response.role || response.user?.role || '').toLowerCase().trim();
      const roleId = response.roleId || response.user?.roleId;



      if (roleStr === 'admin' || roleId === 1 || roleId === '1') {
        onNavigate('admin');
      }
      else if (roleStr === 'supervisor') {
        onNavigate('supervisor');
      }
      else if (roleStr === 'worker') {
        onNavigate('workertask');
      }
      else {
        alert(`Unknown role: ${roleStr}`);
      }
    } catch (error) {
      // Surface the error message from the API (e.g. "Invalid credentials")
      // or fall back to generic messages based on what went wrong.
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.error ||
          (error.response.status === 401 ? 'Invalid email or password.' : null) ||
          (error.response.status === 400 ? 'Invalid request. Check your details.' : null) ||
          'Login failed. Please try again.';
        setErrors({ submit: msg });
      } else if (error.request) {
        // Request was made but no response received (network error / server down)
        setErrors({ submit: 'Network error. Please check your connection.' });
      } else {
        // Something else went wrong (e.g. our own token validation logic)
        setErrors({ submit: error.message || 'Login failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ════════════════════════════════════════════════════════
     FORCED PASSWORD CHANGE SCREEN  (same glass panel UI)
  ════════════════════════════════════════════════════════ */
  if (forceChange) {
    return (
      <div className="lp-root">
        {/* background shapes — identical to login */}
        <div className="lp-bg" aria-hidden="true">
          <div className="shape s-blue" />
          <div className="shape s-purple" />
          <div className="shape s-coral" />
          <div className="shape s-lavender" />
          <div className="shape s-pink" />
          <div className="shape s-red" />
          <div className="shape s-teal" />
          <div className="shape s-tri" />
          <div className="s-dots" />
        </div>

        <div className={`lp-panel lp-panel--in`}>

          {/* Logo */}
          <div className="lp-logo">
            <img src="/logoimp.svg" alt="Logo" className="lp-logo-img" />
          </div>

          {/* Lock icon badge */}
          {changeStep !== 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'linear-gradient(135deg,rgba(4,158,223,0.18),rgba(108,99,255,0.14))',
                border: '1.5px solid rgba(4,158,223,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#lpGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="lpGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#049edf" />
                      <stop offset="100%" stopColor="#6c63ff" />
                    </linearGradient>
                  </defs>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          )}

          {changeStep !== 3 && (
            <>
              <h1 className="lp-title" style={{ fontSize: '20px', marginBottom: '4px' }}>
                Change Your Password
              </h1>
              <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '13px', color: '#9090a8', fontWeight: 600, textAlign: 'center', marginBottom: '22px', lineHeight: 1.5 }}>
                For your security, set a new password<br />before continuing.
              </p>
            </>
          )}

          {changeStep === 1 && (
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '13px', color: '#9090a8', textAlign: 'center' }}>
              ⏳ Preparing password change form…
            </p>
          )}

          {changeStep === 2 && (
            <>
              {errors.submit && (
                <p className="lp-error" style={{ marginBottom: '14px' }}>{errors.submit}</p>
              )}

              {/* New password */}
              <label className="lp-field-label">New Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="lp-pw-wrap" style={{ marginBottom: errors.newPassword ? '4px' : '16px' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  name="newPassword"
                  className={`lp-input${errors.newPassword ? ' lp-input--error' : ''}`}
                  placeholder="Minimum 6 characters"
                  value={changeData.newPassword}
                  onChange={handleChangeInput}
                  style={{ marginBottom: 0 }}
                />
                <button type="button" className="lp-eye" onClick={() => setShowNewPw(v => !v)} aria-label="Toggle">
                  {showNewPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="lp-field-err" style={{ marginBottom: '12px' }}>{errors.newPassword}</p>
              )}

              {/* Confirm password */}
              <label className="lp-field-label">Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="lp-pw-wrap" style={{ marginBottom: errors.confirmPassword ? '4px' : '20px' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  name="confirmPassword"
                  className={`lp-input${errors.confirmPassword ? ' lp-input--error' : ''}`}
                  placeholder="Re-enter new password"
                  value={changeData.confirmPassword}
                  onChange={handleChangeInput}
                  style={{ marginBottom: 0 }}
                />
                <button type="button" className="lp-eye" onClick={() => setShowConfirmPw(v => !v)} aria-label="Toggle">
                  {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="lp-field-err" style={{ marginBottom: '16px' }}>{errors.confirmPassword}</p>
              )}

              {/* Password strength hint */}
              <PasswordStrengthBar password={changeData.newPassword} />

              <button
                type="button"
                className="lp-submit"
                disabled={loading}
                onClick={handlePasswordChangeSubmit}
                style={{ marginTop: '8px' }}
              >
                {loading ? <span className="lp-spinner" /> : 'Set New Password'}
              </button>
            </>
          )}

          {changeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(34,197,94,0.14)',
                border: '1.5px solid rgba(34,197,94,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(34,197,94,0.15)',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="lp-title" style={{ fontSize: '20px', marginBottom: '8px', color: '#16a34a' }}>
                Password Updated!
              </h2>
              <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '13.5px', color: '#707085', fontWeight: 600, marginBottom: '24px', lineHeight: 1.5 }}>
                Your password was changed successfully.<br />Please log in using your new password.
              </p>
              <button
                type="button"
                className="lp-submit"
                onClick={() => {
                  setForceChange(false);
                  setChangeStep(1);
                  setFormData({ email: changeData.email, password: '' });
                  setChangeData({ email: '', userId: null, resetToken: '', newPassword: '', confirmPassword: '' });
                }}
                style={{ marginBottom: 0 }}
              >
                Go to Login
              </button>
            </div>
          )}

          {/* back link */}
          {changeStep !== 3 && (
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', color: '#b0b0c8', textAlign: 'center', marginTop: '18px', fontWeight: 600 }}>
              <button
                type="button"
                onClick={() => { setForceChange(false); setErrors({}); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#049edf', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '12.5px' }}>
                ← Back to Login
              </button>
            </p>
          )}
        </div>

        {/* tagline — desktop */}
        <div className={`lp-tagline-wrap lp-tagline-wrap--in`}>
          <blockquote className="lp-tagline">
            "Your brand deserves<br />to be seen everywhere."
          </blockquote>
          <p className="lp-tagline-sub">
            Hoardings, banners &amp; flex prints<br />
            that make Gujarat stop and stare.
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     NORMAL LOGIN SCREEN
  ════════════════════════════════════════════════════════ */
  return (
    <div className="lp-root">

      <div className="lp-bg" aria-hidden="true">
        <div className="shape s-blue" />
        <div className="shape s-purple" />
        <div className="shape s-coral" />
        <div className="shape s-lavender" />
        <div className="shape s-pink" />
        <div className="shape s-red" />
        <div className="shape s-teal" />
        <div className="shape s-tri" />
        <div className="s-dots" />
      </div>

      <div className={`lp-panel ${visible ? 'lp-panel--in' : ''}`}>

        <div className="lp-logo">
          <img src="/logoimp.svg" alt="Logo" className="lp-logo-img" />
        </div>

        <h1 className="lp-title">Login</h1>

        <form onSubmit={handleSubmit} noValidate>

          {/* submit-level error */}
          {errors.submit && (
            <p className="lp-error" style={{ marginBottom: '12px' }}>{errors.submit}</p>
          )}

          {/* Email */}
          <div style={{ marginBottom: errors.email ? '4px' : '0' }}>
            <input
              type="email"
              name="email"
              className={`lp-input${errors.email ? ' lp-input--error' : ''}`}
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          {errors.email && <p className="lp-field-err" style={{ marginBottom: '8px' }}>{errors.email}</p>}

          {/* Password */}
          <div style={{ marginBottom: errors.password ? '4px' : '0' }}>
            <div className="lp-pw-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`lp-input${errors.password ? ' lp-input--error' : ''}`}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                style={{ marginBottom: 0 }}
              />
              <button type="button" className="lp-eye" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password">
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {errors.password && <p className="lp-field-err" style={{ marginBottom: '8px' }}>{errors.password}</p>}

          {/* Options row */}
          <div className="lp-opts">
            <label className="lp-check">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span className="lp-checkmark">
                {remember && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              Remember me?
            </label>
            <button
              type="button"
              className="lp-forgot"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              style={{ background: 'none', border: 'none', cursor: forgotLoading ? 'not-allowed' : 'pointer', padding: 0 }}
            >
              {forgotLoading ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>

          {forgotError && (
            <div style={{
              margin: '8px 0 12px', padding: '10px 13px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px', color: '#ef4444',
              fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', fontWeight: 600,
            }}>
              ⚠️ {forgotError}
            </div>
          )}
          {forgotSuccess && (
            <div style={{
              margin: '8px 0 12px', padding: '10px 13px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '10px', color: '#16a34a',
              fontFamily: 'Nunito,sans-serif', fontSize: '12.5px', fontWeight: 600,
            }}>
              ✅ {forgotSuccess}
            </div>
          )}

          <button type="submit" className="lp-submit" disabled={loading}>
            {loading ? <span className="lp-spinner" /> : 'Login'}
          </button>

        </form>

      </div>

      <div className={`lp-tagline-wrap ${visible ? 'lp-tagline-wrap--in' : ''}`}>
        <blockquote className="lp-tagline">
          "Your brand deserves<br />to be seen everywhere."
        </blockquote>
        <p className="lp-tagline-sub">
          Hoardings, banners &amp; flex prints<br />
          that make Gujarat stop and stare.
        </p>
      </div>
    </div>
  );
}

/* ─── small inline SVG helpers (avoid emoji for toggle) ─── */
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─── password strength bar ─── */
function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSymbol ? 1 : 0);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '4px',
            background: i <= score ? colors[score] : 'rgba(0,0,0,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: '11.5px', fontWeight: 700, color: colors[score], margin: 0, textAlign: 'right' }}>
        {labels[score]}
      </p>
    </div>
  );
}