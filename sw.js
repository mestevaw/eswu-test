/* ========================================
   sw.js — V2
   Service Worker — ESWU PWA
   Ruta: sw.js
   Fecha: 2026-03-05
   Cambios V2: Eliminada lógica de Web Share Target
               (no soportado en Safari/iOS para archivos).
               Mantiene activación rápida de PWA.
   ======================================== */

self.addEventListener('install', function() {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});
