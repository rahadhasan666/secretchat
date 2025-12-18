// Service Worker for PWA and push notifications
const CACHE_NAME = 'dark-world-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/animations.css',
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/chat.js',
    '/js/notifications.js',
    '/js/ui.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (error) {
        console.error('Push event data parsing failed:', error);
        data = {
            notification: {
                title: 'Dark World',
                body: 'New message received'
            }
        };
    }

    const options = {
        body: data.notification?.body || 'New message',
        icon: data.notification?.icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'dark-world-chat',
        data: data.data || {},
        vibrate: [200, 100, 200],
        renotify: true,
        silent: false
    };

    event.waitUntil(
        self.registration.showNotification(
            data.notification?.title || 'Dark World Chat',
            options
        )
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const payload = event.notification.data;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('chat-dashboard.html') && 'focus' in client) {
                        client.focus();
                        
                        // Send message to client to open specific chat
                        if (payload.chatId) {
                            client.postMessage({
                                type: 'OPEN_CHAT',
                                chatId: payload.chatId
                            });
                        }
                        return;
                    }
                }
                
                // If no window is open, open a new one
                if (clients.openWindow) {
                    const url = payload.chatId 
                        ? `/chat-dashboard.html?chat=${payload.chatId}`
                        : '/chat-dashboard.html';
                    return clients.openWindow(url);
                }
            })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});