// sw.js — ROOMI Service Worker for push notifications and background scheduling
// Handles push events from the server and schedules daily check-ins

const CACHE_VERSION = 'roomi-v1';

// ── Install & Activate ──────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Push event (from server-side FCM) ───────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '🦊 ROOMI', body: event.data.text() };
  }

  const options = {
    body: data.body || 'ROOMI is thinking of you 🦊',
    icon: '/roomi-prototype/roomi-favicon.svg',
    badge: '/roomi-prototype/roomi-favicon.svg',
    tag: data.tag || 'roomi-push',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/roomi-prototype/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🦊 ROOMI', options)
  );
});

// ── Notification click ───────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/roomi-prototype/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes('roomi-prototype') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Background sync for daily check-ins ─────────────────────
// Triggered by the app to schedule next day's reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'roomi-daily-checkin') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const now = new Date();
  const hour = now.getHours();

  let notification;
  if (hour >= 6 && hour < 11) {
    notification = {
      title: '🦊 Good morning from ROOMI!',
      body: "Ready to start your day? Let's check in! 🌅",
      tag: 'roomi-morning',
    };
  } else if (hour >= 11 && hour < 15) {
    notification = {
      title: '🦊 Midday check-in',
      body: "How's your day going? ROOMI is here 😊",
      tag: 'roomi-midday',
    };
  } else if (hour >= 17 && hour < 21) {
    notification = {
      title: '🦊 Evening wrap-up',
      body: "How did today go? Share how you're feeling 🌙",
      tag: 'roomi-evening',
    };
  }

  if (notification) {
    await self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/roomi-prototype/roomi-favicon.svg',
      badge: '/roomi-prototype/roomi-favicon.svg',
      tag: notification.tag,
      renotify: true,
      data: { url: '/roomi-prototype/' },
    });
  }
}
