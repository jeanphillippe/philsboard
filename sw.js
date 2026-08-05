/* Service worker de PHILS BORD.
   Estrategia: el "cascarón" de la app (index, manifest, íconos) se precachea
   en la instalación; todo lo demás (fuentes de Google, favicons de links)
   se sirve cache-first y se va guardando la primera vez que llega de la red.
   Los datos del tablero viven en localStorage, así que no pasan por acá.
   Para publicar una versión nueva del index: subí el número de VERSION. */
const VERSION = 'v1';
const SHELL_CACHE = 'philsbord-shell-' + VERSION;
const RUNTIME_CACHE = 'philsbord-runtime';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-512-maskable.png',
               './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('philsbord-shell-') && k !== SHELL_CACHE)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.url.includes('index.html') }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        // Se guardan respuestas válidas (incluidas opacas: fuentes, favicons)
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        // Sin red y sin cache: si era navegación, devolver el index
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
