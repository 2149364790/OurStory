/// <reference types="vite-plugin-pwa/client" />
/// <reference lib="WebWorker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// ─── Workbox 自动注入预缓存清单 ──────────────────────────────────────
// __WB_MANIFEST 由 vite-plugin-pwa 在构建时自动替换为打包后所有静态资源的哈希清单。
// 这样每次 build 后 Service Worker 会自动感知到变更，无需手动维护缓存列表。
precacheAndRoute(self.__WB_MANIFEST);

// 清理旧版本 Workbox 产生的过时缓存
cleanupOutdatedCaches();

// ─── Supabase 媒体图片：缓存优先（Cache First）策略 ─────────────────
const MEDIA_CACHE = 'couplespace-media-cache-v1';

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 仅处理 Supabase 媒体存储的图片请求
  if (url.includes('.supabase.co/storage/v1/object/public/media/')) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res && res.status === 200) {
              cache.put(event.request, res.clone());
            }
            return res;
          });
        })
      )
    );
  }
  // 其余请求（Supabase API、外部资源等）交给浏览器默认处理
});

// ─── 跳过等待，立即激活新 SW ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── PWA 推送通知 ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data: { title: string; body: string; url: string } = {
    title: '收到新动态 💖',
    body: '伴侣有新的动静，快去看看吧！',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: '收到新动态 💖', body: event.data.text(), url: '/' };
    }
  }

  const options = {
    body: data.body,
    icon: '/couplespace_app_icon.png',
    badge: '/couplespace_app_icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── 点击通知：唤起或跳转应用 ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl: string = (event.notification.data as any)?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
