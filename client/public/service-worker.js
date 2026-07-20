/**
 * NaijaHomes Service Worker v2
 * Strategies: Cache-first (assets), Network-first (API), SWR (pages)
 * Features: Offline fallback, Background Sync, Push, Periodic Sync
 */
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : Date.now().toString();
const STATIC_CACHE  = `naijahomes-static-${BUILD_VERSION}`;
const DYNAMIC_CACHE = `naijahomes-dynamic-${BUILD_VERSION}`;
const IMAGE_CACHE   = `naijahomes-images-${BUILD_VERSION}`;
const API_CACHE     = `naijahomes-api-${BUILD_VERSION}`;
const ALL_CACHES    = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];

const STATIC_ASSETS = ['/', '/offline.html', '/manifest.json'];
const NEVER_CACHE   = ['/api/oauth', '/api/webhooks'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('naijahomes-') && !ALL_CACHES.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (NEVER_CACHE.some(p => url.pathname.startsWith(p))) return;
  if (!url.protocol.startsWith('http')) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 30)); return;
  }
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithFallback(request, IMAGE_CACHE)); return;
  }
  if (['script','style','font'].includes(request.destination)) {
    event.respondWith(cacheFirstWithFallback(request, STATIC_CACHE)); return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(r => { if (r.ok) caches.open(DYNAMIC_CACHE).then(c => c.put(request, r.clone())); return r; })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html')) || new Response('Offline', { status: 503 }))
    ); return;
  }
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

async function networkFirstWithCache(req, cacheName, maxAge) {
  try {
    const r = await fetch(req);
    if (r.ok) {
      const h = new Headers(r.headers); h.set('sw-cached-at', Date.now().toString());
      caches.open(cacheName).then(c => c.put(req, new Response(r.clone().body, { status: r.status, headers: h })));
    }
    return r;
  } catch {
    const cached = await caches.match(req);
    if (cached && Date.now() - parseInt(cached.headers.get('sw-cached-at') || '0') < maxAge * 1000) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
async function cacheFirstWithFallback(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try { const r = await fetch(req); if (r.ok) caches.open(cacheName).then(c => c.put(req, r.clone())); return r; }
  catch { return new Response('', { status: 503 }); }
}
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fresh = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return cached || await fresh || new Response('', { status: 503 });
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites')      event.waitUntil(syncEndpoint('/api/trpc/properties.toggleFavorite', 'pending-favorites'));
  if (event.tag === 'sync-property-views') event.waitUntil(syncEndpoint('/api/trpc/analytics.batchPropertyViews', 'pending-views'));
  if (event.tag === 'sync-search-history') event.waitUntil(syncEndpoint('/api/trpc/analytics.batchSearchEvents', 'pending-searches'));
});

async function syncEndpoint(url, store) {
  try {
    const db = await openIDB();
    const items = await idbGetAll(db, store);
    if (!items.length) return;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    await idbClear(db, store);
  } catch (e) { console.error('[SW] Sync failed:', store, e); }
}

// ── Periodic Background Sync ──────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-alerts') event.waitUntil(checkPriceAlerts());
});

async function checkPriceAlerts() {
  try {
    const r = await fetch('/api/trpc/smartPriceAlert.checkMyAlerts');
    const data = await r.json();
    for (const alert of (data?.result?.data?.triggered || [])) {
      self.registration.showNotification('Price Alert! 🏠', {
        body: `${alert.propertyTitle} is now ₦${Number(alert.currentPrice).toLocaleString()}`,
        icon: '/icons/icon-192.png', badge: '/icons/badge-72.png',
        tag: `price-alert-${alert.propertyId}`,
        data: { url: `/property/${alert.propertyId}` },
        actions: [{ action: 'view', title: 'View Property' }, { action: 'dismiss', title: 'Dismiss' }],
        vibrate: [200, 100, 200],
      });
    }
  } catch (e) {}
}

// ── Push ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let p; try { p = event.data.json(); } catch { p = { title: 'NaijaHomes', body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(p.title || 'NaijaHomes', {
    body: p.body || '', icon: '/icons/icon-192.png', badge: '/icons/badge-72.png',
    image: p.image, tag: p.tag || 'naijahomes', renotify: true,
    data: { url: p.url || '/', ...p.data }, actions: p.actions || [], vibrate: [200, 100, 200],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url === url && 'focus' in c) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openIDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('naijahomes-sw', 1);
    r.onupgradeneeded = e => ['pending-favorites','pending-views','pending-searches'].forEach(s => {
      if (!e.target.result.objectStoreNames.contains(s)) e.target.result.createObjectStore(s, { autoIncrement: true });
    });
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
function idbGetAll(db, store) {
  return new Promise((res, rej) => { const r = db.transaction(store,'readonly').objectStore(store).getAll(); r.onsuccess = () => res(r.result||[]); r.onerror = () => rej(r.error); });
}
function idbClear(db, store) {
  return new Promise((res, rej) => { const r = db.transaction(store,'readwrite').objectStore(store).clear(); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
