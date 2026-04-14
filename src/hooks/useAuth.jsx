// useAuth.js — Firebase Authentication hook for ROOMI
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnon,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      // Firebase not configured — demo mode
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    }, (err) => {
      console.error('Auth state error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return null;
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      setError(err.message);
      console.error('Google sign-in error:', err);
      return null;
    }
  }, []);

  const signInAnonymously = useCallback(async () => {
    if (!auth) return null;
    try {
      setError(null);
      const result = await firebaseSignInAnon(auth);
      return result.user;
    } catch (err) {
      setError(err.message);
      console.error('Anonymous sign-in error:', err);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous ?? false,
    isDemoMode: !auth, // Firebase not configured
    signInWithGoogle,
    signInAnonymously,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
