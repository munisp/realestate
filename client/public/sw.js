/**
 * NaijaProp Platform — Production Service Worker
 * Strategy: Cache-First for static assets, Network-First for API, Stale-While-Revalidate for listings
 * Covers: App shell, property listings, map tiles, images, offline fallback
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `naijaprop-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `naijaprop-dynamic-${CACHE_VERSION}`;
const LISTINGS_CACHE = `naijaprop-listings-${CACHE_VERSION}`;
const MAP_TILE_CACHE = `naijaprop-maptiles-${CACHE_VERSION}`;
const IMAGE_CACHE = `naijaprop-images-${CACHE_VERSION}`;

// App shell — critical resources cached on install
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Max entries per cache
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 100,
  [LISTINGS_CACHE]: 200,
  [MAP_TILE_CACHE]: 500,
  [IMAGE_CACHE]: 150,
};

// ─────────────────────────────────────────────
// Install — cache app shell
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing NaijaProp Service Worker', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('[SW] Failed to cache some shell resources:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────
// Activate — clean old caches
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating NaijaProp Service Worker', CACHE_VERSION);
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, LISTINGS_CACHE, MAP_TILE_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !validCaches.includes(k)).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

function isApiRequest(url) {
  return url.pathname.includes('/api/') || url.pathname.includes('/trpc/');
}

function isMapTile(url) {
  return url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('tiles.mapbox') ||
    url.hostname.includes('mt0.google') ||
    url.pathname.includes('/tiles/');
}

function isPropertyImage(url) {
  return (url.pathname.includes('/property') || url.hostname.includes('cloudinary') ||
    url.hostname.includes('amazonaws') || url.hostname.includes('supabase')) &&
    /\.(jpg|jpeg|png|webp|avif)$/i.test(url.pathname);
}

function isPropertyListing(url) {
  return url.pathname.includes('/api/trpc/property') ||
    url.pathname.includes('/api/trpc/search') ||
    url.pathname.includes('/api/trpc/listing');
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|ico)$/i.test(url.pathname);
}

// ─────────────────────────────────────────────
// Fetch — routing strategies
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // ── Map tiles: Cache-First (long TTL) ──
  if (isMapTile(url)) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
            limitCacheSize(MAP_TILE_CACHE, CACHE_LIMITS[MAP_TILE_CACHE]);
          }
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Property images: Cache-First ──
  if (isPropertyImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
            limitCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
          }
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Property listings: Stale-While-Revalidate ──
  if (isPropertyListing(url)) {
    event.respondWith(
      caches.open(LISTINGS_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) {
            cache.put(event.request, response.clone());
            limitCacheSize(LISTINGS_CACHE, CACHE_LIMITS[LISTINGS_CACHE]);
          }
          return response;
        }).catch(() => null);

        // Return cached immediately, update in background
        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }
        return networkFetch || caches.match('/offline.html');
      })
    );
    return;
  }

  // ── Other API requests: Network-First ──
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, response.clone());
            limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
          });
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response(
          JSON.stringify({ error: 'Offline', message: 'No network connection. Showing cached data.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // ── Static assets (JS, CSS, fonts): Cache-First ──
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── HTML navigation: Network-First with offline fallback ──
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Return the app shell for SPA navigation
        const appShell = await caches.match('/');
        return appShell || caches.match('/offline.html');
      })
    );
    return;
  }

  // ── Default: Network with dynamic cache fallback ──
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, response.clone());
          limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
        });
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// ─────────────────────────────────────────────
// Background Sync — queue failed API mutations
// ─────────────────────────────────────────────
const SYNC_QUEUE = 'naijaprop-sync-queue';

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(processSyncQueue());
  }

  if (event.tag === 'sync-notifications') {
    event.waitUntil(Promise.resolve());
  }
});

async function processSyncQueue() {
  const db = await openSyncDB();
  const pending = await db.getAll('pending-actions');
  console.log(`[SW] Processing ${pending.length} pending actions`);

  for (const action of pending) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });
      if (response.ok) {
        await db.delete('pending-actions', action.id);
        console.log('[SW] Synced action:', action.id);
      }
    } catch (err) {
      console.warn('[SW] Failed to sync action:', action.id, err);
    }
  }
}

// Minimal IndexedDB wrapper for sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('naijaprop-sw', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => {
      const db = e.target.result;
      resolve({
        getAll: (store) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        delete: (store, key) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).delete(key);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
      });
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────
// Push Notifications (preserved from original)
// ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  const title = data.title || 'NaijaProp';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    data: data.data || {},
    tag: data.data?.propertyId ? `property-${data.data.propertyId}` : 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  if (data.data?.notificationType === 'new_message') {
    options.actions = [
      { action: 'view', title: 'View Message' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (data.data?.notificationType === 'property_alert') {
    options.actions = [
      { action: 'view', title: 'View Property' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (data.data?.notificationType === 'offer_update') {
    options.actions = [
      { action: 'view', title: 'View Offer' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  if (event.action === 'dismiss') return;

  let url = '/';
  if (data.url) url = data.url;
  else if (data.propertyId) url = `/property/${data.propertyId}`;
  else if (data.messageId) url = `/messages`;
  else if (data.offerId) url = `/offers`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus().then(c => c.navigate && c.navigate(url));
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );

  if (data.notificationId) {
    fetch('/api/trpc/push.logClick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: data.notificationId }),
    }).catch(() => {});
  }
});

self.addEventListener('notificationclose', () => {});

// ─────────────────────────────────────────────
// Message channel — client communication
// ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0]?.postMessage({ type: 'CACHE_STATS', stats });
    });
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
      event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

async function getCacheStats() {
  const keys = await caches.keys();
  const stats = {};
  for (const key of keys) {
    const cache = await caches.open(key);
    const entries = await cache.keys();
    stats[key] = entries.length;
  }
  return stats;
}

console.log('[SW] NaijaProp Service Worker loaded — Version', CACHE_VERSION);
