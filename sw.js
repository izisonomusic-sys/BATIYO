/* BATIYO — Service worker PWA
   Version réseau prioritaire : récupère les dernières modifications dès qu'Internet est disponible.
   Le cache reste disponible comme secours hors connexion. */
const CACHE = 'batiyo-v29';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './src/styles.css',
  './src/01-config.js',
  './src/02-professions.js',
  './src/03-utils.js',
  './src/04-storage.js',
  './src/05-calculations.js',
  './src/06-core.js',
  './src/07-repository.js',
  './src/08-reference.js',
  './src/09-services.js',
  './src/10-assistant.js',
  './src/11-pdf.js',
  './src/13-ui.js',
  './src/14-screens-public.js',
  './src/15-shared.js',
  './src/16-screens-dashboard.js',
  './src/17-screens-docs.js',
  './src/18-screens-ops.js',
  './src/20-screens-admin.js',
  './src/19-app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(ASSETS.map((asset) =>
        fetch(new Request(asset, { cache: 'reload' }))
          .then((response) => {
            if (response && response.ok) return cache.put(asset, response);
          })
          .catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const supabaseSdk = /cdn\.jsdelivr\.net$/.test(url.hostname) && /@supabase\/supabase-js/.test(url.pathname);
  if (!sameOrigin && !supabaseSdk) return;

  // Réseau d'abord : les corrections publiées sont servies dès la prochaine requête.
  // Si le réseau est indisponible, on utilise le cache pour garder l'application accessible.
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        /* Les fichiers JS/CSS sont pré-mis en cache sans query string.
           Une URL versionnée (?v=...) doit pouvoir retrouver cette copie. */
        if (sameOrigin) {
          const cleanUrl = new URL(url.href);
          cleanUrl.search = '';
          cleanUrl.hash = '';
          return caches.match(cleanUrl.href).then((cleanCached) => {
            if (cleanCached) return cleanCached;
            if (request.mode === 'navigate' || url.pathname.endsWith('/')) {
              return caches.match('./index.html');
            }
            return Response.error();
          });
        }
        return Response.error();
      }))
  );
});
