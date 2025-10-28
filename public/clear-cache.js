// Script para limpiar caché y forzar actualización del service worker
// Ejecutar en la consola del navegador si es necesario

console.log('🧹 Limpiando caché y actualizando service worker...');

// Limpiar todos los caches
if ('caches' in window) {
  caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        console.log('🗑️ Eliminando cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }).then(function() {
    console.log('✅ Todos los caches eliminados');
  });
}

// Desregistrar service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('🔄 Desregistrando service worker:', registration.scope);
      registration.unregister();
    }
  }).then(function() {
    console.log('✅ Service workers desregistrados');
    console.log('🔄 Recarga la página para registrar el nuevo service worker');
  });
}

// Limpiar localStorage y sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage local limpiado');

console.log('🎉 Limpieza completada. Recarga la página para aplicar los cambios.');
