// useAuth.jsx — Firebase Authentication hook for ROOMI
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnon,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from '../firebase.js';
import { getUserRole, setUserRole } from './useFirestore.js';

const AuthContext = createContext(null);

// Hardcoded founder UID whitelist — these accounts can access the Hub
// Even if someone sets their Firestore role to 'founder', they still
// need to be on this list. Double-layer security.
const FOUNDER_EMAILS = [
  'drewhufnagle@gmail.com',       // Drew Hufnagle
  'wadecsmith@gmail.com',         // Wade Smith
  'cassiesmith@gmail.com',        // Cassie Smith
  'alyssasenft@gmail.com',        // Alyssa Senft
  'daltonsenft@gmail.com',        // Dalton Senft
  'breannamccullough@gmail.com',  // Breanna McCullough
];

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

  // ─── Email/Password Auth (Phase 2D) ────────────────────────

  // Validate an invite code before signup
  const validateInviteCode = useCallback(async (code) => {
    if (!db || !code) return { valid: false, error: 'Invalid code' };
    try {
      const q = query(
        collection(db, 'inviteCodes'),
        where('code', '==', code.trim().toUpperCase()),
        where('used', '==', false)
      );
      const snap = await getDocs(q);
      if (snap.empty) return { valid: false, error: 'Invalid or used invite code' };

      const invite = { id: snap.docs[0].id, ...snap.docs[0].data() };
      return { valid: true, invite };
    } catch (err) {
      console.error('Invite code validation error:', err);
      return { valid: false, error: 'Could not validate code' };
    }
  }, []);

  // Sign up with email + invite code
  const signUpWithEmail = useCallback(async (email, password, inviteCode) => {
    if (!auth || !db) return null;
    try {
      setError(null);

      // Validate invite code first
      const { valid, invite, error: codeError } = await validateInviteCode(inviteCode);
      if (!valid) {
        setError(codeError);
        return null;
      }

      // Create Firebase auth user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;

      // Set role from invite code
      const assignedRole = invite.role || 'resident';
      await setUserRole(uid, assignedRole);
      setRole(assignedRole);

      // Mark invite code as used
      await setDoc(doc(db, 'inviteCodes', invite.id), {
        used: true,
        usedBy: uid,
        usedAt: serverTimestamp(),
      }, { merge: true });

      // If invite has a facility, link user to it
      if (invite.facilityId) {
        await setDoc(doc(db, 'users', uid), {
          facilityId: invite.facilityId,
          facilityName: invite.facilityName || '',
        }, { merge: true });
      }

      console.log(`[auth] Signed up user ${uid} as ${assignedRole} via invite ${invite.code}`);
      return result.user;
    } catch (err) {
      const friendlyErrors = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(friendlyErrors[err.code] || err.message);
      console.error('Email signup error:', err);
      return null;
    }
  }, [validateInviteCode]);

  // Sign in with email/password (no invite code needed)
  const signInWithEmail = useCallback(async (email, password) => {
    if (!auth) return null;
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const friendlyErrors = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Try again.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
      };
      setError(friendlyErrors[err.code] || err.message);
      console.error('Email sign-in error:', err);
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

  const isFounder = !!(user && (
    role === 'founder' ||
    FOUNDER_EMAILS.includes(user.email?.toLowerCase())
  ));

  const value = {
    user,
    role,
    loading,
    error,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous ?? false,
    isCaregiver: role === 'caregiver',
    isResident: role === 'resident' || user?.isAnonymous,
    isFounder,
    isDemoMode: !auth,
    signInWithGoogle,
    signInAnonymously,
    signUpWithEmail,
    signInWithEmail,
    validateInviteCode,
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

