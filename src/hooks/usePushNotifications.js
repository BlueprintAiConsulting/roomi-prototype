// usePushNotifications.js — FCM-powered Web Push for ROOMI Founder Hub
// Handles: permission, FCM token storage, foreground messages, Hub event dispatching

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  db, messaging,
  doc, setDoc, getDoc, serverTimestamp,
  getToken, onMessage,
} from '../firebase.js';

// ─── Config ─────────────────────────────────────────────────
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const BASE_URL  = import.meta.env.BASE_URL || '/';

// Hub event types that trigger notifications
export const HUB_EVENT = {
  CHAT_MESSAGE:  'chat_message',
  ACTION_ITEM:   'action_item',
  DECISION:      'decision',
  MEETING:       'meeting',
  DOCUMENT:      'document',
  PILOT:         'pilot',
  FUNDING:       'funding',
};

// ─── Save FCM token to Firestore ─────────────────────────────
async function saveFcmToken(uid, token) {
  if (!db || !uid || !token) return;
  try {
    await setDoc(
      doc(db, 'fcmTokens', uid),
      { token, uid, platform: 'web', updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.error('[FCM] Error saving token:', err);
  }
}

// ─── Get stored notification prefs ───────────────────────────
async function loadNotifPrefs(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'notifPrefs', uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

async function saveNotifPrefs(uid, prefs) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, 'notifPrefs', uid), { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error('[FCM] Error saving prefs:', err);
  }
}

// ─── Default notification preferences ────────────────────────
export const DEFAULT_NOTIF_PREFS = {
  chat_message: true,
  action_item:  true,
  decision:     true,
  meeting:      true,
  document:     false,
  pilot:        false,
  funding:      true,
  // Quiet hours (24-hour local time)
  quietStart:   22, // 10 PM
  quietEnd:     8,  // 8 AM
};

// ─── Check quiet hours ────────────────────────────────────────
function isQuietHours(prefs) {
  const { quietStart, quietEnd } = prefs || DEFAULT_NOTIF_PREFS;
  const h = new Date().getHours();
  if (quietStart > quietEnd) return h >= quietStart || h < quietEnd; // spans midnight
  return h >= quietStart && h < quietEnd;
}

// ─── Show local notification ──────────────────────────────────
async function showLocalNotification(swReg, { title, body, tag, url, icon, requireInteraction }) {
  const opts = {
    body,
    icon:    icon || `${BASE_URL}roomi-favicon.svg`,
    badge:   `${BASE_URL}roomi-favicon.svg`,
    tag:     tag || 'roomi-hub',
    renotify: true,
    requireInteraction: requireInteraction || false,
    data:    { url: url || `${BASE_URL}` },
    // Action buttons
    actions: [
      { action: 'open', title: 'Open Hub' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  if (swReg) {
    await swReg.showNotification(title, opts);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); n.close(); };
  }
}

// ─── Register Service Worker ──────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // FCM requires firebase-messaging-sw.js at the root scope
    const reg = await navigator.serviceWorker.register(
      `${BASE_URL}firebase-messaging-sw.js`,
      { scope: BASE_URL }
    );
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[SW] Registration failed:', err.message);
    // Fallback: try the existing sw.js
    try {
      const reg2 = await navigator.serviceWorker.register(`${BASE_URL}sw.js`, { scope: BASE_URL });
      await navigator.serviceWorker.ready;
      return reg2;
    } catch {
      return null;
    }
  }
}

// ─── Main Hook ────────────────────────────────────────────────
export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [fcmToken, setFcmToken]         = useState(null);
  const [swReg, setSwReg]               = useState(null);
  const [prefs, setPrefs]               = useState(DEFAULT_NOTIF_PREFS);
  const [prefsLoaded, setPrefsLoaded]   = useState(false);
  const [lastNotif, setLastNotif]       = useState(null); // most recent foreground message
  const unsubRef = useRef(null);

  // Register SW on mount
  useEffect(() => {
    registerSW().then(reg => { if (reg) setSwReg(reg); });
  }, []);

  // Load prefs when userId available
  useEffect(() => {
    if (!userId || prefsLoaded) return;
    loadNotifPrefs(userId).then(saved => {
      if (saved) setPrefs(p => ({ ...p, ...saved }));
      setPrefsLoaded(true);
    });
  }, [userId, prefsLoaded]);

  // Subscribe to foreground FCM messages
  useEffect(() => {
    if (!messaging) return;
    if (unsubRef.current) unsubRef.current();

    unsubRef.current = onMessage(messaging, payload => {
      console.log('[FCM] Foreground message:', payload);
      setLastNotif(payload);
      // App is in foreground — show a toast-style notification
      // (the SW handles background messages automatically)
    });

    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [messaging]);

  // ─ Request permission & get FCM token ─────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Get FCM token if messaging + VAPID key available
        if (messaging && VAPID_KEY) {
          try {
            const token = await getToken(messaging, {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: swReg || undefined,
            });
            if (token) {
              setFcmToken(token);
              await saveFcmToken(userId, token);
              console.log('[FCM] Token stored:', token.slice(0, 20) + '…');
            }
          } catch (err) {
            console.warn('[FCM] Token retrieval failed (need VAPID key):', err.message);
            // Still save a local marker so the UI reflects "enabled"
            await saveFcmToken(userId, `web-local-${userId}-${Date.now()}`);
          }
        } else {
          // No FCM — save a placeholder
          await saveFcmToken(userId, `web-local-${userId}-${Date.now()}`);
        }

        // Show confirmation notification
        await showLocalNotification(swReg, {
          title: '🔔 ROOMI Hub Notifications Enabled',
          body:  "You'll be notified about new messages, action items, and decisions.",
          tag:   'roomi-enable-confirm',
        });
      }

      return result;
    } catch (err) {
      console.error('[FCM] Permission error:', err);
      return 'denied';
    }
  }, [userId, swReg]);

  // ─ Save pref update ────────────────────────────────────────
  const updatePref = useCallback(async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (userId) await saveNotifPrefs(userId, next);
  }, [prefs, userId]);

  // ─ Dispatch Hub event notification ────────────────────────
  // Call this whenever a Hub action happens that should notify other founders
  const notifyHubEvent = useCallback(async ({
    eventType,   // HUB_EVENT.*
    title,
    body,
    url,
    tag,
    actorName,   // who triggered it
    skipIfSelf = true,
  }) => {
    // Check permission
    if (Notification.permission !== 'granted') return;

    // Check quiet hours
    if (isQuietHours(prefs)) return;

    // Check pref for this event type
    if (prefs[eventType] === false) return;

    // Optionally skip notifying yourself
    if (skipIfSelf) return; // on client side, we only notify others via FCM server-push
    // For self-notifications (foreground), always show
    await showLocalNotification(swReg, { title, body, url, tag });
  }, [swReg, prefs]);

  // ─ Notify on new chat message (call from chat components) ─
  const notifyChatMessage = useCallback(async ({ senderName, text, channelName }) => {
    if (Notification.permission !== 'granted') return;
    if (isQuietHours(prefs)) return;
    if (prefs[HUB_EVENT.CHAT_MESSAGE] === false) return;
    if (document.hasFocus()) return; // app is focused — skip native notif, show in-app

    await showLocalNotification(swReg, {
      title: `💬 ${senderName} in #${channelName || 'founders'}`,
      body:  text?.slice(0, 100) || 'New message',
      tag:   'roomi-chat',
      url:   `${BASE_URL}`,
    });
  }, [swReg, prefs]);

  // ─ Notify on new action item ────────────────────────────────
  const notifyActionItem = useCallback(async ({ creatorName, title }) => {
    if (Notification.permission !== 'granted') return;
    if (isQuietHours(prefs)) return;
    if (prefs[HUB_EVENT.ACTION_ITEM] === false) return;
    if (document.hasFocus()) return;

    await showLocalNotification(swReg, {
      title: `✅ New Action Item from ${creatorName}`,
      body:  title || 'A new task was added to the Hub.',
      tag:   'roomi-action',
      url:   `${BASE_URL}`,
    });
  }, [swReg, prefs]);

  // ─ Notify on new decision ───────────────────────────────────
  const notifyDecision = useCallback(async ({ creatorName, title }) => {
    if (Notification.permission !== 'granted') return;
    if (isQuietHours(prefs)) return;
    if (prefs[HUB_EVENT.DECISION] === false) return;
    if (document.hasFocus()) return;

    await showLocalNotification(swReg, {
      title: `📋 New Decision from ${creatorName}`,
      body:  title || 'A decision was logged in the Hub.',
      tag:   'roomi-decision',
      url:   `${BASE_URL}`,
    });
  }, [swReg, prefs]);

  // ─ Notify on new meeting ────────────────────────────────────
  const notifyMeeting = useCallback(async ({ creatorName, title, date }) => {
    if (Notification.permission !== 'granted') return;
    if (isQuietHours(prefs)) return;
    if (prefs[HUB_EVENT.MEETING] === false) return;
    if (document.hasFocus()) return;

    await showLocalNotification(swReg, {
      title: `📅 Meeting Added${date ? ` — ${date}` : ''}`,
      body:  `${creatorName} scheduled "${title || 'a new meeting'}"`,
      tag:   'roomi-meeting',
      url:   `${BASE_URL}`,
    });
  }, [swReg, prefs]);

  // ─ Crisis alert (immediate, requires interaction) ──────────
  const sendCrisisAlert = useCallback(async (message) => {
    if (Notification.permission !== 'granted') return;
    await showLocalNotification(swReg, {
      title: '🚨 ROOMI Hub Alert',
      body:  message || 'Urgent attention needed in the Founder Hub.',
      tag:   'roomi-crisis',
      requireInteraction: true,
      url:   `${BASE_URL}`,
    });
  }, [swReg]);

  // ─ Test notification ────────────────────────────────────────
  const sendTestNotification = useCallback(async () => {
    await showLocalNotification(swReg, {
      title: '🔔 Test — ROOMI Hub',
      body:  'Notifications are working! You\'ll get updates here.',
      tag:   'roomi-test',
    });
  }, [swReg]);

  return {
    // State
    permission,
    fcmToken,
    isSupported:  typeof Notification !== 'undefined',
    isGranted:    permission === 'granted',
    isDenied:     permission === 'denied',
    lastNotif,
    prefs,
    // Actions
    requestPermission,
    updatePref,
    notifyHubEvent,
    notifyChatMessage,
    notifyActionItem,
    notifyDecision,
    notifyMeeting,
    sendCrisisAlert,
    sendTestNotification,
  };
}

export default usePushNotifications;
