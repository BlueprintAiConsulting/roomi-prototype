import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import './CaregiverLogin.css';

export default function CaregiverLogin({ onBack }) {
  const { signInWithGoogle, claimCaregiverRole, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleCaregiverSignIn = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await claimCaregiverRole(user.uid);
      }
    } catch (err) {
      setLocalError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cg-login-page">
      <div className="cg-login-card">
        {/* Badge */}
        <div className="cg-badge">🏠 Anchor / Caregiver Portal</div>

        <div className="cg-icon">🧑‍⚕️</div>
        <h1 className="cg-title">Caregiver Sign In</h1>
        <p className="cg-subtitle">
          Access daily summaries and wellness insights for the residents in your care.
        </p>

        <div className="cg-info-block">
          <div className="cg-info-row">
            <span className="cg-info-icon">📋</span>
            <span>Daily mood &amp; activity summaries</span>
          </div>
          <div className="cg-info-row">
            <span className="cg-info-icon">🚨</span>
            <span>Safety flag alerts</span>
          </div>
          <div className="cg-info-row">
            <span className="cg-info-icon">💬</span>
            <span>Resident's own words — unfiltered</span>
          </div>
          <div className="cg-info-row">
            <span className="cg-info-icon">📅</span>
            <span>Weekly wellness trends</span>
          </div>
        </div>

        <button
          className="cg-btn-google"
          onClick={handleCaregiverSignIn}
          disabled={loading}
        >
          {loading ? (
            <span className="cg-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {(error || localError) && (
          <p className="cg-error">{localError || error}</p>
        )}

        <button className="cg-back-btn" onClick={onBack}>
          ← Back to resident login
        </button>

        <p className="cg-privacy">
          Protected access. Only authorized caregivers may view resident data.
        </p>
      </div>
    </div>
  );
}
