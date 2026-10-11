/* KAIRO — service worker minimal : l'application fonctionne hors ligne après le premier chargement.
   Réseau d'abord pour la page, REVALIDÉE auprès du serveur (jamais le cache HTTP du navigateur : une nouvelle build
   est servie dès le rechargement) ; cache d'abord pour les fichiers versionnés (assets/, noms hachés).
   Nouveau service worker : activé immédiatement (skipWaiting + clients.claim) ; anciens caches supprimés. */
const CACHE = 'kairo-beta0-2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isAsset = new URL(req.url).pathname.includes('/assets/');
  if (isAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  // Navigation : `cache: 'no-cache'` impose la revalidation (ETag) au lieu du cache HTTP (max-age de l'hébergeur).
  const network = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);
  e.respondWith(network.then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
