import { useState, useCallback, useRef, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Landing from './components/Landing.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import Onboarding from './components/Onboarding.jsx';
import AnchorView from './components/AnchorView.jsx';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [displayedView, setDisplayedView] = useState('landing');
  const [transitioning, setTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userData, setUserData] = useState(null);
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

  const renderView = () => {
    switch (displayedView) {
      case 'chat':
        return <ChatInterface userData={userData} />;
      case 'anchor':
        return <AnchorView />;
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
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenOnboarding={handleOpenOnboarding}
      />

      <main
        ref={mainRef}
        className={`main-content ${transitioning ? 'main-content--exit' : 'main-content--enter'}`}
      >
        {renderView()}
      </main>

      {showOnboarding && (
        <Onboarding
          onClose={handleCloseOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
