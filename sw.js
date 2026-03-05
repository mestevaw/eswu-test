/* ========================================
   sw.js — V1
   Service Worker — ESWU PWA
   Ruta: sw.js
   Fecha: 2026-03-05
   ========================================
   Responsabilidades:
   1. Interceptar el POST del Web Share Target
   2. Guardar el archivo compartido en CacheAPI
   3. Redirigir a la app con ?from=share
   4. Servir el archivo guardado de vuelta a la app
   ======================================== */

var SHARE_CACHE = 'eswu-share-v1';

// ─── Activación inmediata ─────────────────
self.addEventListener('install', function() {
    self.skipWaiting();
});
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// ─── Intercepción de Fetch ────────────────
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // ①  Web Share Target: POST a ./share-target
    if (url.pathname.endsWith('/share-target') && event.request.method === 'POST') {
        event.respondWith(handleShareTarget(event.request));
        return;
    }

    // ②  Servir el archivo guardado a la página
    if (url.pathname.endsWith('/eswu-shared-file')) {
        event.respondWith(serveSharedFile());
        return;
    }

    // Todo lo demás: comportamiento normal del navegador
});

// ─── Manejo del Share Target ─────────────
async function handleShareTarget(request) {
    try {
        var formData = await request.formData();
        var file = formData.get('pdf');  // nombre definido en manifest.json

        if (file && file.size > 0) {
            var cache = await caches.open(SHARE_CACHE);
            var response = new Response(file, {
                headers: {
                    'Content-Type': file.type || 'application/pdf',
                    'X-Filename': encodeURIComponent(file.name || 'factura-compartida.pdf'),
                    'X-File-Size': String(file.size)
                }
            });
            // Clave fija — la app siempre pide este URL
            var base = new URL('./', self.location.href).href;
            await cache.put(base + 'eswu-shared-file', response);
            console.log('[SW] Archivo guardado:', file.name, '(' + file.size + ' bytes)');
        } else {
            console.warn('[SW] Share target: no se recibió archivo válido');
        }
    } catch(err) {
        console.error('[SW] Error en share target:', err);
    }

    // Redirigir a la app — el parámetro ?from=share le indica que hay archivo listo
    return Response.redirect('./?from=share', 303);
}

// ─── Servir el archivo guardado ───────────
async function serveSharedFile() {
    try {
        var cache = await caches.open(SHARE_CACHE);
        var base  = new URL('./', self.location.href).href;
        var cached = await cache.match(base + 'eswu-shared-file');
        if (cached) {
            return cached;
        }
    } catch(err) {
        console.error('[SW] Error sirviendo archivo compartido:', err);
    }
    return new Response('', { status: 404 });
}
