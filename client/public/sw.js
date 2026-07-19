// Service Worker for Push Notifications
// This file handles push notifications when the app is in the background

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notification received
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
    return;
  }

  const title = data.title || 'Real Estate Platform';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    data: data.data || {},
    tag: data.data?.propertyId ? `property-${data.data.propertyId}` : 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  // Add action buttons based on notification type
  if (data.data?.notificationType === 'new_message') {
    options.actions = [
      { action: 'view', title: 'View Message', icon: '/icons/message.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
    ];
  } else if (data.data?.notificationType === 'property_alert') {
    options.actions = [
      { action: 'view', title: 'View Property', icon: '/icons/home.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
    ];
  } else if (data.data?.notificationType === 'offer_update') {
    options.actions = [
      { action: 'view', title: 'View Offer', icon: '/icons/document.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  // Determine URL based on notification type and data
  if (event.action === 'dismiss') {
    return;
  }

  if (data.url) {
    url = data.url;
  } else if (data.propertyId) {
    url = `/property/${data.propertyId}`;
  } else if (data.messageId) {
    url = `/messages`;
  } else if (data.offerId) {
    url = `/offers`;
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Focus existing window and navigate
          return client.focus().then((client) => {
            if ('navigate' in client) {
              return client.navigate(url);
            }
          });
        }
      }
      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );

  // Log the click (you can send this to your backend)
  if (data.notificationId) {
    fetch('/api/trpc/push.logClick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: data.notificationId,
      }),
    }).catch((err) => console.error('[Service Worker] Error logging click:', err));
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

// Handle background sync (optional - for offline support)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync any pending notification data
      Promise.resolve()
    );
  }
});
