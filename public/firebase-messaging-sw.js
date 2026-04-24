// firebase-messaging-sw.js — ROOMI FCM Service Worker
// This file MUST be named exactly "firebase-messaging-sw.js" and live at the
// root of the site (public/) for Firebase Cloud Messaging to work.
// GitHub Pages serves it at /roomi-prototype/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Firebase config (must match your project) ────────────────
// These are public-safe config values (no secret key here)
firebase.initializeApp({
  apiKey:            'AIzaSyBcnI6c6JZOMiu59iDpJCayf5M3-gJjaR4',
  authDomain:        'roomi-companion.firebaseapp.com',
  projectId:         'roomi-companion',
  storageBucket:     'roomi-companion.firebasestorage.app',
  messagingSenderId: '934625668511',
  appId:             '1:934625668511:web:881223b31aea4abea021aa',
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────
// Fires when app is in the background or closed
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Background message:', payload);

  const { title, body, icon, tag, url } = payload.notification || {};
  const data = payload.data || {};

  const notifTitle   = title   || data.title   || '🔔 ROOMI Hub';
  const notifBody    = body    || data.body    || 'New activity in the Founder Hub.';
  const notifIcon    = icon    || data.icon    || '/roomi-prototype/roomi-favicon.svg';
  const notifTag     = tag     || data.tag     || 'roomi-hub';
  const notifUrl     = url     || data.url     || '/roomi-prototype/';

  return self.registration.showNotification(notifTitle, {
    body:    notifBody,
    icon:    notifIcon,
    badge:   '/roomi-prototype/roomi-favicon.svg',
    tag:     notifTag,
    renotify: true,
    requireInteraction: data.requireInteraction === 'true',
    data:    { url: notifUrl },
    actions: [
      { action: 'open',    title: 'Open Hub' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
  });
});

// ── Notification click handler ────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/roomi-prototype/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing open tab if available
      for (const client of clientList) {
        if (client.url.includes('roomi-prototype') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Install & activate ────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
