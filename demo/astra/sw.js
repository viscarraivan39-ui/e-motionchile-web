// ASTRA · service worker del prototipo: muestra los avisos en el teléfono y abre la AST al tocarlos.
// En la versión en línea recibirá además notificaciones push del servidor (con la app cerrada).
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) { if ('focus' in lista[i]) { lista[i].navigate(url); return lista[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data.json(); } catch (x) { d = { titulo: 'ASTRA', texto: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'ASTRA', { body: d.texto || '', data: { url: d.url || './' } }));
});
