const CACHE_NAME = 'delfin-checkin-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del service worker
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
});

// === Cola offline para /api/partes ===
const OUTBOX_DB = 'dci-outbox-db';
const OUTBOX_STORE = 'outbox';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSave(store, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(store) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(store, id) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('fetch', (event) => {
  const isPartesPost = event.request.url.endsWith('/api/partes') && event.request.method === 'POST';
  if (!isPartesPost) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(event.request.clone());
      if (!res.ok) throw new Error('Server error');
      return res;
    } catch (e) {
      try {
        const body = await event.request.clone().json();
        const id = (body && body.id) || (self.crypto?.randomUUID ? self.crypto.randomUUID() : String(Date.now()));
        await idbSave(OUTBOX_STORE, { id, body, ts: Date.now() });
        try { await self.registration.sync.register('dci-flush'); } catch {}
        return new Response(JSON.stringify({ queued: true, id }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }
    }
  })());
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'dci-flush') {
    event.waitUntil(flushOutbox());
  }
});

async function flushOutbox() {
  const items = await idbAll(OUTBOX_STORE);
  for (const item of items) {
    try {
      const res = await fetch('/api/partes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) });
      if (res.ok) await idbDelete(OUTBOX_STORE, item.id);
    } catch {}
  }
}

// Manejo de notificaciones push (futuro)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Delfín Check-in',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Delfín Check-in 🐬', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
