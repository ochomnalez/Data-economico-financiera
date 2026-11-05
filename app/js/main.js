import { esc } from "./fmt.js";
import { I } from "./icons.js";
import { flushMount, load } from "./ui.js";
import * as home from "./views/home.js";
import * as precios from "./views/precios.js";
import * as actividad from "./views/actividad.js";
import * as ingresos from "./views/ingresos.js";
import * as mas from "./views/mas.js";
import { acerca, ajustes, novedades } from "./views/ajustes.js";

// Tema elegido por el usuario
try { const t = localStorage.getItem("pe:theme"); if (t && t !== "auto") document.documentElement.dataset.theme = t; } catch { /* */ }

const TABS = [
  ["", "Inicio", I.home], ["precios", "Precios", I.prices], ["actividad", "Actividad", I.activity],
  ["ingresos", "Ingresos", I.income], ["mas", "Más", I.more],
];

// ruta → {view, tab, anchor}
const ROUTES = {
  "": { v: home, tab: "" },
  novedades: { v: novedades, tab: "" },
  precios: { v: precios, tab: "precios" },
  "precios/canastas": { v: precios, tab: "precios", anchor: "canastas" },
  "precios/dolar": { v: precios, tab: "precios", anchor: "dolar" },
  actividad: { v: actividad, tab: "actividad" },
  ingresos: { v: ingresos, tab: "ingresos" },
  "ingresos/trabajo": { v: ingresos, tab: "ingresos", anchor: "trabajo" },
  "ingresos/pobreza": { v: ingresos, tab: "ingresos", anchor: "pobreza" },
  mas: { v: mas, tab: "mas" },
  "mas/comercio": { v: mas.comercio, tab: "mas" },
  "mas/mayoristas": { v: mas.mayoristas, tab: "mas" },
  "mas/construccion": { v: mas.construccion, tab: "mas" },
  "mas/obra-publica": { v: mas.obraPublica, tab: "mas" },
  "mas/industria": { v: mas.industria, tab: "mas" },
  "mas/mineria": { v: mas.mineria, tab: "mas" },
  "mas/crianza": { v: mas.crianza, tab: "mas" },
  "mas/poblacion": { v: mas.poblacion, tab: "mas" },
  ajustes: { v: ajustes, tab: "mas" },
  acerca: { v: acerca, tab: "mas" },
};

const $main = document.getElementById("view");
const $top = document.getElementById("top");
const $tabs = document.getElementById("tabs");

$tabs.innerHTML = `<div class="tabs-inner">${TABS.map(([r, l, ic]) => `<a class="tab" data-tab="${r}" href="#/${r}">${ic}<span>${l}</span></a>`).join("")}</div>`;

const BRAND = `<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="10" fill="var(--brand)"/>
  <path d="M7 20h5l3-8 4 12 3-7h5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="27" cy="17" r="2.4" fill="#5598e7"/></svg>`;

function header(route, view) {
  const isRoot = !view.back;
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const left = isRoot
    ? (route === "" ? BRAND : "")
    : `<button class="back" aria-label="Volver" onclick="history.length > 1 ? history.back() : location.hash='${view.back}'">${I.back}</button>`;
  const eyebrow = route === "" ? today : isRoot ? "Datos del INDEC" : "";
  $top.innerHTML = `<div class="top-row">${left}<div class="top-title">${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ""}<h1>${esc(view.title)}</h1></div>
    <a class="icon-btn" href="#/novedades" aria-label="Publicaciones">${I.bell.replace("<svg", '<svg style="width:20px;height:20px"')}<span class="dot" hidden id="nov-dot"></span></a></div>`;
  markUnread();
}

async function markUnread() {
  try {
    const nov = await load("novedades");
    const seen = localStorage.getItem("pe:visto") || "";
    const dot = document.getElementById("nov-dot");
    if (dot && nov[0] && nov[0].fecha > seen) dot.hidden = false;
  } catch { /* */ }
}

let token = 0;
async function go() {
  const raw = location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const r = ROUTES[raw] || ROUTES[""];
  const view = r.v;
  const my = ++token;
  document.body.classList.remove("bars-hidden");
  header(raw in ROUTES ? raw : "", view);
  $tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === r.tab));
  $main.innerHTML = `<div class="skeleton" style="margin-top:12px"></div><div class="skeleton" style="margin-top:12px;height:220px"></div>`;
  try {
    const html = await view.render();
    if (my !== token) return;
    $main.innerHTML = `<div class="view-enter">${html}</div>`;
    flushMount();
    if (r.anchor) {
      requestAnimationFrame(() => {
        const a = document.getElementById(r.anchor);
        if (a) window.scrollTo({ top: a.getBoundingClientRect().top + scrollY - 70 });
      });
    } else window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    if (my !== token) return;
    $main.innerHTML = `<div class="error-box" style="margin-top:16px"><b>No se pudieron cargar los datos.</b><br><span class="small">${esc(e.message)}. Revisá tu conexión y volvé a intentar.</span></div>`;
  }
}

window.addEventListener("hashchange", go);
// Al bajar se esconden el encabezado y las pestañas; al subir vuelven.
let lastY = scrollY, ticking = false;
function onScroll() {
  const y = Math.max(0, scrollY);
  const dy = y - lastY;
  const nearBottom = innerHeight + y >= document.documentElement.scrollHeight - 24;
  $top.classList.toggle("scrolled", y > 4);
  if (y < 80 || nearBottom || dy < -6) document.body.classList.remove("bars-hidden");
  else if (dy > 6) document.body.classList.add("bars-hidden");
  if (Math.abs(dy) > 6) lastY = y;
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
go();

if ("serviceWorker" in navigator) {
  // Busca versión nueva al abrir y cada vez que la app vuelve a primer plano;
  // si hay una, recarga una sola vez para mostrarla.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch((e) => console.warn("SW", e));
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "navigate" && e.data.url) location.hash = e.data.url.replace(/^.*#/, "#");
  });
}
