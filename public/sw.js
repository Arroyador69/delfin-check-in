// Version bump para invalidar caché y forzar actualización en clientes
const CACHE_NAME = 'delfin-checkin-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/next.svg',
  '/vercel.svg'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cachear recursos uno por uno para manejar errores individualmente
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('Cache installation completed');
      })
      .catch(err => {
        console.error('Cache installation failed:', err);
      })
  );
  // Activación inmediata de la nueva versión
  self.skipWaiting();
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
  // Tomar control de las páginas abiertas
  self.clients.claim();
});

// === Cola offline para /api/partes ===
const OUTBOX_DB = 'dci-outbox-db';
const OUTBOX_STORE = 'outbox';
const KEY_STORE = 'keys';
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 5000; // 5s, exponencial
const PURGE_DAYS = 7; // purga automática

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
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

// === Cifrado en reposo de payloads (AES-GCM) ===
async function getOrCreateQueueKey() {
  const db = await idbOpen();
  const keyId = 'queueKey';
  // intentar leer
  const existing = await new Promise((resolve) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).get(keyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (existing && existing.raw) {
    const raw = base64ToBytes(existing.raw);
    return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  const record = { id: keyId, raw: bytesToBase64(raw) };
  await new Promise((resolve) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).put(record);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(true);
  });
  return key;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encryptPayload(obj) {
  const key = await getOrCreateQueueKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return { cipher: bytesToBase64(cipher), iv: bytesToBase64(iv) };
}

async function decryptPayload(record) {
  const key = await getOrCreateQueueKey();
  const iv = base64ToBytes(record.iv);
  const cipher = base64ToBytes(record.cipher);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher));
  return JSON.parse(new TextDecoder().decode(plain));
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
        const enc = await encryptPayload(body);
        await idbSave(OUTBOX_STORE, { id, ...enc, ts: Date.now(), url: url.pathname, method: 'POST', retry: 0, nextAt: Date.now() });
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
      // purga automática por antigüedad
      if (item.ts && (now - item.ts) > PURGE_DAYS * 24 * 60 * 60 * 1000) {
        await idbDelete(OUTBOX_STORE, item.id);
        continue;
      }
      if (item.nextAt && item.nextAt > now) {
        continue; // aún no toca reintentar
      }
      const target = item.url || '/api/partes';
      const method = item.method || 'POST';
      const body = await decryptPayload(item);
      const res = await fetch(target, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    icon: '/next.svg',
    badge: '/vercel.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/next.svg'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/next.svg'
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
        // no devolver el cipher/iv completo por seguridad; solo metadatos
        reply({ type: 'OUTBOX_LIST_RESULT', items: items.map(i => ({ id: i.id, url: i.url, method: i.method, ts: i.ts, retry: i.retry, nextAt: i.nextAt })) });
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
              const body = await decryptPayload(item);
              const res = await fetch(target, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
