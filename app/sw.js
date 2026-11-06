// Service worker: app offline + notificaciones push.
const VERSION = "pe-v6";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/main.js", "js/ui.js", "js/charts.js", "js/fmt.js", "js/icons.js", "js/push.js", "js/glosario.js",
  "js/views/home.js", "js/views/precios.js", "js/views/actividad.js", "js/views/ingresos.js", "js/views/mas.js", "js/views/ajustes.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/badge-96.png",
];

self.addEventListener("install", (e) => {
  // cache: "reload" evita guardar copias viejas que haya dejado el caché HTTP.
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Todo (app y datos): primero la red, revalidando, para mostrar siempre lo último.
// Sin conexión (o si la red tarda más de 4 s), lo guardado.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const net = fetch(e.request, { cache: "no-cache" }).then((r) => {
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    });
    const timeout = new Promise((res) => setTimeout(res, 4000));
    try {
      const r = await Promise.race([net, timeout]);
      if (r) return r;
    } catch { /* sin conexión */ }
    const hit = await cache.match(e.request, { ignoreSearch: true });
    return hit || net;
  })());
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Pulso Económico", {
    body: d.body || "El INDEC publicó datos nuevos.",
    icon: "icons/icon-192.png", badge: "icons/badge-96.png",
    tag: d.tag || "indec", renotify: true, data: { url: d.url || "#/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL("./" + (e.notification.data?.url || "#/"), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) {
      if (c.url.startsWith(self.registration.scope)) {
        c.postMessage({ type: "navigate", url: e.notification.data?.url || "#/" });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
