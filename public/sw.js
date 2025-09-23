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
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 5000; // 5s, exponencial

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
  const url = new URL(event.request.url);
  const isEligiblePost = event.request.method === 'POST' && (
    url.pathname === '/api/partes' ||
    url.pathname === '/api/export/pv'
  );
  if (!isEligiblePost) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(event.request.clone());
      if (!res.ok) throw new Error('Server error');
      return res;
    } catch (e) {
      try {
        const body = await event.request.clone().json();
        const id = (body && body.id) || (self.crypto?.randomUUID ? self.crypto.randomUUID() : String(Date.now()));
        await idbSave(OUTBOX_STORE, { id, body, ts: Date.now(), url: url.pathname, method: 'POST', retry: 0, nextAt: Date.now() });
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function flushOutbox() {
  const now = Date.now();
  const items = await idbAll(OUTBOX_STORE);
  for (const item of items) {
    try {
      if (item.nextAt && item.nextAt > now) {
        continue; // aún no toca reintentar
      }
      const target = item.url || '/api/partes';
      const method = item.method || 'POST';
      const res = await fetch(target, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) });
      if (res.ok) {
        await idbDelete(OUTBOX_STORE, item.id);
      } else {
        const retry = (item.retry || 0) + 1;
        const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, retry - 1), 5 * 60 * 1000); // máx 5 min
        const nextAt = Date.now() + backoff;
        const updated = { ...item, retry, nextAt };
        if (retry <= MAX_RETRIES) {
          await idbSave(OUTBOX_STORE, updated);
        }
        await sleep(250); // evitar ráfagas
      }
    } catch {
      const retry = (item.retry || 0) + 1;
      const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, retry - 1), 5 * 60 * 1000);
      const nextAt = Date.now() + backoff;
      const updated = { ...item, retry, nextAt };
      if (retry <= MAX_RETRIES) {
        await idbSave(OUTBOX_STORE, updated);
      }
      await sleep(250);
    }
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

// Mensajería para panel de cola offline
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const source = event.source;
  const reply = (payload) => {
    try { source && source.postMessage(payload); } catch {}
  };
  (async () => {
    switch (data.type) {
      case 'OUTBOX_LIST': {
        const items = await idbAll(OUTBOX_STORE);
        reply({ type: 'OUTBOX_LIST_RESULT', items });
        break;
      }
      case 'OUTBOX_DELETE': {
        if (data.id) {
          await idbDelete(OUTBOX_STORE, data.id);
          reply({ type: 'OUTBOX_DELETE_OK', id: data.id });
        }
        break;
      }
      case 'OUTBOX_FLUSH': {
        await flushOutbox();
        const items = await idbAll(OUTBOX_STORE);
        reply({ type: 'OUTBOX_FLUSH_DONE', remaining: items.length });
        break;
      }
      case 'OUTBOX_RESEND_ONE': {
        if (data.id) {
          const items = await idbAll(OUTBOX_STORE);
          const item = items.find((i) => i.id === data.id);
          if (item) {
            try {
              const target = item.url || '/api/partes';
              const method = item.method || 'POST';
              const res = await fetch(target, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) });
              if (res.ok) {
                await idbDelete(OUTBOX_STORE, item.id);
                reply({ type: 'OUTBOX_RESEND_OK', id: item.id });
              } else {
                reply({ type: 'OUTBOX_RESEND_FAIL', id: item.id, status: res.status });
              }
            } catch (e) {
              reply({ type: 'OUTBOX_RESEND_FAIL', id: item.id, error: String(e) });
            }
          }
        }
        break;
      }
      default:
        break;
    }
  })();
});
