import { useState } from 'react';
import './Navbar.css';

export default function Navbar({ currentView, onNavigate, onOpenOnboarding, onResetDemo, onLogout, hasActiveDemo, isAuthenticated, isCaregiver, userName }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Caregivers only see Anchor View + Universe; residents see everything
  const navItems = isCaregiver
    ? [
        { id: 'anchor', label: '🏠 Anchor View' },
        { id: 'universe', label: 'Universe' },
      ]
    : [
        { id: 'landing', label: 'Home' },
        { id: 'universe', label: 'Universe' },
        { id: 'chat', label: 'Try ROOMI' },
        { id: 'anchor', label: 'Anchor View' },
        { id: 'hub', label: '🔒 Hub' },
      ];

  return (
    <nav className="navbar" id="main-nav">
      <div className="navbar-inner">
        <button className="navbar-brand" onClick={() => onNavigate('landing')}>
          <img src={`${import.meta.env.BASE_URL}roomi-logo-wide.png`} alt="ROOMI" className="navbar-logo-img" />
          <span className="navbar-logo-text">ROOMI</span>
        </button>

        <div className={`navbar-links ${mobileOpen ? 'navbar-links--open' : ''}`}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`navbar-link ${currentView === item.id ? 'navbar-link--active' : ''}`}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            >
              {item.label}
            </button>
          ))}
          {hasActiveDemo && (
            <button
              className="btn btn-reset-demo"
              onClick={() => { onResetDemo(); setMobileOpen(false); }}
              aria-label="Reset demo and return to start"
            >
              ↺ Reset Demo
            </button>
          )}
          {isAuthenticated ? (
            <div className="navbar-user-group">
              {userName && <span className="navbar-user-name">{userName}</span>}
              <button
                className="btn btn-logout"
                onClick={() => { onLogout(); setMobileOpen(false); }}
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { onOpenOnboarding(); setMobileOpen(false); }}>
              Get Started
            </button>
          )}
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${mobileOpen ? 'hamburger-line--open' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'hamburger-line--open' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'hamburger-line--open' : ''}`} />
        </button>
      </div>
    </nav>
  );
}
