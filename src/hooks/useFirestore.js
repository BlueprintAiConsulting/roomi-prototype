// useFirestore.js — Firestore data access layer for ROOMI
import { useCallback } from 'react';
import {
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
} from '../firebase.js';

// ─── Roles ──────────────────────────────────────────────────
// role: 'resident' | 'caregiver'
// Caregivers have a `residents` array of resident UIDs they oversee

export async function getUserRole(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'userRoles', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

export async function setUserRole(uid, role, extra = {}) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'userRoles', uid), {
      uid,
      role,
      ...extra,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error setting user role:', err);
  }
}

// Get all residents a caregiver is linked to
export async function getCaregiverResidents(caregiverUid) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'userRoles'),
      where('role', '==', 'resident'),
      where('caregiverUids', 'array-contains', caregiverUid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading caregiver residents:', err);
    return [];
  }
}

// ─── User Profiles ──────────────────────────────────────────

export async function saveUserProfile(uid, data) {
  if (!db) return; // demo mode
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

export async function getUserProfile(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Error loading user profile:', err);
    return null;
  }
}

// ─── Conversations ──────────────────────────────────────────

export async function saveConversation(uid, scenario, messages) {
  if (!db || !uid) return;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if there's an existing conversation for this scenario today
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', uid),
      where('scenario', '==', scenario),
      where('date', '==', today),
      limit(1)
    );
    const snap = await getDocs(q);

    const conversationData = {
      userId: uid,
      scenario,
      date: today,
      messages: messages.map(m => ({
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp || new Date().toISOString(),
      })),
      updatedAt: serverTimestamp(),
    };

    if (snap.empty) {
      // Create new
      await addDoc(collection(db, 'conversations'), {
        ...conversationData,
        startedAt: serverTimestamp(),
      });
    } else {
      // Update existing
      const docRef = snap.docs[0].ref;
      await setDoc(docRef, conversationData, { merge: true });
    }
  } catch (err) {
    console.error('Error saving conversation:', err);
  }
}

export async function getConversations(uid, date) {
  if (!db) return [];
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', uid),
      where('date', '==', targetDate),
      orderBy('startedAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading conversations:', err);
    return [];
  }
}

// ─── Anchor Summaries ───────────────────────────────────────

export async function saveAnchorSummary(uid, summaryData) {
  if (!db || !uid) return;
  const today = new Date().toISOString().split('T')[0];

  try {
    const docId = `${uid}_${today}`;
    await setDoc(doc(db, 'anchorSummaries', docId), {
      userId: uid,
      date: today,
      ...summaryData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving anchor summary:', err);
  }
}

export async function getAnchorSummary(uid, date) {
  if (!db) return null;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const docId = `${uid}_${targetDate}`;
    const snap = await getDoc(doc(db, 'anchorSummaries', docId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Error loading anchor summary:', err);
    return null;
  }
}

// ─── Daily Summaries (Cross-Session Memory) ─────────────────

export async function saveDailySummary(uid, summaryText) {
  if (!db || !uid || !summaryText) return;
  const today = new Date().toISOString().split('T')[0];

  try {
    const docId = `${uid}_${today}`;
    await setDoc(doc(db, 'dailySummaries', docId), {
      userId: uid,
      date: today,
      summary: summaryText,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving daily summary:', err);
  }
}

export async function getRecentSummaries(uid, days = 3) {
  if (!db || !uid) return [];

  try {
    // Query last N days of summaries
    const q = query(
      collection(db, 'dailySummaries'),
      where('userId', '==', uid),
      orderBy('date', 'desc'),
      limit(days)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading recent summaries:', err);
    return [];
  }
}

// ─── Custom hook wrapper ────────────────────────────────────

export function useFirestore() {
  return {
    saveUserProfile: useCallback(saveUserProfile, []),
    getUserProfile: useCallback(getUserProfile, []),
    saveConversation: useCallback(saveConversation, []),
    getConversations: useCallback(getConversations, []),
    saveAnchorSummary: useCallback(saveAnchorSummary, []),
    getAnchorSummary: useCallback(getAnchorSummary, []),
    saveDailySummary: useCallback(saveDailySummary, []),
    getRecentSummaries: useCallback(getRecentSummaries, []),
  };
}

export default useFirestore;
