// Drivo LK — Service Worker for Push Notifications
const CACHE_NAME = 'drivo-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'Drivo', body: e.data.text() }; }

  const title   = data.title || 'Drivo LK';
  const options = {
    body:    data.body || 'You have a new notification',
    icon:    '/icon-192.png',
    badge:   '/icon-72.png',
    image:   data.image || null,
    tag:     data.tag || 'drivo-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      bookingId: data.bookingId || null,
    },
    actions: data.actions || [],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If drivo tab open, focus it
      for (const client of clientList) {
        if (client.url.includes('thedrivo.com') && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});