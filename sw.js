// sw.js (Service Worker)
const CACHE_NAME = 'mytool-cache-v1';
const TIMEOUT = 3000; // 3秒超时

// 安装时，什么都不做，只是激活
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 激活时，接管控制权，清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            );
        }).then(() => self.clients.claim())
    );
});

// 添加超时机制的 fetch 包装函数
function fetchWithTimeout(request, timeout) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), timeout)
        )
    ]);
}

// 核心逻辑：网络优先（Network First）+ 超时保护
// 如果网络请求超时或失败，立即从缓存读取，保证 App 永远秒开
self.addEventListener('fetch', (event) => {
    // 只拦截 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetchWithTimeout(event.request, TIMEOUT)
            .then((response) => {
                // 如果请求成功，把新版本存入缓存
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 如果断网、超时或异常，从缓存中读取
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // 如果缓存也没有，返回离线页面或错误
                        return new Response('离线状态，无缓存可用', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});
