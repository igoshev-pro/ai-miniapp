/* SPICHKI AI — service worker.
 * Задача минимальная: сделать приложение устанавливаемым (PWA) и не мешать
 * работе. API и сокеты живут на другом origin — их SW не трогает.
 * Стратегии:
 *   /_next/static/*  — cache-first (файлы с хешем, не меняются)
 *   navigate         — network-first, при офлайне отдаём закешированную оболочку
 *   картинки/иконки  — stale-while-revalidate
 */
const VERSION = 'spichki-v1'
const SHELL = ['/', '/start', '/manifest.webmanifest', '/logo.png', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(req, copy))
            return res
          }),
      ),
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    )
    return
  }

  if (req.destination === 'image' || req.destination === 'font' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((hit) => {
          const network = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone())
              return res
            })
            .catch(() => hit)
          return hit || network
        }),
      ),
    )
  }
})
