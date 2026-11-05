import { spark } from "../charts.js";
import { ago, ars, esc, lastOf, n, pct, period, usdM } from "../fmt.js";
import { I, ICON_FOR } from "../icons.js";
import { delta, dolarHoy, kpi, loadMany, onMount, section, tone } from "../ui.js";

export const title = "Pulso Económico";

export async function render() {
  const [estado, nov, ipc, emae, sal, trab, pob, can, comex] = await loadMany(
    "estado", "novedades", "ipc", "emae", "salarios", "trabajo", "pobreza", "canastas", "comex");

  // ── Novedades ──
  const visibles = nov.filter((x) => !x.silencioso);
  const top = visibles[0];
  const seen = localStorageGet("visto") || "";
  const isNew = top && top.fecha > seen;
  const hero = top ? `<a class="card hero" href="${top.ruta}">
      <div class="eyebrow">${isNew ? '<span class="badge-new">NUEVO</span>' : ""}Último dato publicado</div>
      <h3>${esc(top.titulo)}</h3><p>${esc(top.texto)}</p>
      <div class="hero-foot"><span>${esc(ago(top.fecha))}</span><span style="color:#fff;font-weight:600">Ver detalle →</span></div>
    </a>` : "";
  const feed = visibles.slice(1, 4).map(feedItem).join("");

  // ── Tablero ──
  const g = ipc.general, P = ipc.p;
  const vm = lastOf(g.vm), via = lastOf(g.via);
  const em = emae.general;
  const emVm = lastOf(em.vm_desest), emVia = lastOf(em.via);
  const reg = sal.sectores.find((s) => s.name === "Total registrado");
  const rv = lastOf(reg.real_via);
  const des = lastOf(trab.desocupacion);
  const pp = lastOf(pob.pobreza_personas);
  const cbt = lastOf(can.cbt_h2);
  const sal_ = lastOf(comex.saldo);
  const last24 = (a) => a.slice(-24);

  const tiles = [
    kpi({ label: "Inflación mensual", value: n(vm.v), unit: "%", href: "#/precios",
      foot: period(P[vm.i]), d: delta(vm.v, g.vm[vm.i - 1], { good: "down", fmt: (x) => n(x, 1, { sign: true }), suffix: " p.p.", label: "vs. mes anterior" }),
      sparkSvg: spark(last24(g.vm), { type: "col" }) }),
    kpi({ label: "Inflación interanual", value: n(via.v), unit: "%", href: "#/precios",
      foot: period(P[via.i]), d: delta(via.v, g.via[via.i - 1], { good: "down", fmt: (x) => n(x, 1, { sign: true }), suffix: " p.p." }),
      sparkSvg: spark(last24(g.via)) }),
    kpi({ label: "Actividad económica (EMAE)", value: n(emVm.v, 1, { sign: true }), unit: "%", href: "#/actividad",
      foot: `${period(emae.p[emVm.i])} · mens.`, d: tone(emVia.v, { good: "up", text: `${n(emVia.v, 1, { sign: true })}% i.a.` }),
      sparkSvg: spark(last24(em.desest), { color: "var(--s3)" }) }),
    kpi({ label: "Salario real registrado", value: n(rv.v, 1, { sign: true }), unit: "%", href: "#/ingresos",
      foot: `${period(sal.p[rv.i])} · i.a.`, d: tone(rv.v, { good: "up", text: rv.v >= 0 ? "gana vs. IPC" : "pierde vs. IPC" }),
      sparkSvg: spark(last24(reg.real_idx), { color: "var(--s7)" }) }),
    kpi({ label: "Desocupación", value: n(des.v), unit: "%", href: "#/ingresos/trabajo",
      foot: period(trab.p[des.i]), d: delta(des.v, trab.desocupacion[des.i - 4], { good: "down", fmt: (x) => n(x, 1, { sign: true }), suffix: " p.p." }),
      sparkSvg: spark(trab.desocupacion.slice(-12), { color: "var(--s2)" }) }),
    kpi({ label: "Pobreza (personas)", value: n(pp.v), unit: "%", href: "#/ingresos/pobreza",
      foot: period(pob.p[pp.i]), d: delta(pp.v, pob.pobreza_personas[pp.i - 1], { good: "down", fmt: (x) => n(x, 1, { sign: true }), suffix: " p.p." }),
      sparkSvg: spark(pob.pobreza_personas.slice(-10), { color: "var(--s8)" }) }),
    kpi({ label: "Canasta básica total · familia tipo", value: ars(cbt.v, { short: true }), href: "#/precios/canastas",
      foot: period(can.p[cbt.i]), d: tone(can.cbt_vm[cbt.i], { good: "down", text: `${n(can.cbt_vm[cbt.i], 1, { sign: true })}% mens.` }),
      sparkSvg: spark(last24(can.cbt_h2), { color: "var(--s4)" }) }),
    kpi({ label: "Balanza comercial", value: usdM(sal_.v), href: "#/mas/comercio",
      foot: period(comex.p[sal_.i]), d: tone(sal_.v, { good: "up", text: sal_.v >= 0 ? "superávit" : "déficit" }),
      sparkSvg: spark(last24(comex.saldo), { type: "col" }) }),
  ].join("");

  // ── Lectura rápida ──
  const ins = insights({ ipc, emae, sal, trab, can });

  // ── Dólar ──
  const fxId = "fx-home";
  onMount(async () => {
    const box = document.getElementById(fxId);
    if (!box) return;
    try {
      const fx = await dolarHoy();
      const of = fx.by.oficial?.venta;
      const cell = (casa, label) => {
        const v = fx.by[casa]?.venta;
        const gap = of && v && casa !== "oficial" ? `brecha ${n((v / of - 1) * 100, 0)}%` : "venta";
        return `<div><div class="n">${label}</div><div class="v num">${v ? "$" + n(v, 0) : "s/d"}</div><div class="g">${gap}</div></div>`;
      };
      box.innerHTML = `<div class="fx">${cell("oficial", "Oficial")}${cell("bolsa", "MEP")}${cell("contadoconliqui", "CCL")}${cell("blue", "Blue")}</div>
        <div class="source">${fx.live ? "En vivo · dolarapi.com" : "Último cierre · argentinadatos.com"} · ${esc(fx.fecha ? ago(fx.fecha) : "")}</div>`;
    } catch {
      box.innerHTML = `<div class="muted small">No se pudo obtener la cotización.</div>`;
    }
  });

  onMount(() => localStorageSet("visto", top?.fecha || ""));

  return `
    ${hero}
    ${feed ? `<div class="card" style="margin-top:12px"><div class="feed">${feed}</div>
      <a href="#/novedades" class="small" style="display:block;margin-top:10px;font-weight:600">Ver todas las publicaciones →</a></div>` : ""}
    ${section("Tablero", `<div class="kpis">${tiles}</div>`, { sub: "Los indicadores clave, con su último dato. Tocá cualquiera para ver el detalle." })}
    ${section("Lectura rápida", `<div class="card"><ul class="insights">${ins}</ul></div>`, { sub: "Lo que dicen los números, en criollo." })}
    ${section("Dólar hoy", `<a class="card" href="#/precios/dolar" style="display:block;color:inherit" id="${fxId}"><div class="skeleton" style="height:56px"></div></a>`, { link: ["Histórico", "#/precios/dolar"] })}
    <div class="foot">Fuente: INDEC — Catálogo API-INDEC.<br>Actualizado ${esc(ago(estado.actualizado))}.</div>`;
}

export function feedItem(it) {
  return `<a class="feed-item" href="${it.ruta}"><div class="ico">${ICON_FOR[it.id] || I.doc}</div>
    <div><div class="t">${esc(it.titulo)}</div><div class="d">${esc(it.texto)}</div><div class="w">${esc(ago(it.fecha))}</div></div></a>`;
}

function insights({ ipc, emae, sal, trab, can }) {
  const out = [];
  const b = (cls, ico, html) => out.push(`<li><span class="b ${cls}">${ico}</span><span>${html}</span></li>`);
  const g = ipc.general;
  const vm = lastOf(g.vm);
  const prev = g.vm[vm.i - 1];
  const nuc = ipc.categorias[ipc.nucleo_code];
  const nucV = nuc ? lastOf(nuc.vm).v : null;
  const avg3 = (a) => { const x = a.slice(-3).filter((v) => v !== null); return x.reduce((s, v) => s + v, 0) / x.length; };
  const a3 = avg3(g.vm), a3p = avg3(g.vm.slice(0, -3));
  if (vm.v !== null) {
    const dir = vm.v < prev ? "bajó" : vm.v > prev ? "subió" : "se mantuvo";
    b(vm.v <= prev ? "good" : "bad", vm.v <= prev ? I.down : I.up,
      `La inflación de <b>${period(ipc.p[vm.i], { long: true })}</b> ${dir} a <b>${pct(vm.v)}</b> (antes ${pct(prev)}). ` +
      (nucV !== null ? `La núcleo, que saca precios estacionales y regulados, fue ${pct(nucV)}${ipc.nucleo_3m_anual ? `; a este ritmo daría ${pct(ipc.nucleo_3m_anual, 0)} anual` : ""}.` : ""));
    b(a3 <= a3p ? "good" : "bad", a3 <= a3p ? I.down : I.up,
      `Promedio de los últimos 3 meses: <b>${pct(a3)}</b> mensual, ${a3 <= a3p ? "menor" : "mayor"} que el trimestre anterior (${pct(a3p)}).`);
  }
  const reg = sal.sectores.find((s) => s.name === "Sector privado registrado");
  const rv = lastOf(reg.real_via);
  if (rv.v !== null) {
    b(rv.v >= 0 ? "good" : "bad", rv.v >= 0 ? I.up : I.down,
      `El salario privado registrado ${rv.v >= 0 ? "le ganó" : "perdió"} a la inflación: <b>${n(rv.v, 1, { sign: true })}%</b> real en el último año (${period(sal.p[rv.i])}).`);
  }
  const em = emae.general;
  const ev = lastOf(em.via), ed = emae.pico?.dist;
  if (ev.v !== null) {
    b(ev.v >= 0 ? "good" : "bad", ev.v >= 0 ? I.up : I.down,
      `La actividad está <b>${n(ev.v, 1, { sign: true })}%</b> contra un año atrás` +
      (ed !== null && ed !== undefined ? (ed >= -0.2 ? " y en su máximo histórico." : ` y ${n(Math.abs(ed), 1)}% por debajo de su pico (${period(emae.pico.periodo)}).`) : "."));
  }
  const d = lastOf(trab.desocupacion);
  const d4 = trab.desocupacion[d.i - 4];
  if (d.v !== null && d4 !== undefined) {
    b(d.v <= d4 ? "good" : "bad", d.v <= d4 ? I.down : I.up,
      `La desocupación es <b>${pct(d.v)}</b> (${period(trab.p[d.i])}), ${d.v <= d4 ? "por debajo" : "por encima"} de un año antes (${pct(d4)}).`);
  }
  const cb = lastOf(can.cbt_via);
  const ia = lastOf(g.via);
  if (cb.v !== null && ia.v !== null) {
    const diff = cb.v - ia.v;
    b(diff <= 0 ? "good" : "bad", diff <= 0 ? I.down : I.up,
      `La canasta básica total subió ${pct(cb.v)} en un año, ${Math.abs(diff) < 0.5 ? "en línea con" : diff > 0 ? "más que" : "menos que"} la inflación general (${pct(ia.v)}).`);
  }
  return out.join("");
}

function localStorageGet(k) { try { return localStorage.getItem("pe:" + k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem("pe:" + k, v); } catch { /* sin almacenamiento */ } }
