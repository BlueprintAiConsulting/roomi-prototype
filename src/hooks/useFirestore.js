// useFirestore.js — Firestore data access layer for ROOMI
// Phase 1: analytics, feedback, and safety event logging added
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

export async function getRecentSummaries(uid, days = 7) {
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

// ─── Learned Facts (Persistent Memory) ──────────────────────
// Facts extracted from conversations — stored on user profile

export async function saveLearnedFacts(uid, newFacts) {
  if (!db || !uid || !newFacts?.length) return;
  try {
    // Read existing facts first to deduplicate
    const snap = await getDoc(doc(db, 'users', uid));
    const existing = snap.exists() ? (snap.data().learnedFacts || []) : [];

    // Deduplicate by lowercase comparison
    const existingLower = new Set(existing.map(f => f.toLowerCase().trim()));
    const uniqueNew = newFacts.filter(f => !existingLower.has(f.toLowerCase().trim()));

    if (uniqueNew.length === 0) return;

    // Merge and cap at 50 facts (oldest drop off)
    const merged = [...existing, ...uniqueNew].slice(-50);

    await setDoc(doc(db, 'users', uid), {
      learnedFacts: merged,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log(`[memory] Saved ${uniqueNew.length} new facts for user`);
  } catch (err) {
    console.error('Error saving learned facts:', err);
  }
}

export async function getLearnedFacts(uid) {
  if (!db || !uid) return [];
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data().learnedFacts || []) : [];
  } catch (err) {
    console.error('Error loading learned facts:', err);
    return [];
  }
}

// ─── Weekly Summaries (Compressed Memory) ───────────────────

export async function saveWeeklySummary(uid, weekStartDate, summaryText) {
  if (!db || !uid || !summaryText) return;
  try {
    const docId = `${uid}_${weekStartDate}`;
    await setDoc(doc(db, 'weeklySummaries', docId), {
      userId: uid,
      weekStart: weekStartDate,
      summary: summaryText,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving weekly summary:', err);
  }
}

export async function getWeeklySummaries(uid, weeks = 4) {
  if (!db || !uid) return [];
  try {
    const q = query(
      collection(db, 'weeklySummaries'),
      where('userId', '==', uid),
      orderBy('weekStart', 'desc'),
      limit(weeks)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading weekly summaries:', err);
    return [];
  }
}

// ─── Privacy Helper ─────────────────────────────────────────
// One-way hash of userId so analytics data is pseudonymous
export async function hashUserId(uid) {
  if (!uid) return 'anonymous';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(uid + 'roomi-salt-v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch {
    return 'hash-unavailable';
  }
}

// ─── Analytics Logging ──────────────────────────────────────
// Logs every conversation turn for behavior analysis (no PII)

export async function logAnalyticsTurn(uid, data) {
  if (!db) return;
  try {
    const hashedId = await hashUserId(uid);
    await addDoc(collection(db, 'analytics'), {
      userId:          hashedId,
      scenario:        data.scenario        || 'unknown',
      date:            new Date().toISOString().split('T')[0],
      turn:            data.turn            ?? 0,
      userMsgLen:      data.userMsgLen      ?? 0,
      roomiMsgLen:     data.roomiMsgLen     ?? 0,
      responseTimeMs:  data.responseTimeMs  ?? 0,
      safetyFired:     data.safetyFired     ?? false,
      finishReason:    data.finishReason    || 'STOP',
      timestamp:       serverTimestamp(),
    });
  } catch (err) {
    // Analytics are non-critical — fail silently
    console.warn('[analytics] Failed to log turn:', err.message);
  }
}

// ─── Feedback Logging ───────────────────────────────────────
// Records thumbs up/down ratings on individual ROOMI responses

export async function logFeedback(uid, data) {
  if (!db) return;
  try {
    const hashedId = await hashUserId(uid);
    await addDoc(collection(db, 'feedback'), {
      userId:      hashedId,
      scenario:    data.scenario    || 'unknown',
      date:        new Date().toISOString().split('T')[0],
      turn:        data.turn        ?? 0,
      rating:      data.rating,     // 'up' | 'down'
      msgSnippet:  (data.msgSnippet || '').slice(0, 80),
      timestamp:   serverTimestamp(),
    });
  } catch (err) {
    console.warn('[feedback] Failed to log:', err.message);
  }
}

// ─── Safety Event Logging ───────────────────────────────────
// Records when any safety layer fires — category + layer only, no message text

export async function logSafetyEvent(uid, data) {
  if (!db) return;
  try {
    const hashedId = await hashUserId(uid);
    await addDoc(collection(db, 'safetyEvents'), {
      userId:    hashedId,
      scenario:  data.scenario  || 'unknown',
      layer:     data.layer     ?? 1,       // 1 | 2 | 3
      category:  data.category  || 'unknown',
      inputLen:  data.inputLen  ?? 0,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[safety] Failed to log event:', err.message);
  }
}

// ─── Custom hook wrapper ────────────────────────────────────

export function useFirestore() {
  return {
    saveUserProfile:      useCallback(saveUserProfile, []),
    getUserProfile:       useCallback(getUserProfile, []),
    saveConversation:     useCallback(saveConversation, []),
    getConversations:     useCallback(getConversations, []),
    saveAnchorSummary:    useCallback(saveAnchorSummary, []),
    getAnchorSummary:     useCallback(getAnchorSummary, []),
    saveDailySummary:     useCallback(saveDailySummary, []),
    getRecentSummaries:   useCallback(getRecentSummaries, []),
    saveLearnedFacts:     useCallback(saveLearnedFacts, []),
    getLearnedFacts:      useCallback(getLearnedFacts, []),
    saveWeeklySummary:    useCallback(saveWeeklySummary, []),
    getWeeklySummaries:   useCallback(getWeeklySummaries, []),
    logAnalyticsTurn:     useCallback(logAnalyticsTurn, []),
    logFeedback:          useCallback(logFeedback, []),
    logSafetyEvent:       useCallback(logSafetyEvent, []),
  };
}

export default useFirestore;
