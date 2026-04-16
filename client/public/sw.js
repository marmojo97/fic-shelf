/**
 * Archivd Service Worker
 * Handles PWA share target and basic caching.
 */

const CACHE_NAME = 'archivd-v2';
const STATIC_ASSETS = ['/', '/shelf', '/stats', '/reclists'];

// Install — cache shell
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Handle share target: GET /share-target?url=...
  if (url.pathname === '/share-target') {
    const sharedUrl = url.searchParams.get('url') || url.searchParams.get('text') || '';
    const sharedTitle = url.searchParams.get('title') || '';

    e.respondWith(
      (async () => {
        // Store shared URL in IndexedDB / pass to app via client
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'SHARE_TARGET', url: sharedUrl, title: sharedTitle });
        }

        // Redirect to shelf with shared data
        const redirectUrl = `/shelf?shared_url=${encodeURIComponent(sharedUrl)}&shared_title=${encodeURIComponent(sharedTitle)}`;
        return Response.redirect(redirectUrl, 303);
      })()
    );
    return;
  }

  // API calls — always network
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Everything else — network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || fetch(e.request)))
  );
});
