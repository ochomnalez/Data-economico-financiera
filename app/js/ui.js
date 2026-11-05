// Piezas de interfaz compartidas y carga de datos.
import { columnChart, dataTable, legend, lineChart } from "./charts.js";
import { esc, period } from "./fmt.js";
import { I } from "./icons.js";
import { G } from "./glosario.js";

// ── Datos ──────────────────────────────────────────
const cache = new Map();
export function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`data/${name}.json`, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${name} (${r.status})`);
      return r.json();
    }).catch((e) => { cache.delete(name); throw e; }));
  }
  return cache.get(name);
}
export const loadMany = (...names) => Promise.all(names.map(load));

let fxPromise = null;
/** Cotizaciones del dólar en vivo (dolarapi.com) con respaldo en el histórico propio. */
export function dolarHoy() {
  if (!fxPromise) {
    fxPromise = fetch("https://dolarapi.com/v1/dolares", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows) => {
        const by = Object.fromEntries(rows.map((r) => [r.casa, r]));
        return { live: true, by, fecha: rows.reduce((a, r) => (r.fechaActualizacion > a ? r.fechaActualizacion : a), "") };
      })
      .catch(async () => {
        const d = await load("dolar");
        const by = {};
        for (const c of d.casas) {
          let i = c.v.length - 1;
          while (i >= 0 && c.v[i] === null) i--;
          by[c.id] = { casa: c.id, nombre: c.name, venta: c.v[i], fechaActualizacion: d.fechas[i] };
        }
        return { live: false, by, fecha: d.fechas[d.fechas.length - 1] };
      });
    setTimeout(() => (fxPromise = null), 5 * 60 * 1000);
  }
  return fxPromise;
}

// ── Componentes ────────────────────────────────────
let after = [];
export const onMount = (fn) => after.push(fn);
export function flushMount() {
  const fns = after; after = [];
  for (const f of fns) { try { f(); } catch (e) { console.error(e); } }
}
let uid = 0;
export const id = (p = "x") => `${p}${++uid}`;

/** Variación con flecha y color según si es buena o mala noticia. */
export function delta(cur, prev, { good = "down", fmt = (v) => v, suffix = "", label = "" } = {}) {
  if (cur === null || prev === null || cur === undefined || prev === undefined) return "";
  const d = cur - prev;
  const eps = 0.05;
  const dir = Math.abs(d) < eps ? "flat" : d > 0 ? "up" : "down";
  const cls = dir === "flat" || !good ? "flat" : dir === good ? "good" : "bad";
  const ico = dir === "up" ? I.up : dir === "down" ? I.down : I.flat;
  return `<span class="delta ${cls}" title="${esc(label)}">${ico}${esc(fmt(d))}${suffix}</span>`;
}
/** Chip de estado para un valor (p. ej. salario real +/−). */
export function tone(v, { good = "up", text }) {
  if (v === null || v === undefined) return "";
  const dir = Math.abs(v) < 0.05 ? "flat" : v > 0 ? "up" : "down";
  const cls = dir === "flat" ? "flat" : dir === good ? "good" : "bad";
  const ico = dir === "up" ? I.up : dir === "down" ? I.down : I.flat;
  return `<span class="delta ${cls}">${ico}${esc(text)}</span>`;
}

// ── "Qué es": botoncito + panel inferior con definición y fórmula ──
const SHEETS = new Map();
/** Devuelve el botón chico; al tocarlo abre el panel con el concepto del glosario
 *  (concept) y/o la nota propia de la tarjeta (text). */
export function info(text, { concept, title } = {}) {
  if (!text && !(concept && G[concept])) return { btn: "", box: "" };
  const k = id("q");
  SHEETS.set(k, { text, concept, title });
  return { btn: `<button type="button" class="what" data-sheet="${k}" aria-label="Qué es y cómo se calcula">${I.info}<span>Qué es</span></button>`, box: "" };
}

function sheetHTML({ text, concept, title }) {
  const g = G[concept] || {};
  const t = g.titulo || title || "Qué es";
  return `<div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${esc(t)}</h2><button type="button" class="sheet-x" aria-label="Cerrar">✕</button></div>
    <div class="sheet-body">
      ${g.que ? `<h4>Qué es</h4><p>${g.que}</p>` : ""}
      ${g.formula ? `<h4>Cómo se calcula</h4><div class="formula">${g.formula.map((f) => `<div>${esc(f)}</div>`).join("")}</div>` : ""}
      ${g.lectura ? `<h4>Cómo leerlo</h4><p>${g.lectura}</p>` : ""}
      ${text ? `<h4>${g.que ? "En este gráfico" : "Qué muestra"}</h4><p>${text}</p>` : ""}
      <p class="small muted" style="margin-top:16px">Fórmulas simplificadas para entender la idea general. La metodología completa está en indec.gob.ar.</p>
    </div>`;
}

let sheetEl = null;
function openSheet(data) {
  if (!sheetEl) {
    sheetEl = document.createElement("div");
    sheetEl.className = "sheet-wrap";
    sheetEl.innerHTML = `<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(sheetEl);
    sheetEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("sheet-bg") || e.target.closest(".sheet-x")) closeSheet();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    window.addEventListener("hashchange", closeSheet);
  }
  sheetEl.querySelector(".sheet").innerHTML = sheetHTML(data);
  sheetEl.querySelector(".sheet").scrollTop = 0;
  document.documentElement.classList.add("sheet-open");
  requestAnimationFrame(() => sheetEl.classList.add("open"));
}
function closeSheet() {
  if (!sheetEl) return;
  sheetEl.classList.remove("open");
  document.documentElement.classList.remove("sheet-open");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sheet]");
  if (!b) return;
  const d = SHEETS.get(b.dataset.sheet);
  if (d) openSheet(d);
});

export function section(title, body, { link, sub, idAttr } = {}) {
  return `<section class="section" ${idAttr ? `id="${idAttr}"` : ""}><div class="section-head"><h2>${esc(title)}</h2>${link ? `<a class="link" href="${link[1]}">${esc(link[0])}</a>` : ""}</div>
  ${sub ? `<p class="section-sub">${sub}</p>` : ""}${body}</section>`;
}

export function kpi({ label, value, unit = "", foot = "", d = "", sparkSvg = "", href, wide }) {
  const tag = href ? "a" : "div";
  return `<${tag} class="kpi ${wide ? "wide" : ""}" ${href ? `href="${href}"` : ""}>
    <div class="k-label">${esc(label)}</div>
    <div class="k-value ${String(value).replace(/<[^>]+>/g, "").length > 7 ? "long" : ""}">${value}${unit ? `<small>${unit}</small>` : ""}</div>
    <div class="k-foot"><span>${foot}</span>${d}</div>
    ${sparkSvg}
  </${tag}>`;
}

export function stats(items) {
  return `<div class="stats ${items.length === 2 ? "two" : ""}">${items.map((s) => `<div class="stat">
    <div class="s-label">${esc(s.label)}</div><div class="s-value ${((t) => (t > 9 ? "xlong" : t > 6 ? "long" : ""))(String(s.value).length + (s.unit || "").length)}">${s.value}${s.unit ? `<small>${s.unit}</small>` : ""}</div>
    ${s.foot ? `<div class="s-foot">${s.foot}</div>` : ""}</div>`).join("")}</div>`;
}

export const RANGES_M = [["1A", 12], ["2A", 24], ["5A", 60], ["Todo", 0]];
export const RANGES_Q = [["3A", 12], ["5A", 20], ["Todo", 0]];
export const RANGES_S = [["5A", 10], ["Todo", 0]];

function seg(name, opts, on) {
  return `<div class="seg" role="tablist" data-seg="${name}">${opts.map(([label, val]) =>
    `<button type="button" role="tab" data-v="${val}" class="${String(val) === String(on) ? "on" : ""}" aria-selected="${String(val) === String(on)}">${esc(label)}</button>`).join("")}</div>`;
}

/**
 * Tarjeta con gráfico, selector de modo/rango, leyenda y tabla de datos.
 * render(mode) → {type:'line'|'col', x, series|values, fmt, ...}
 */
export function chartCard({ title, sub = "", modes, ranges = RANGES_M, range = 24, render, source = "INDEC", infoText, height, concept }) {
  const k = id("c");
  let mode = modes ? modes[0][1] : null;
  let rng = ranges ? range : 0;
  const inf = info(infoText, { concept, title });
  onMount(() => {
    const root = document.getElementById(k);
    if (!root) return;
    const slot = root.querySelector(".chart-slot");
    const leg = root.querySelector(".legend-slot");
    const tbl = root.querySelector(".table-slot");
    const det = root.querySelector("details.data-toggle");
    let spec;
    const draw = () => {
      spec = render(mode);
      const n = rng && spec.x.length > rng ? spec.x.length - rng : 0;
      const x = spec.x.slice(n);
      slot.innerHTML = "";
      if (spec.type === "col") {
        columnChart(slot, { ...spec, height: spec.height || height, x, values: spec.values.slice(n) });
        leg.innerHTML = spec.name ? `<div class="legend"><span><i class="sw" style="background:${spec.pos || "var(--pos)"}"></i>${esc(spec.name)}</span></div>` : "";
      } else {
        const series = spec.series.map((s) => ({ ...s, values: s.values.slice(n) }));
        lineChart(slot, { ...spec, height: spec.height || height, x, series });
        leg.innerHTML = legend(series);
      }
      if (det.open) fill();
    };
    const fill = () => {
      const series = spec.type === "col" ? [{ name: spec.name || title, values: spec.values }] : spec.series;
      tbl.innerHTML = dataTable(spec.x, series, spec.fmt, 36);
    };
    det.addEventListener("toggle", () => det.open && fill());
    root.querySelectorAll(".seg").forEach((sg) => sg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      sg.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      if (sg.dataset.seg === "mode") mode = b.dataset.v; else rng = +b.dataset.v;
      draw();
    }));
    draw();
  });
  return `<div class="card" id="${k}">
    <div class="card-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="card-sub">${sub}</div>` : ""}</div>${inf ? inf.btn : ""}</div>
    ${inf ? inf.box : ""}
    ${modes || ranges ? `<div class="controls">${modes ? seg("mode", modes, mode) : "<span></span>"}${ranges ? seg("range", ranges, rng) : ""}</div>` : ""}
    <div class="legend-slot"></div><div class="chart-slot"></div>
    <details class="data-toggle"><summary>Ver datos</summary><div class="table-slot"></div></details>
    <div class="source">Fuente: ${source}</div>
  </div>`;
}

export function card(inner, { title, sub, infoText, source, concept } = {}) {
  const inf = info(infoText, { concept, title });
  return `<div class="card">${title ? `<div class="card-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="card-sub">${sub}</div>` : ""}</div>${inf ? inf.btn : ""}</div>` : ""}
  ${inf ? inf.box : ""}${inner}${source ? `<div class="source">Fuente: ${source}</div>` : ""}</div>`;
}

/** Selector simple que re-renderiza un bloque HTML. */
export function switcher({ options, render, initial }) {
  const k = id("s");
  let cur = initial ?? options[0][1];
  onMount(() => {
    const root = document.getElementById(k);
    const body = root.querySelector(".sw-body");
    const paint = () => { body.innerHTML = render(cur); };
    root.querySelector(".seg").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      root.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
      cur = b.dataset.v; paint();
    });
    paint();
  });
  return `<div id="${k}"><div class="controls">${seg("sw", options, cur)}</div><div class="sw-body"></div></div>`;
}

export const updatedNote = (d, extra = "") =>
  `Datos al ${esc(period(d))}${extra ? " · " + extra : ""}`;
