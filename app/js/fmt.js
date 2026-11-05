// Formato numérico y de fechas en castellano rioplatense.
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ORD = { 1: "1.er", 2: "2.º", 3: "3.er", 4: "4.º" };

const nf = {};
function f(nd) {
  return (nf[nd] ||= new Intl.NumberFormat("es-AR", { minimumFractionDigits: nd, maximumFractionDigits: nd }));
}

/** Número con nd decimales; usa "−" tipográfico. */
export function n(v, nd = 1, { sign = false } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return "s/d";
  const s = f(nd).format(Math.abs(v));
  if (v < 0 && Number(s.replace(/\./g, "").replace(",", ".")) !== 0) return "−" + s;
  return (sign && v > 0 ? "+" : "") + s;
}
export const pct = (v, nd = 1, o) => (v === null || v === undefined ? "s/d" : n(v, nd, o) + "%");
export const pp = (v, nd = 1) => n(v, nd, { sign: true }) + " p.p.";

/** Pesos: $1.632.505 o abreviado $1,63 M */
export function ars(v, { short = false } = {}) {
  if (v === null || v === undefined) return "s/d";
  if (short && Math.abs(v) >= 1e6) return "$" + n(v / 1e6, 2) + " M";
  if (short && Math.abs(v) >= 1e4) return "$" + n(v / 1e3, 0) + " mil";
  return "$" + n(v, 0);
}
/** Millones de dólares: US$ 2.976 M */
export function usdM(v, nd = 0) {
  if (v === null || v === undefined) return "s/d";
  if (Math.abs(v) >= 100000) return "US$ " + n(v / 1000, 1) + " mil M";
  return "US$ " + n(v, nd) + " M";
}
export function big(v) {
  if (v === null || v === undefined) return "s/d";
  if (Math.abs(v) >= 1e6) return n(v / 1e6, 2) + " M";
  if (Math.abs(v) >= 1e3) return n(v / 1e3, 1) + " mil";
  return n(v, 0);
}

/** '2026-09' → 'sep 2026' · '2026-T2' → '2.º trim. 2026' · '2026-S1' → '1.er sem. 2026' */
export function period(p, { long = false, short = false } = {}) {
  if (!p) return "";
  const [y, r] = p.split("-");
  if (!r) return y;
  if (r[0] === "T") return long ? `${ORD[r[1]]} trimestre ${y}` : short ? `T${r[1]} ${y.slice(2)}` : `${ORD[r[1]]} trim. ${y}`;
  if (r[0] === "S") return long ? `${ORD[r[1]]} semestre ${y}` : short ? `S${r[1]} ${y.slice(2)}` : `${ORD[r[1]]} sem. ${y}`;
  if (r.length === 2) {
    const m = +r - 1;
    if (long) return `${MES_L[m]} ${y}`;
    if (short) return `${MES[m]} ${y.slice(2)}`;
    return `${MES[m]} ${y}`;
  }
  // fecha diaria AAAA-MM-DD
  const [, mm, dd] = p.split("-");
  return `${+dd} ${MES[+mm - 1]} ${y}`;
}
export const monthName = (p) => MES_L[+p.split("-")[1] - 1];

export function dateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
export function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Último valor no nulo de una serie → {i, v} */
export function lastOf(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null && arr[i] !== undefined) return { i, v: arr[i] };
  return { i: -1, v: null };
}
