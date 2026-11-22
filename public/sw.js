/* Сервис-воркер «деканат*»: офлайн-доступ к последним открытым страницам (макет B2PhoneB «Нет сети»).
 * - Страницы: сначала сеть, при её отсутствии — последняя сохранённая версия.
 * - Статика сборки: из кэша (файлы с хешем в имени не меняются).
 * - API и вход не кэшируются. Кэш очищается на странице входа (выход, смена пользователя). */
const PAGES = 'pages-v1';
const STATIC = 'static-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'clear') e.waitUntil(caches.delete(PAGES));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/login')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) caches.open(PAGES).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const c = await caches.open(PAGES);
          return (
            (await c.match(req, { ignoreSearch: true })) ||
            (await c.match('/')) ||
            new Response('<meta charset="utf-8"><title>Нет сети</title><p style="font:16px system-ui;padding:24px">Нет сети. Откройте кабинет, когда связь вернётся.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }),
    );
  }
});
