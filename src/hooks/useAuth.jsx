// useAuth.jsx — Firebase Authentication hook for ROOMI
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnon,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from '../firebase.js';
import { getUserRole, setUserRole } from './useFirestore.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'resident' | 'caregiver' | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && !firebaseUser.isAnonymous) {
        // Load role from Firestore
        const roleDoc = await getUserRole(firebaseUser.uid);
        setRole(roleDoc?.role || null);
      } else {
        setRole(null);
      }

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

  // Sign in as resident (anonymous guest)
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

  // Claim caregiver role after Google sign-in
  const claimCaregiverRole = useCallback(async (uid) => {
    await setUserRole(uid, 'caregiver');
    setRole('caregiver');
  }, []);

  // Claim resident role after onboarding
  const claimResidentRole = useCallback(async (uid) => {
    await setUserRole(uid, 'resident');
    setRole('resident');
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, []);

  const value = {
    user,
    role,
    loading,
    error,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous ?? false,
    isCaregiver: role === 'caregiver',
    isResident: role === 'resident' || user?.isAnonymous,
    isDemoMode: !auth,
    signInWithGoogle,
    signInAnonymously,
    claimCaregiverRole,
    claimResidentRole,
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
