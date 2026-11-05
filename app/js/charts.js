// Gráficos SVG livianos con tooltip táctil.
// Especificación: líneas de 2px, barras ≤24px con extremo redondeado de 4px,
// grilla de 1px recesiva, un solo eje Y, leyenda para ≥2 series.
import { esc, period } from "./fmt.js";

const NS = "http://www.w3.org/2000/svg";
const ro = new ResizeObserver((entries) => {
  for (const e of entries) {
    const r = e.target.__render;
    const w = Math.round(e.contentRect.width);
    if (r && w && w !== e.target.__w) { e.target.__w = w; r(w); }
  }
});
function mount(el, render) {
  el.classList.add("chart");
  el.__render = render;
  el.__w = el.clientWidth;
  render(el.clientWidth || 320);
  ro.observe(el);
}

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, ticks, step };
}

function xTickIdx(x, maxTicks) {
  const n = x.length;
  if (n <= 1) return [0];
  // Preferir enero si son datos mensuales y el rango es largo
  const monthly = /^\d{4}-\d{2}$/.test(x[0]);
  if (monthly && n > 30) {
    const jans = x.map((p, i) => (p.endsWith("-01") ? i : -1)).filter((i) => i >= 0);
    const step = Math.ceil(jans.length / maxTicks);
    return jans.filter((_, k) => k % step === 0);
  }
  const step = Math.max(1, Math.ceil((n - 1) / (maxTicks - 1)));
  const out = [];
  for (let i = n - 1; i >= 0; i -= step) out.unshift(i);
  return out;
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const xLabel = (p, long) => period(p, long ? {} : { short: true });

// ── Deslizador ("scrubber") y etiquetas compactas ─────────────
const SCRUB = 30; // alto reservado debajo del eje X para el deslizador

/** Lectura compacta (pastilla oscura) en la franja superior.
 *  parts: [{text, dot?, dim?}] — se centra en cx y no se sale del gráfico. */
function readout(parent, parts, cx, y, { W, minX = 0 }) {
  const g = el("g", { class: "pill" }, parent);
  const r = el("rect", { rx: 6, ry: 6, y, height: 20 }, g);
  let cur = 7;
  for (const pt of parts) {
    if (pt.dot) { el("circle", { cx: cur + 4, cy: y + 10, r: 4, fill: pt.dot }, g); cur += 11; }
    const t = el("text", { x: cur, y: y + 14, class: pt.dim ? "dim" : "" }, g);
    t.textContent = pt.text;
    cur += (t.getComputedTextLength ? t.getComputedTextLength() : pt.text.length * 6.2) + 8;
  }
  const w = cur - 1;
  r.setAttribute("width", w);
  const x = Math.max(minX, Math.min(W - w - 1, cx - w / 2));
  g.setAttribute("transform", `translate(${x},0)`);
  return { x, w };
}

/**
 * Agrega el deslizador al pie del gráfico y conecta los gestos.
 * pos(i) → coordenada X del dato i; pick(px) → índice más cercano.
 */
function scrubber(svg, { W, H, x0, x1, n, pos, pick, onChange, initial }) {
  const y = H - 11;
  const g = el("g", { class: "scrub" }, svg);
  el("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "var(--hair)", "stroke-width": 4, "stroke-linecap": "round" }, g);
  const fill = el("line", { x1: x0, x2: x0, y1: y, y2: y, stroke: "var(--accent)", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.35 }, g);
  const thumb = el("circle", { r: 8, cy: y, cx: x0, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2.5 }, g);
  const hitS = el("rect", { x: x0 - 14, y: y - 15, width: x1 - x0 + 28, height: 30, fill: "transparent", class: "scrub-hit" }, svg);
  const hitC = el("rect", { x: x0 - 6, y: 0, width: x1 - x0 + 12, height: H - SCRUB, fill: "transparent" }, svg);
  let cur = -1;
  const set = (i) => {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === cur) return;
    cur = i;
    const px = pos(i);
    thumb.setAttribute("cx", px); fill.setAttribute("x2", px);
    onChange(i);
  };
  const at = (ev) => { const r = svg.getBoundingClientRect(); set(pick(ev.clientX - r.left)); };
  for (const h of [hitS, hitC]) {
    h.addEventListener("pointerdown", (ev) => { if (h === hitS) h.setPointerCapture?.(ev.pointerId); at(ev); });
    h.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse" || ev.buttons || h.hasPointerCapture?.(ev.pointerId) || h === hitC) at(ev); });
  }
  set(initial);
  return set;
}

const lastIdx = (vals) => { let i = vals.length - 1; while (i >= 0 && (vals[i] === null || vals[i] === undefined)) i--; return i; };

/**
 * Gráfico de líneas con deslizador.
 * series: [{name, values, color, area}]
 */
export function lineChart(container, o) {
  const { x, series, fmt = (v) => v, height = 210, zero = false, xlong = false } = o;
  mount(container, (W) => {
    container.querySelector("svg")?.remove();
    const H = height + SCRUB;
    const m = { l: 40, r: 14, t: 28, b: 22 + SCRUB };
    const vals = series.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (zero) { min = Math.min(0, min); max = Math.max(0, max); }
    const pad = (max - min) * 0.06 || 1;
    const { lo, hi, ticks } = niceTicks(zero && min >= 0 ? 0 : min - pad, max + pad);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = x.length;
    const X = (i) => m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const Y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": o.label || series.map((s) => s.name).join(", ") });
    container.prepend(svg);
    const g = el("g", { class: "grid" }, svg);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? "zero" : "" }, g);
      const tx = el("text", { x: m.l - 6, y: Y(t) + 3.5, "text-anchor": "end" }, svg);
      tx.textContent = o.yfmt ? o.yfmt(t) : fmt(t);
    }
    const xly = m.t + ih + 16;
    for (const i of xTickIdx(x, W < 380 ? 4 : 6)) {
      const tx = el("text", { x: X(i), y: xly, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, svg);
      tx.textContent = /^\d{4}-\d{2}$/.test(x[i]) && n > 30 ? x[i].slice(0, 4) : xLabel(x[i], xlong);
    }
    for (const s of series) {
      let d = "", started = false, first = null, lastI = null;
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) { started = false; return; }
        d += (started ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1);
        if (first === null) first = i;
        lastI = i; started = true;
      });
      if (s.area && first !== null) {
        const base = Y(Math.max(lo, Math.min(0, hi)) || lo);
        el("path", { d: d + `L${X(lastI).toFixed(1)},${base}L${X(first).toFixed(1)},${base}Z`, fill: s.color, opacity: 0.1 }, svg);
      }
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round",
        "stroke-dasharray": s.dash || "" }, svg);
    }
    const xh = el("line", { class: "xhair", y1: m.t - 4, y2: m.t + ih, x1: 0, x2: 0 }, svg);
    const dots = series.map((s) => el("circle", { r: 4.5, fill: s.color, stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" }, svg));
    const layer = el("g", {}, svg);
    const initial = Math.max(...series.map((s) => lastIdx(s.values)));
    scrubber(svg, {
      W, H, x0: m.l, x1: m.l + iw, n, initial,
      pos: X, pick: (px) => Math.round(((px - m.l) / iw) * (n - 1)),
      onChange: (i) => {
        const cx = X(i);
        xh.setAttribute("x1", cx); xh.setAttribute("x2", cx);
        layer.replaceChildren();
        const parts = [{ text: period(x[i], xlong ? {} : { short: !/^\d{4}-\d{2}-\d{2}$/.test(x[i]) }), dim: series.length > 0 }];
        series.forEach((s, k) => {
          const v = s.values[i];
          if (v === null || v === undefined) { dots[k].setAttribute("visibility", "hidden"); return; }
          dots[k].setAttribute("cx", cx); dots[k].setAttribute("cy", Y(v)); dots[k].setAttribute("visibility", "visible");
          parts.push({ text: fmt(v), dot: series.length > 1 ? s.color : null });
        });
        readout(layer, parts, cx, 2, { W, minX: 0 });
      },
    });
  });
}

function barPath(x, w, y0, y1, r) {
  const h = Math.abs(y1 - y0);
  r = Math.min(r, w / 2, h);
  if (h < 0.5) return `M${x},${y0}h${w}v-0.5h${-w}Z`;
  if (y1 < y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

/** Columnas (admite negativos) con deslizador. */
export function columnChart(container, o) {
  const { x, values, fmt = (v) => v, height = 180, name = "", pos = "var(--pos)", neg = "var(--neg)", colorFn } = o;
  mount(container, (W) => {
    container.querySelector("svg")?.remove();
    const H = height + SCRUB;
    const m = { l: 40, r: 8, t: 28, b: 22 + SCRUB };
    const vals = values.filter((v) => v !== null && v !== undefined);
    const { lo, hi, ticks } = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals));
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = x.length;
    const band = iw / n;
    const bw = Math.max(1.5, Math.min(24, band - 2));
    const Y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
    const X = (i) => m.l + i * band + (band - bw) / 2;
    const C = (i) => X(i) + bw / 2;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || name });
    container.prepend(svg);
    const g = el("g", { class: "grid" }, svg);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? "zero" : "" }, g);
      const tx = el("text", { x: m.l - 6, y: Y(t) + 3.5, "text-anchor": "end" }, svg);
      tx.textContent = o.yfmt ? o.yfmt(t) : fmt(t);
    }
    const xly = m.t + ih + 16;
    for (const i of xTickIdx(x, W < 380 ? 4 : 6)) {
      const tx = el("text", { x: C(i), y: xly, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, svg);
      tx.textContent = /^\d{4}-\d{2}$/.test(x[i]) && n > 30 ? x[i].slice(0, 4) : xLabel(x[i]);
    }
    const bars = values.map((v, i) => {
      if (v === null || v === undefined) return null;
      const color = colorFn ? colorFn(v, i) : v >= 0 ? pos : neg;
      return el("path", { d: barPath(X(i), bw, Y(0), Y(v), 4), fill: color }, svg);
    });
    const layer = el("g", {}, svg);
    scrubber(svg, {
      W, H, x0: C(0), x1: C(n - 1), n, initial: lastIdx(values),
      pos: C, pick: (px) => Math.floor((px - m.l) / band),
      onChange: (i) => {
        bars.forEach((b, k) => b && b.setAttribute("opacity", k === i ? 1 : 0.4));
        layer.replaceChildren();
        const v = values[i];
        const top = v === null || v === undefined ? Y(0) : Math.min(Y(v), Y(0));
        el("line", { class: "xhair", x1: C(i), x2: C(i), y1: 22, y2: top - 3 }, layer);
        readout(layer, [{ text: v === null || v === undefined ? "s/d" : fmt(v) }, { text: period(x[i], { short: true }), dim: true }], C(i), 2, { W, minX: 0 });
      },
    });
  });
}

/** Mini gráfico para las tarjetas (sin interacción). */
export function spark(values, { color = "var(--s1)", w = 140, h = 30, type = "line" } = {}) {
  const v = values.filter((x) => x !== null && x !== undefined);
  if (v.length < 2) return "";
  const min = Math.min(...v, type === "col" ? 0 : Infinity), max = Math.max(...v, type === "col" ? 0 : -Infinity);
  const sp = max - min || 1;
  const Y = (x) => 2 + (h - 4) - ((x - min) / sp) * (h - 4);
  if (type === "col") {
    const band = w / values.length, bw = Math.max(1.5, Math.min(8, band - 2));
    const body = values.map((x, i) => (x === null || x === undefined ? "" :
      `<path d="${barPath(i * band + (band - bw) / 2, bw, Y(0), Y(x), 2)}" fill="${x >= 0 ? color : "var(--neg)"}" opacity="${i === values.length - 1 ? 1 : 0.45}"/>`)).join("");
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  }
  let d = "", started = false, li = 0;
  values.forEach((x, i) => {
    if (x === null || x === undefined) { started = false; return; }
    d += (started ? "L" : "M") + ((i / (values.length - 1)) * (w - 6)).toFixed(1) + "," + Y(x).toFixed(1);
    started = true; li = i;
  });
  const cx = (li / (values.length - 1)) * (w - 6), cy = Y(values[li]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true" preserveAspectRatio="none">` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/></svg>`;
}

/** Ranking horizontal (HTML). Si hay negativos, el eje cero se centra donde corresponde. */
export function bars(items, { fmt = (v) => v, color = "var(--s1)", negColor = "var(--neg)", max: forcedMax } = {}) {
  const vals = items.map((i) => i.value).filter((v) => v !== null && v !== undefined);
  const mx = forcedMax ?? Math.max(0, ...vals), mn = Math.min(0, ...vals);
  const span = mx - mn || 1;
  const zero = (-mn / span) * 100;
  return `<div class="bars">${items.map((it) => {
    const v = it.value;
    if (v === null || v === undefined) return `<div class="bar-row"><div class="bl"><span>${esc(it.label)}</span><span class="muted">s/d</span></div></div>`;
    const w = (Math.abs(v) / span) * 100;
    const left = v >= 0 ? zero : zero - w;
    return `<div class="bar-row ${it.hl ? "hl" : ""}"><div class="bl"><span>${esc(it.label)}</span><span>${esc(fmt(v))}</span></div>` +
      `<div class="bar-track">${mn < 0 ? `<i class="axis0" style="left:${zero}%"></i>` : ""}` +
      `<i class="fill" style="left:${left}%;width:${w}%;background:${it.color || (v >= 0 ? color : negColor)}"></i></div></div>`;
  }).join("")}</div>`;
}

/** Pirámide de población (HTML) */
export function pyramid(p, { fmt = (v) => v } = {}) {
  const max = Math.max(...p.mujeres, ...p.varones);
  const rows = p.grupos.map((g, i) => ({ g, m: p.mujeres[i], v: p.varones[i] })).reverse();
  return `<div class="legend"><span><i class="sw" style="background:var(--s1)"></i>Varones</span><span><i class="sw" style="background:var(--s2)"></i>Mujeres</span></div>
  <div style="display:grid;gap:3px">${rows.map((r) => `
    <div style="display:grid;grid-template-columns:1fr 48px 1fr;align-items:center;gap:6px" title="${esc(r.g)}: ${esc(fmt(r.v))} varones · ${esc(fmt(r.m))} mujeres">
      <div style="display:flex;justify-content:flex-end"><i style="height:9px;border-radius:4px 0 0 4px;background:var(--s1);width:${(r.v / max) * 100}%"></i></div>
      <div class="small muted" style="text-align:center;font-size:11px">${esc(r.g)}</div>
      <div><i style="display:block;height:9px;border-radius:0 4px 4px 0;background:var(--s2);width:${(r.m / max) * 100}%"></i></div>
    </div>`).join("")}</div>`;
}

/** Tabla con los últimos n datos (vista accesible de cualquier gráfico). */
export function dataTable(x, series, fmt, n = 24) {
  const start = Math.max(0, x.length - n);
  const idx = [];
  for (let i = x.length - 1; i >= start; i--) idx.push(i);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Período</th>${series.map((s) => `<th class="r">${esc(s.name)}</th>`).join("")}</tr></thead>
  <tbody>${idx.map((i) => `<tr><td>${esc(period(x[i]))}</td>${series.map((s) => `<td class="r">${s.values[i] === null || s.values[i] === undefined ? "–" : esc(fmt(s.values[i]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function legend(series) {
  if (series.length < 2) return "";
  return `<div class="legend">${series.map((s) => `<span><i class="sw line" style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;
}
