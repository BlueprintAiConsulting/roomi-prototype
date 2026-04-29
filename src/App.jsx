import { useState, useCallback, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { getUserProfile, saveUserProfile } from './hooks/useFirestore.js';
import Navbar from './components/Navbar.jsx';
import Landing from './components/Landing.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import Onboarding from './components/Onboarding.jsx';
import AnchorView from './components/AnchorView.jsx';
import Universe from './components/Universe.jsx';
import FounderHub from './components/FounderHub.jsx';
import Login from './components/Login.jsx';
import RawChatTest from './components/RawChatTest.jsx';
import './App.css';

function AppContent() {
  const { user, role, loading, isAuthenticated, isCaregiver, isFounder, isDemoMode, logout } = useAuth();
  const [currentView, setCurrentView] = useState('landing');
  const [displayedView, setDisplayedView] = useState('landing');
  const [transitioning, setTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userData, setUserData] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showRawChat, setShowRawChat] = useState(false);
  const mainRef = useRef(null);

  // Load user profile from Firestore on auth
  useEffect(() => {
    if (!isAuthenticated || isDemoMode || profileLoaded) return;

    async function loadProfile() {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserData(profile);
      }
      setProfileLoaded(true);
    }
    loadProfile();
  }, [isAuthenticated, isDemoMode, user, profileLoaded]);

  // Reset profileLoaded when user changes
  useEffect(() => {
    setProfileLoaded(false);
  }, [user?.uid]);

  // Auto-route caregivers to Anchor View when they log in
  useEffect(() => {
    if (isCaregiver && currentView === 'landing') {
      handleNavigate('anchor');
    }
  }, [isCaregiver, currentView]);

  const handleNavigate = useCallback((view) => {
    if (view === currentView) return;
    setTransitioning(true);

    setTimeout(() => {
      setCurrentView(view);
      setDisplayedView(view);
      window.scrollTo({ top: 0 });

      requestAnimationFrame(() => {
        setTransitioning(false);
      });
    }, 250);
  }, [currentView]);

  const handleOpenOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  // Tester shortcut: skip onboarding, jump straight to raw chat
  const handleTesterChat = useCallback(() => {
    setShowRawChat(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingComplete = useCallback(async (data) => {
    setUserData(data);
    setShowOnboarding(false);

    // Save profile to Firestore if authenticated
    if (isAuthenticated && user?.uid) {
      await saveUserProfile(user.uid, {
        ...data,
        createdAt: new Date().toISOString(),
      });
    }

    handleNavigate('chat');
  }, [handleNavigate, isAuthenticated, user]);

  const handleResetDemo = useCallback(() => {
    setUserData(null);
    setShowOnboarding(false);
    setResetKey(k => k + 1);
    handleNavigate('landing');
  }, [handleNavigate]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUserData(null);
    setProfileLoaded(false);
    setResetKey(k => k + 1);
    handleNavigate('landing');
  }, [logout, handleNavigate]);

  // Show loading spinner while auth initializes
  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-fox">🦊</div>
        <div className="app-loading-text">Loading ROOMI…</div>
      </div>
    );
  }

  // Show login if not authenticated and Firebase is configured
  if (!isAuthenticated && !isDemoMode) {
    return <Login />;
  }

  const renderView = () => {
    switch (displayedView) {
      case 'chat':
        return <ChatInterface key={resetKey} userData={userData} userId={user?.uid} />;
      case 'anchor':
        return <AnchorView userId={user?.uid} isCaregiver={isCaregiver} />;
      case 'universe':
        return <Universe />;
      case 'hub':
        // Founder-only gate — non-founders silently redirected
        if (!isFounder) {
          return (
            <Landing
              onNavigate={handleNavigate}
              onOpenOnboarding={handleOpenOnboarding}
              onTesterChat={handleTesterChat}
            />
          );
        }
        return <FounderHub userId={user?.uid} userName={user?.displayName || userData?.preferredName} />;
      case 'landing':
      default:
        return (
          <Landing
            onNavigate={handleNavigate}
            onOpenOnboarding={handleOpenOnboarding}
            onTesterChat={handleTesterChat}
          />
        );
    }
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenOnboarding={handleOpenOnboarding}
        onResetDemo={handleResetDemo}
        onLogout={handleLogout}
        hasActiveDemo={!!userData}
        isAuthenticated={isAuthenticated}
        isCaregiver={isCaregiver}
        isFounder={isFounder}
        userName={user?.displayName || userData?.preferredName}
      />

      <main
        id="main-content"
        ref={mainRef}
        role="main"
        aria-label={`ROOMI ${displayedView === 'chat' ? 'Chat' : displayedView === 'anchor' ? 'Anchor View' : displayedView === 'universe' ? 'Universe' : displayedView === 'hub' ? 'Founder Hub' : 'Home'}`}
        className={`main-content ${transitioning ? 'main-content--exit' : 'main-content--enter'}`}
      >
        {renderView()}
      </main>

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcements" />

      {showOnboarding && (
        <Onboarding
          onClose={handleCloseOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}

      {showRawChat && (
        <RawChatTest onExit={() => setShowRawChat(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
