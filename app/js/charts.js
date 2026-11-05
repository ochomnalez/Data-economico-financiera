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

function tooltipEl(container) {
  let t = container.querySelector(".tooltip");
  if (!t) { t = document.createElement("div"); t.className = "tooltip"; container.appendChild(t); }
  return t;
}
function placeTip(tip, container, px, py) {
  const cw = container.clientWidth;
  const tw = tip.offsetWidth || 140;
  let left = px + 14;
  if (left + tw > cw) left = px - tw - 14;
  if (left < 0) left = Math.max(0, Math.min(cw - tw, px - tw / 2));
  tip.style.left = left + "px";
  tip.style.top = Math.max(0, py - 10) + "px";
}

const xLabel = (p, long) => period(p, long ? {} : { short: true });

/**
 * Gráfico de líneas.
 * series: [{name, values, color, area}]
 */
export function lineChart(container, o) {
  const { x, series, fmt = (v) => v, height = 210, zero = false, endLabels = true, xlong = false } = o;
  mount(container, (W) => {
    container.querySelector("svg")?.remove();
    const H = height;
    const m = { l: 40, r: endLabels ? 46 : 10, t: 10, b: 24 };
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
    const g = el("g", { class: "grid" }, svg);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? "zero" : "" }, g);
      const tx = el("text", { x: m.l - 6, y: Y(t) + 3.5, "text-anchor": "end" }, svg);
      tx.textContent = o.yfmt ? o.yfmt(t) : fmt(t);
    }
    for (const i of xTickIdx(x, W < 380 ? 4 : 6)) {
      const tx = el("text", { x: X(i), y: H - 6, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, svg);
      tx.textContent = /^\d{4}-\d{2}$/.test(x[i]) && n > 30 ? x[i].slice(0, 4) : xLabel(x[i], xlong);
    }
    for (const s of series) {
      let d = "", started = false, a = "", first = null, lastI = null;
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) { started = false; return; }
        d += (started ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1);
        if (first === null) first = i;
        lastI = i; started = true;
      });
      if (s.area && first !== null) {
        const base = Y(Math.max(lo, Math.min(0, hi)) || lo);
        a = d + `L${X(lastI).toFixed(1)},${base}L${X(first).toFixed(1)},${base}Z`;
        el("path", { d: a, fill: s.color, opacity: 0.1 }, svg);
      }
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round",
        "stroke-dasharray": s.dash || "" }, svg);
    }
    // Etiquetas al final (≤3 series), evitando superposición
    if (endLabels) {
      const labels = series.map((s) => {
        let i = s.values.length - 1;
        while (i >= 0 && (s.values[i] === null || s.values[i] === undefined)) i--;
        return i < 0 ? null : { s, i, y: Y(s.values[i]) };
      }).filter(Boolean);
      for (const L of labels) {
        el("circle", { cx: X(L.i), cy: L.y, r: 4, fill: L.s.color, stroke: "var(--surface)", "stroke-width": 2 }, svg);
      }
      if (labels.length <= 3) {
        labels.sort((a, b) => a.y - b.y);
        for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 13) labels[k].y = labels[k - 1].y + 13;
        for (const L of labels) {
          const t = el("text", { x: X(L.i) + 8, y: L.y + 4, class: "end-label" }, svg);
          t.textContent = fmt(L.s.values[L.i]);
        }
      }
    }
    // Capa de interacción
    const xh = el("line", { class: "xhair", y1: m.t, y2: m.t + ih, x1: 0, x2: 0, visibility: "hidden" }, svg);
    const dots = series.map((s) => el("circle", { r: 4.5, fill: s.color, stroke: "var(--surface)", "stroke-width": 2, cx: 0, cy: 0, visibility: "hidden" }, svg));
    const hit = el("rect", { x: m.l - 6, y: 0, width: iw + 12, height: H, fill: "transparent" }, svg);
    container.prepend(svg);
    const tip = tooltipEl(container);
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ev.clientX - r.left;
      let i = Math.round(((px - m.l) / iw) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.setAttribute("visibility", "visible");
      let rows = "";
      let topY = H;
      series.forEach((s, k) => {
        const v = s.values[i];
        if (v === null || v === undefined) { dots[k].setAttribute("visibility", "hidden"); return; }
        dots[k].setAttribute("cx", X(i)); dots[k].setAttribute("cy", Y(v)); dots[k].setAttribute("visibility", "visible");
        topY = Math.min(topY, Y(v));
        rows += `<div class="tt-r"><span><i class="sw line" style="background:${s.color}"></i>${esc(s.name)}</span><b>${esc(fmt(v))}</b></div>`;
      });
      tip.innerHTML = `<div class="tt-h">${esc(period(x[i], { long: true }))}</div>${rows || '<div class="muted">Sin dato</div>'}`;
      tip.classList.add("show");
      placeTip(tip, container, X(i), topY - 30);
    };
    const hide = (ev) => {
      if (ev && ev.pointerType && ev.pointerType !== "mouse") return;
      tip.classList.remove("show"); xh.setAttribute("visibility", "hidden");
      dots.forEach((d) => d.setAttribute("visibility", "hidden"));
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", hide);
    container.__hide = () => hide();
  });
}

function barPath(x, w, y0, y1, r) {
  const h = Math.abs(y1 - y0);
  r = Math.min(r, w / 2, h);
  if (h < 0.5) return `M${x},${y0}h${w}v-0.5h${-w}Z`;
  if (y1 < y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

/** Columnas (admite negativos). */
export function columnChart(container, o) {
  const { x, values, fmt = (v) => v, height = 180, name = "", pos = "var(--pos)", neg = "var(--neg)", labelLast = true, colorFn } = o;
  mount(container, (W) => {
    container.querySelector("svg")?.remove();
    const H = height;
    const m = { l: 40, r: 8, t: labelLast ? 18 : 10, b: 24 };
    const vals = values.filter((v) => v !== null && v !== undefined);
    const { lo, hi, ticks } = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals));
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = x.length;
    const band = iw / n;
    const bw = Math.max(1.5, Math.min(24, band - 2));
    const Y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
    const X = (i) => m.l + i * band + (band - bw) / 2;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || name });
    const g = el("g", { class: "grid" }, svg);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? "zero" : "" }, g);
      const tx = el("text", { x: m.l - 6, y: Y(t) + 3.5, "text-anchor": "end" }, svg);
      tx.textContent = o.yfmt ? o.yfmt(t) : fmt(t);
    }
    for (const i of xTickIdx(x, W < 380 ? 4 : 6)) {
      const tx = el("text", { x: X(i) + bw / 2, y: H - 6, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, svg);
      tx.textContent = /^\d{4}-\d{2}$/.test(x[i]) && n > 30 ? x[i].slice(0, 4) : xLabel(x[i]);
    }
    const bars = [];
    values.forEach((v, i) => {
      if (v === null || v === undefined) { bars.push(null); return; }
      const color = colorFn ? colorFn(v, i) : v >= 0 ? pos : neg;
      bars.push(el("path", { d: barPath(X(i), bw, Y(0), Y(v), 4), fill: color }, svg));
    });
    if (labelLast) {
      let i = values.length - 1;
      while (i >= 0 && (values[i] === null || values[i] === undefined)) i--;
      if (i >= 0) {
        const v = values[i];
        const t = el("text", { x: X(i) + bw / 2, y: v >= 0 ? Y(v) - 5 : Y(v) + 13, "text-anchor": "end", class: "end-label" }, svg);
        t.textContent = fmt(v);
      }
    }
    const hit = el("rect", { x: m.l, y: 0, width: iw, height: H, fill: "transparent" }, svg);
    container.prepend(svg);
    const tip = tooltipEl(container);
    let prev = -1;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left - m.l) / band)));
      if (prev >= 0 && bars[prev]) bars[prev].setAttribute("opacity", 1);
      bars.forEach((b, k) => b && b.setAttribute("opacity", k === i ? 1 : 0.55));
      prev = i;
      const v = values[i];
      tip.innerHTML = `<div class="tt-h">${esc(period(x[i], { long: true }))}</div>` +
        `<div class="tt-r"><span>${esc(name)}</span><b>${v === null || v === undefined ? "s/d" : esc(fmt(v))}</b></div>`;
      tip.classList.add("show");
      placeTip(tip, container, X(i) + bw / 2, v !== null && v !== undefined ? Math.min(Y(v), Y(0)) - 30 : 20);
    };
    const hide = (ev) => {
      if (ev && ev.pointerType && ev.pointerType !== "mouse") return;
      tip.classList.remove("show");
      bars.forEach((b) => b && b.setAttribute("opacity", 1));
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", hide);
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
