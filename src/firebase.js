// ROOMI Firebase Configuration
// Environment variables are injected via .env (local) or GitHub Secrets (production)

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if we have a project ID (allows graceful fallback to demo mode)
let app, db, auth, storage, messaging;

if (firebaseConfig.projectId) {
  app     = initializeApp(firebaseConfig);
  db      = getFirestore(app);
  auth    = getAuth(app);
  storage = getStorage(app);

  // FCM is only available in secure contexts (HTTPS / localhost)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
    } catch (err) {
      console.warn('FCM not available:', err.message);
    }
  }
} else {
  console.warn('ROOMI: Firebase not configured — running in demo mode (no persistence)');
}

const googleProvider = new GoogleAuthProvider();

export {
  db,
  auth,
  storage,
  messaging,
  googleProvider,
  // Auth methods
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  // Firestore methods
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  limit,
  serverTimestamp,
  // Storage methods
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  // FCM methods
  getToken,
  onMessage,
};
