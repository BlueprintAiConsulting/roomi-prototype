// usePushNotifications.js — Web Push notification hook for ROOMI
// Uses the Notifications API for local scheduled reminders
// Stores FCM tokens in Firestore for future server-side pushes

import { useState, useEffect, useCallback } from 'react';
import { db, doc, setDoc, serverTimestamp } from '../firebase.js';

// Default daily check-in schedule (local time hours)
const ROOMI_SCHEDULE = [
  {
    id: 'morning',
    hour: 9,
    minute: 0,
    title: '🦊 Good morning from ROOMI!',
    body: 'Ready to start your day? Let\'s check in! 🌅',
  },
  {
    id: 'midday',
    hour: 12,
    minute: 30,
    title: '🦊 Midday check-in',
    body: 'How\'s your day going? ROOMI is here if you need anything 😊',
  },
  {
    id: 'evening',
    hour: 19,
    minute: 0,
    title: '🦊 Evening wrap-up',
    body: 'How did today go? Share how you\'re feeling with ROOMI 🌙',
  },
];

// Save FCM token to Firestore for future server-side pushes
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

// Schedule a local notification at a specific time today (or tomorrow if past)
function scheduleLocalNotification({ id, hour, minute, title, body }) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  // If time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const msUntil = target.getTime() - now.getTime();

  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/roomi-prototype/roomi-favicon.svg',
        badge: '/roomi-prototype/roomi-favicon.svg',
        tag: `roomi-${id}`, // replaces previous notification of same type
        renotify: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Re-schedule for next day
    scheduleLocalNotification({ id, hour, minute, title, body });
  }, msUntil);

  return timeoutId;
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [isScheduled, setIsScheduled] = useState(false);

  // Request permission and schedule notifications
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Schedule all daily reminders
        ROOMI_SCHEDULE.forEach(scheduleLocalNotification);
        setIsScheduled(true);

        // Store token for future server-side push (stub — real FCM setup needed for SW)
        if (userId) {
          await saveFcmToken(userId, `web-local-${userId}-${Date.now()}`);
        }
      }

      return result;
    } catch (err) {
      console.error('Push notification error:', err);
      return 'denied';
    }
  }, [userId]);

  // Send an immediate test notification
  const sendTestNotification = useCallback(() => {
    if (Notification.permission !== 'granted') return;
    new Notification('🦊 ROOMI is watching out for you!', {
      body: 'Daily check-ins are now active. You\'ll hear from me soon! ✨',
      icon: '/roomi-prototype/roomi-favicon.svg',
      tag: 'roomi-test',
    });
  }, []);

  // Send a safety alert to caregiver (shown immediately)
  const sendCrisisAlert = useCallback((residentName) => {
    if (Notification.permission !== 'granted') return;
    new Notification('🚨 ROOMI Safety Alert', {
      body: `${residentName || 'Your resident'} may need support. Check in now.`,
      icon: '/roomi-prototype/roomi-favicon.svg',
      tag: 'roomi-crisis',
      requireInteraction: true, // stays until user interacts
    });
  }, []);

  // Auto-schedule when permission is already granted (page reload)
  useEffect(() => {
    if (permission === 'granted' && !isScheduled) {
      ROOMI_SCHEDULE.forEach(scheduleLocalNotification);
      setIsScheduled(true);
    }
  }, [permission, isScheduled]);

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
