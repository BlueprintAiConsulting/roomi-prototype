import { useState, useEffect } from 'react';
import './LoginGate.css';

const VALID_USER = 'roomi';
const VALID_PASS = 'forcass2030';
const AUTH_KEY = 'roomi_test_auth';

export default function LoginGate({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored === 'true') setIsAuthed(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.toLowerCase().trim() === VALID_USER && password === VALID_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthed(true);
      setError('');
    } else {
      setError('Invalid credentials');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (isAuthed) return children;

  return (
    <div className="login-gate">
      <div className="login-gate-bg" />
      <form className={`login-card ${shake ? 'login-shake' : ''}`} onSubmit={handleLogin}>
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

        <p className="login-footer">Authorized testers only</p>
      </form>
    </div>
  );
}
