import { useState, useCallback, useRef, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Landing from './components/Landing.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import Onboarding from './components/Onboarding.jsx';
import AnchorView from './components/AnchorView.jsx';
import Universe from './components/Universe.jsx';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [displayedView, setDisplayedView] = useState('landing');
  const [transitioning, setTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userData, setUserData] = useState(null);
  const [resetKey, setResetKey] = useState(0); // forces ChatInterface remount
  const mainRef = useRef(null);

  const handleNavigate = useCallback((view) => {
    if (view === currentView) return;
    setTransitioning(true);

    // Fade out
    setTimeout(() => {
      setCurrentView(view);
      setDisplayedView(view);
      window.scrollTo({ top: 0 });

      // Fade in
      requestAnimationFrame(() => {
        setTransitioning(false);
      });
    }, 250);
  }, [currentView]);

  const handleOpenOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingComplete = useCallback((data) => {
    setUserData(data);
    setShowOnboarding(false);
    handleNavigate('chat');
  }, [handleNavigate]);

  const handleResetDemo = useCallback(() => {
    setUserData(null);
    setShowOnboarding(false);
    setResetKey(k => k + 1); // force ChatInterface to remount fresh
    handleNavigate('landing');
  }, [handleNavigate]);

  const renderView = () => {
    switch (displayedView) {
      case 'chat':
        return <ChatInterface key={resetKey} userData={userData} />;
      case 'anchor':
        return <AnchorView />;
      case 'universe':
        return <Universe />;
      case 'landing':
      default:
        return (
          <Landing
            onNavigate={handleNavigate}
            onOpenOnboarding={handleOpenOnboarding}
          />
        );
    }
  };

  return (
    <div className="app">
      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenOnboarding={handleOpenOnboarding}
        onResetDemo={handleResetDemo}
        hasActiveDemo={!!userData}
      />

      <main
        id="main-content"
        ref={mainRef}
        role="main"
        aria-label={`ROOMI ${displayedView === 'chat' ? 'Chat' : displayedView === 'anchor' ? 'Anchor View' : displayedView === 'universe' ? 'Universe' : 'Home'}`}
        className={`main-content ${transitioning ? 'main-content--exit' : 'main-content--enter'}`}
      >
        {renderView()}
      </main>

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcements" />

      {showOnboarding && (
        <Onboarding
          onClose={handleCloseOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
