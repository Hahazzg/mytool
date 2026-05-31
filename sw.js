// sw.js (Service Worker)
const CACHE_NAME = 'mytool-cache-v1';

// 安装时，什么都不做，只是激活
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 激活时，接管控制权
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// 核心逻辑：网络优先（Network First）。
// 只要有网，就去服务器拉取最新代码；如果没网（或遇到返回卡死），就从缓存读取，保证 App 永远秒开。
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 如果请求成功，把新版本存入缓存
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // 如果断网或者遇到异常（比如返回键导致的生命周期错乱），从缓存中读取
                return caches.match(event.request);
            })
    );
});
