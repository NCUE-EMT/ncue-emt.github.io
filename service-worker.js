// service-worker.js

const CACHE_NAME = 'handbook-cache-v2';
const OFFLINE_URL = '/offline.html';

// 預快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/offline.html',
        '/icons/192.png',
        '/icons/512.png',
        '/icons/favicon-16x16.png',
        '/icons/favicon-32x32.png',
        '/icons/favicon-48x48.png',
        '/icons/apple-touch-icon.png',
        '/icons/android-chrome-192x192.png',
        '/icons/emt-logo-1200x630.png'
      ]);
    })
  );
  // 安裝後立即接管舊版頁面
  self.skipWaiting();
});

// 啟用階段：清理舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 攔截fetch：先快取後網路，失敗則顯示離線頁
self.addEventListener('fetch', event => {
  // 只處理同源請求
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedRes => {
      if (cachedRes) {
        // 同時向後台更新快取
        fetch(event.request).then(networkRes => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkRes));
        });
        return cachedRes;
      }
      // 沒有快取就連線網路
      return fetch(event.request)
        .then(networkRes => {
          // 成功則快取下次使用
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => {
          // 網路失敗時，若是 HTML 請求就回離線頁
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
