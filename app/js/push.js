// Notificaciones push sin servidor propio.
// La app genera en el teléfono un par de claves VAPID y la suscripción push;
// el usuario pega ese bloque una sola vez como secreto PUSH_CONFIG en GitHub,
// y el robot diario lo usa para avisar cuando hay datos nuevos.
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const KEY = "pe:vapid";

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const permission = () => ("Notification" in window ? Notification.permission : "unsupported");

async function vapidKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.private && saved?.public) return saved;
  } catch { /* nada guardado */ }
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const raw = await crypto.subtle.exportKey("raw", kp.publicKey);
  const v = { private: jwk.d, public: b64u(raw) };
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  return v;
}

/** Pide permiso, se suscribe y devuelve el bloque para PUSH_CONFIG. */
export async function enable() {
  if (!supported()) throw new Error("Este navegador no admite notificaciones push.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("No diste permiso para mostrar notificaciones.");
  const reg = await navigator.serviceWorker.ready;
  const v = await vapidKeys();
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const k = sub.options?.applicationServerKey ? b64u(sub.options.applicationServerKey) : null;
    if (k && k !== v.public) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(v.public) });
  return { vapid_private: v.private, vapid_public: v.public, subscription: sub.toJSON() };
}

export async function current() {
  if (!supported() || Notification.permission !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const v = await vapidKeys();
  return { vapid_private: v.private, vapid_public: v.public, subscription: sub.toJSON() };
}

export async function localTest() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("Pulso Económico", {
    body: "Así te van a llegar los avisos cuando el INDEC publique datos nuevos.",
    icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "prueba-local", data: { url: "#/" },
  });
}
