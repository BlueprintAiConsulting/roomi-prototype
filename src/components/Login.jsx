import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import CaregiverLogin from './CaregiverLogin.jsx';
import './Login.css';

export default function Login() {
  const { signInWithGoogle, signInAnonymously, signUpWithEmail, signInWithEmail, claimResidentRole, error } = useAuth();
  const [showCaregiverLogin, setShowCaregiverLogin] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      // Default Google sign-ins become residents
      // (caregivers go through CaregiverLogin which claims the caregiver role)
      await claimResidentRole(user.uid);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    if (isSignUp) {
      if (!inviteCode) {
        setSubmitting(false);
        return;
      }
      const user = await signUpWithEmail(email, password, inviteCode);
      if (user) {
        // Role is set by the invite code automatically
        console.log('[login] Email signup successful');
      }
    } else {
      await signInWithEmail(email, password);
    }

    setSubmitting(false);
  };

  if (showCaregiverLogin) {
    return <CaregiverLogin onBack={() => setShowCaregiverLogin(false)} />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-fox">🦊</div>
        <h1 className="login-title">Welcome to ROOMI</h1>
        <p className="login-subtitle">
          Your daily companion for everyday independence
        </p>

        {!showEmailForm ? (
          // ─── Primary login options ─────────────────────────
          <div className="login-buttons">
            <button className="login-btn login-btn--google" onClick={handleGoogleSignIn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button className="login-btn login-btn--email" onClick={() => setShowEmailForm(true)}>
              ✉️ Sign in with Email
            </button>

            <button className="login-btn login-btn--guest" onClick={signInAnonymously}>
              👤 Try as Guest
            </button>
          </div>
        ) : (
          // ─── Email auth form ───────────────────────────────
          <form className="login-email-form" onSubmit={handleEmailSubmit}>
            <div className="login-form-toggle">
              <button
                type="button"
                className={`login-toggle-btn ${!isSignUp ? 'login-toggle-btn--active' : ''}`}
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`login-toggle-btn ${isSignUp ? 'login-toggle-btn--active' : ''}`}
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </button>
            </div>

            <input
              type="email"
              className="login-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <input
              type="password"
              className="login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />

            {isSignUp && (
              <input
                type="text"
                className="login-input login-input--invite"
                placeholder="Invite code (from your facility)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                maxLength={12}
                autoComplete="off"
              />
            )}

            <button
              type="submit"
              className="login-btn login-btn--email-submit"
              disabled={submitting}
            >
              {submitting ? '...' : isSignUp ? '🎟️ Create Account' : '→ Sign In'}
            </button>

            <button
              type="button"
              className="login-link-btn"
              onClick={() => setShowEmailForm(false)}
            >
              ← Back to options
            </button>
          </form>
        )}

        {error && (
          <p className="login-error">{error}</p>
        )}

        <p className="login-privacy">
          Your data stays private. ROOMI never shares your information.
        </p>

        {/* Caregiver portal link */}
        <div className="login-caregiver-link">
          <button
            className="login-caregiver-btn"
            onClick={() => setShowCaregiverLogin(true)}
          >
            🏠 Caregiver or Anchor? Sign in here →
          </button>
        </div>
      </div>
    </div>
  );
}
