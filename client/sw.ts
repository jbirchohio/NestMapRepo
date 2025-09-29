/// <reference lib="WebWorker" />
// eslint-disable-next-line no-restricted-globals
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setDefaultHandler, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Immediately take control
self.skipWaiting();
clientsClaim();

// Precache app shell and build assets
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Navigation requests: network-first with offline fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 5,
  })
);

setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    return caches.match('/offline.html');
  }
  return Response.error();
});

// Static assets: CSS/JS/fonts/images
registerRoute(
  ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'assets-cache' })
);

// Mapbox API: SWR
registerRoute(
  ({ url }) => url.origin === 'https://api.mapbox.com',
  new StaleWhileRevalidate({ cacheName: 'mapbox-cache' })
);

// API GET: NetworkFirst with cache fallback (read-only offline)
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
);

// Background Sync for writes (POST/PUT/PATCH/DELETE) to core resources
const writePlugins = [
  new BackgroundSyncPlugin('writes-queue', { maxRetentionTime: 24 * 60 }),
];

const writeMatcher = ({ url, request }: { url: URL; request: Request }) => {
  if (!url.pathname.startsWith('/api/')) return false;
  const m = request.method;
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
};

registerRoute(writeMatcher, new NetworkOnly({ plugins: writePlugins }), 'POST');
registerRoute(writeMatcher, new NetworkOnly({ plugins: writePlugins }), 'PUT');
registerRoute(writeMatcher, new NetworkOnly({ plugins: writePlugins }), 'PATCH');
registerRoute(writeMatcher, new NetworkOnly({ plugins: writePlugins }), 'DELETE');

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  const data = (() => {
    try { return event.data!.json(); } catch { return { title: 'Remvana', body: event.data!.text() }; }
  })();
  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/assets/icon/icon-192.png',
    badge: data.badge || '/assets/icon/icon-128.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: !!data.requireInteraction,
    tag: data.tag || 'remvana',
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Remvana', options));
});

// Notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data && (event.notification.data as any).url) || event.action || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ((client as WindowClient).url === target && 'focus' in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : Promise.resolve();
    })
  );
});

// Allow skip waiting via message
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

