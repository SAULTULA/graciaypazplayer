/* ==================================================================
   RADIO GRACIA Y PAZ — Service Worker
   Cachea los archivos base para funcionamiento offline.
   El stream de audio NUNCA se cachea (siempre en vivo).
   ================================================================== */

const CACHE_NAME = 'graciaypaz-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/pwa.js',
  './image/logo.png',
  './image/icon-192.png',
  './image/icon-512.png',
  './image/ksm.png'
];

// -------- INSTALL: precachear --------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // addAll falla completo si UN solo archivo falta.
        // Usamos Promise.allSettled para que falle solo el que no exista.
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn('⚠️ No se pudo cachear:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// -------- ACTIVATE: limpiar cachés viejos --------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// -------- FETCH: estrategia --------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones que no sean GET (POST, etc.)
  if (event.request.method !== 'GET') return;

  // 1. Stream de audio, Zeno API, iTunes, WhatsApp → siempre red, sin caché
  if (
    url.hostname.includes('zeno.fm') ||
    url.hostname.includes('itunes.apple.com') ||
    url.hostname.includes('wa.me') ||
    url.hostname.includes('ksmservicios.com.ar') ||
    event.request.destination === 'audio'
  ) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // 2. Archivos locales → network-first para HTML, cache-first para el resto
  if (url.origin === self.location.origin) {
    const isHTML =
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/');

    if (isHTML) {
      // HTML: intentar red primero (para detectar cambios), fallback a caché
      event.respondWith(
        fetch(event.request)
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            return response;
          })
          .catch(() =>
            caches.match(event.request).then(c => c || caches.match('./index.html'))
          )
      );
      return;
    }

    // Assets (CSS, JS, imágenes): cache-first
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Otros recursos externos → red normal
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  );
});