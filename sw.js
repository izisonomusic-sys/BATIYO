/* BATIYO — Service worker (PWA, #162)
   Met en cache les fichiers de l'application pour que l'interface reste
   disponible hors connexion. Les données, elles, sont déjà locales. */
const CACHE = 'batiyo-v2';
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
  './src/19-app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const supabaseSdk = /cdn\.jsdelivr\.net$/.test(url.hostname) && /@supabase\/supabase-js/.test(url.pathname);
  if (!sameOrigin && !supabaseSdk) return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
        }
        return res;
      }).catch(() => sameOrigin ? caches.match('./index.html') : Response.error());
    })
  );
});
