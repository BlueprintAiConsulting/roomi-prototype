// usePushNotifications.js — Web Push notification hook for ROOMI
// Uses Service Worker for persistent background notifications (survives tab close)
// Falls back to local setTimeout-based notifications if SW unavailable

import { useState, useEffect, useCallback } from 'react';
import { db, doc, setDoc, serverTimestamp } from '../firebase.js';

// Default daily check-in schedule (local time hours)
const ROOMI_SCHEDULE = [
  {
    id: 'morning',
    hour: 9,
    minute: 0,
    title: '🦊 Good morning from ROOMI!',
    body: "Ready to start your day? Let's check in! 🌅",
  },
  {
    id: 'midday',
    hour: 12,
    minute: 30,
    title: '🦊 Midday check-in',
    body: "How's your day going? ROOMI is here if you need anything 😊",
  },
  {
    id: 'evening',
    hour: 19,
    minute: 0,
    title: '🦊 Evening wrap-up',
    body: "How did today go? Share how you're feeling with ROOMI 🌙",
  },
];

// ── Service Worker registration ──────────────────────────────
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}sw.js`,
      { scope: import.meta.env.BASE_URL }
    );
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
    return null;
  }
}

// ── Save token to Firestore ──────────────────────────────────
async function saveFcmToken(uid, token) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, 'fcmTokens', uid), {
      token,
      uid,
      platform: 'web',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving FCM token:', err);
  }
}

// ── Fallback: setTimeout-based local notifications ───────────
// Used when Service Worker is unavailable (e.g., dev/HTTP)
function scheduleLocalNotification({ id, hour, minute, title, body }) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  if (target <= now) target.setDate(target.getDate() + 1);

  const msUntil = target.getTime() - now.getTime();

  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}roomi-favicon.svg`,
        badge: `${import.meta.env.BASE_URL}roomi-favicon.svg`,
        tag: `roomi-${id}`,
        renotify: true,
      });
      notification.onclick = () => { window.focus(); notification.close(); };
    }
    // Re-schedule for next day
    scheduleLocalNotification({ id, hour, minute, title, body });
  }, msUntil);

  return timeoutId;
}

// ── Schedule via Service Worker using showNotification ───────
async function scheduleViaServiceWorker(swReg) {
  // Register periodic sync if browser supports it (Chrome + HTTPS only)
  if ('periodicSync' in swReg) {
    try {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await swReg.periodicSync.register('roomi-daily-checkin', {
          minInterval: 8 * 60 * 60 * 1000, // 8 hours
        });
        console.log('[SW] Periodic sync registered');
        return true;
      }
    } catch (err) {
      console.warn('[SW] Periodic sync not available:', err);
    }
  }
  return false;
}

// ── Main hook ────────────────────────────────────────────────
export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [isScheduled, setIsScheduled] = useState(false);
  const [swReg, setSwReg] = useState(null);

  // Register SW on mount
  useEffect(() => {
    registerServiceWorker().then(reg => {
      if (reg) setSwReg(reg);
    });
  }, []);

  // Request permission + schedule
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Try SW periodic sync first, fall back to setTimeout
        let usedSW = false;
        if (swReg) {
          usedSW = await scheduleViaServiceWorker(swReg);
        }
        if (!usedSW) {
          ROOMI_SCHEDULE.forEach(scheduleLocalNotification);
        }
        setIsScheduled(true);

        // Save token for future server-side FCM
        if (userId) {
          await saveFcmToken(userId, `web-local-${userId}-${Date.now()}`);
        }
      }

      return result;
    } catch (err) {
      console.error('Push notification error:', err);
      return 'denied';
    }
  }, [userId, swReg]);

  // Send immediate test notification
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== 'granted') return;

    const options = {
      body: "Daily check-ins are now active. You'll hear from me soon! ✨",
      icon: `${import.meta.env.BASE_URL}roomi-favicon.svg`,
      tag: 'roomi-test',
    };

    // Use SW if available (more reliable)
    if (swReg) {
      await swReg.showNotification('🦊 ROOMI is watching out for you!', options);
    } else {
      new Notification('🦊 ROOMI is watching out for you!', options);
    }
  }, [swReg]);

  // Crisis alert (shown immediately, requires interaction)
  const sendCrisisAlert = useCallback(async (residentName) => {
    if (Notification.permission !== 'granted') return;

    const options = {
      body: `${residentName || 'Your resident'} may need support. Check in now.`,
      icon: `${import.meta.env.BASE_URL}roomi-favicon.svg`,
      tag: 'roomi-crisis',
      requireInteraction: true,
    };

    if (swReg) {
      await swReg.showNotification('🚨 ROOMI Safety Alert', options);
    } else {
      new Notification('🚨 ROOMI Safety Alert', options);
    }
  }, [swReg]);

  // Auto-schedule when already granted (page reload)
  useEffect(() => {
    if (permission === 'granted' && !isScheduled) {
      if (swReg) {
        scheduleViaServiceWorker(swReg).then(usedSW => {
          if (!usedSW) ROOMI_SCHEDULE.forEach(scheduleLocalNotification);
          setIsScheduled(true);
        });
      } else {
        ROOMI_SCHEDULE.forEach(scheduleLocalNotification);
        setIsScheduled(true);
      }
    }
  }, [permission, isScheduled, swReg]);

  return {
    permission,
    isSupported: typeof Notification !== 'undefined',
    isGranted: permission === 'granted',
    isScheduled,
    requestPermission,
    sendTestNotification,
    sendCrisisAlert,
    schedule: ROOMI_SCHEDULE,
  };
}

export default usePushNotifications;
