import { useState } from 'react';
import './Navbar.css';

export default function Navbar({ currentView, onNavigate, onOpenOnboarding }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'universe', label: 'Universe' },
    { id: 'chat', label: 'Try ROOMI' },
    { id: 'anchor', label: 'Anchor View' },
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
          <button className="btn btn-primary btn-sm" onClick={() => { onOpenOnboarding(); setMobileOpen(false); }}>
            Get Started
          </button>
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
