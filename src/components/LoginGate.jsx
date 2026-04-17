import { useState, useEffect } from 'react';
import './LoginGate.css';

const VALID_USER = 'roomi';
const VALID_PASS = 'forcass2030';
const AUTH_KEY = 'roomi_test_auth';

// Check if already authenticated
export function isTestAuthed() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

// Clear test auth
export function clearTestAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export default function LoginGate({ show, onSuccess, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Already authed — just proceed
  useEffect(() => {
    if (show && isTestAuthed()) {
      onSuccess();
    }
  }, [show, onSuccess]);

  if (!show || isTestAuthed()) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.toLowerCase().trim() === VALID_USER && password === VALID_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      setError('');
      onSuccess();
    } else {
      setError('Invalid credentials');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="login-gate" onClick={onClose}>
      <div className="login-gate-bg" />
      <form
        className={`login-card ${shake ? 'login-shake' : ''}`}
        onSubmit={handleLogin}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="login-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="login-fox">🦊</div>
        <h1 className="login-title">ROOMI</h1>
        <p className="login-subtitle">Live User Test Mode</p>

        <div className="login-field">
          <label htmlFor="login-user">Username</label>
          <input
            id="login-user"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-pass">Password</label>
          <input
            id="login-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-btn">
          Sign In →
        </button>

        <p className="login-footer">Founding council & authorized testers only</p>
      </form>
    </div>
  );
}
