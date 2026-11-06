import { bars } from "../charts.js";
import { I } from "../icons.js";
import { ago, ars, esc, lastOf, n, pct, period } from "../fmt.js";
import { card, chartCard, dolarHoy, load, loadMany, onMount, section, stats, switcher, updatedNote, RANGES_M } from "../ui.js";

export const title = "Precios";
const pf = (v) => n(v, 1) + "%";

export async function render() {
  const [ipc, can] = await loadMany("ipc", "canastas");
  const P = ipc.p, g = ipc.general;
  const L = P.length - 1;
  const cats = ipc.categorias;
  const nuc = cats.N, reg = cats.R, est = cats.E, bie = cats.B, ser = cats.S;

  const head = card(stats([
    { label: "Mensual", value: n(g.vm[L]), unit: "%", foot: `antes ${pct(g.vm[L - 1])}` },
    { label: "Interanual", value: n(g.via[L]), unit: "%", foot: `antes ${pct(g.via[L - 1])}` },
    { label: `Acumulada ${P[L].slice(0, 4)}`, value: n(g.vacum[L]), unit: "%", foot: `ene–${period(P[L]).slice(0, 3)}` },
  ]), { concept: "ipc", title: `Inflación de ${period(P[L], { long: true })}`, sub: "Índice de precios al consumidor (IPC), total nacional",
    infoText: "El IPC mide cuánto cambian, en promedio, los precios de lo que compran los hogares. <b>Mensual</b>: contra el mes anterior. <b>Interanual</b>: contra el mismo mes del año pasado. <b>Acumulada</b>: desde diciembre del año anterior." });

  const evol = chartCard({
    concept: "variaciones", title: "Evolución de la inflación", sub: "Mensual: contra el mes anterior · Interanual: contra el mismo mes del año pasado", modes: [["Mensual", "vm"], ["Interanual", "via"]], range: 24,
    render: (m) => (m === "vm"
      ? { type: "col", x: P, values: g.vm, name: "Inflación mensual", fmt: pf }
      : { type: "line", x: P, series: [{ name: "Inflación interanual", values: g.via, color: "var(--s1)", area: true }], fmt: pf }),
  });

  const comp = chartCard({
    concept: "nucleo", title: "Núcleo, regulados y estacionales", sub: "Variación mensual",
    infoText: "<b>Núcleo</b>: la inflación “de fondo”, sin los precios más volátiles. <b>Regulados</b>: precios con fuerte intervención del Estado (tarifas, combustibles, prepagas, transporte). <b>Estacionales</b>: frutas, verduras, ropa, turismo. Si la núcleo baja, la desinflación es más genuina.",
    range: 24,
    render: () => ({ type: "line", x: P, fmt: pf, series: [
      { name: "Núcleo", values: nuc.vm, color: "var(--s1)" },
      { name: "Regulados", values: reg.vm, color: "var(--s2)" },
      { name: "Estacionales", values: est.vm, color: "var(--s3)" }] }),
  }) + card(stats([
    { label: "Núcleo anualizada", value: ipc.nucleo_3m_anual !== null ? n(ipc.nucleo_3m_anual, 0) : "s/d", unit: "%", foot: "ritmo de los últimos 3 meses" },
    { label: "Bienes", value: n(bie.vm[L]), unit: "%", foot: `${pct(bie.via[L])} interanual` },
    { label: "Servicios", value: n(ser.vm[L]), unit: "%", foot: `${pct(ser.via[L])} interanual` },
  ]));

  const rubros = card(switcher({
    options: [["Mensual", "vm"], ["Interanual", "via"]],
    render: (m) => {
      const items = ipc.divisiones.map((d) => ({ label: d.name, value: d[m][L] }))
        .concat([{ label: "Nivel general", value: g[m][L], hl: true, color: "var(--ink-2)" }])
        .sort((a, b) => b.value - a.value);
      return bars(items, { fmt: pf });
    },
  }), { concept: "rubros", title: "Por rubro", sub: `${period(P[L], { long: true })} · 12 divisiones del IPC`, source: "INDEC" });

  const reg_ = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Región</th><th class="r">Mensual</th><th class="r">Interanual</th></tr></thead><tbody>
    ${ipc.regiones.map((r) => `<tr class="${r.name === "Nacional" ? "hl" : ""}"><td>${esc(r.name === "Nacional" ? "Total nacional" : r.name)}</td><td class="r">${pct(r.vm)}</td><td class="r">${pct(r.via)}</td></tr>`).join("")}
    </tbody></table></div>`, { concept: "regiones", title: "Por región", sub: period(P[L], { long: true }), source: "INDEC" });

  // ── Canastas ──
  const CP = can.p, CL = CP.length - 1;
  const canHead = card(stats([
    { label: "Para no ser pobre · CBT", value: ars(can.cbt_h2[CL], { short: true }), foot: `${n(can.cbt_vm[CL], 1, { sign: true })}% mensual` },
    { label: "Para no ser indigente · CBA", value: ars(can.cba_h2[CL], { short: true }), foot: `${n(can.cba_vm[CL], 1, { sign: true })}% mensual` },
  ]) + `<p class="small muted" style="margin:10px 0 0">Ingreso mensual que necesita una familia tipo (2 adultos y 2 chicos) en GBA para no ser pobre (CBT) o indigente (CBA).</p>`,
  { concept: "canastas", title: `Canastas básicas · ${period(CP[CL], { long: true })}`,
    infoText: "La <b>Canasta Básica Alimentaria (CBA)</b> cubre las necesidades mínimas de alimentos: quien no llega es indigente. La <b>Canasta Básica Total (CBT)</b> suma otros bienes y servicios (ropa, transporte, salud, educación): quien no llega es pobre." });

  const canHog = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hogar</th><th class="r">CBA<div class="small muted" style="font-weight:400">alimentos</div></th><th class="r">CBT<div class="small muted" style="font-weight:400">alimentos + otros</div></th></tr></thead><tbody>
    <tr><td>${esc(can.hogares.h1)}</td><td class="r">${ars(can.cba_h1[CL])}</td><td class="r">${ars(can.cbt_h1[CL])}</td></tr>
    <tr class="hl"><td>${esc(can.hogares.h2)}</td><td class="r">${ars(can.cba_h2[CL])}</td><td class="r">${ars(can.cbt_h2[CL])}</td></tr>
    <tr><td>${esc(can.hogares.h3)}</td><td class="r">${ars(can.cba_h3[CL])}</td><td class="r">${ars(can.cbt_h3[CL])}</td></tr>
    <tr><td>Por adulto equivalente</td><td class="r">${ars(can.cba_ae[CL])}</td><td class="r">${ars(can.cbt_ae[CL])}</td></tr>
    </tbody></table></div>`, { concept: "canastas_hogar", title: "Según el tipo de hogar", sub: "Pesos por mes", source: "INDEC" });

  const ipcVia = Object.fromEntries(P.map((p, i) => [p, g.via[i]]));
  const canChart = chartCard({
    concept: "canastas", title: "Canastas vs. inflación", sub: "Cuánto subió cada una en los últimos 12 meses (variación interanual)", range: 24,
    infoText: "<b>CBT</b> (Canasta Básica Total): lo mínimo para no ser pobre — alimentos más ropa, transporte, salud, educación y otros gastos. <b>CBA</b> (Canasta Básica Alimentaria): solo los alimentos mínimos; quien no la cubre es indigente. <b>IPC</b> (Índice de Precios al Consumidor): la inflación promedio de todo lo que consumen los hogares. Si las canastas suben más que el IPC, a los hogares de menores ingresos les pega más la inflación.",
    render: () => ({ type: "line", x: CP, fmt: pf, series: [
      { name: "CBT · Canasta básica total (pobreza)", values: can.cbt_via, color: "var(--s4)" },
      { name: "CBA · Canasta básica alimentaria (indigencia)", values: can.cba_via, color: "var(--s2)" },
      { name: "IPC · Inflación general", values: CP.map((p) => ipcVia[p] ?? null), color: "var(--s1)" }] }),
  });

  // ── Dólar ──
  const fxId = "fx-precios";
  onMount(async () => {
    const box = document.getElementById(fxId);
    if (!box) return;
    try {
      const fx = await dolarHoy();
      const of = fx.by.oficial?.venta;
      const rows = [["oficial", "Oficial (BNA)"], ["mayorista", "Mayorista"], ["bolsa", "MEP"], ["contadoconliqui", "Contado con liqui"], ["blue", "Blue"], ["tarjeta", "Tarjeta"]];
      box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th class="r">Compra</th><th class="r">Venta</th><th class="r">Brecha</th></tr></thead><tbody>
        ${rows.filter(([c]) => fx.by[c]).map(([c, label]) => { const r = fx.by[c]; return `<tr><td>${label}</td><td class="r">${r.compra ? "$" + n(r.compra, 0) : "–"}</td><td class="r"><b>$${n(r.venta, 0)}</b></td>
          <td class="r">${c === "oficial" || !of ? "–" : n((r.venta / of - 1) * 100, 1, { sign: true }) + "%"}</td></tr>`; }).join("")}
        </tbody></table></div><div class="source">${fx.live ? "En vivo · dolarapi.com" : "Último cierre · argentinadatos.com"} · ${esc(fx.fecha ? ago(fx.fecha) : "")}. Brecha contra el oficial.</div>`;
    } catch { box.innerHTML = '<div class="muted small">No se pudo obtener la cotización.</div>'; }
  });
  const dol = await load("dolar");
  const byId = Object.fromEntries(dol.casas.map((c) => [c.id, c]));
  const dRanges = [["3M", 66], ["1A", 250], ["3A", 750], ["Todo", 0]];
  const dolChart = chartCard({
    concept: "dolar", title: "Cotización histórica", sub: "Precio de venta, en pesos. En “Brecha”: cuánto más caro que el oficial",
    infoText: "<b>Oficial</b>: el que vende el Banco Nación. <b>MEP</b> (Mercado Electrónico de Pagos) o dólar bolsa: se obtiene comprando y vendiendo bonos en pesos y en dólares, dentro del país. <b>CCL</b> (contado con liquidación): igual, pero los dólares quedan en una cuenta del exterior. <b>Blue</b>: el mercado informal. La <b>brecha</b> es cuánto más caro está cada uno respecto del oficial.", ranges: dRanges, range: 250,
    modes: [["Precio", "v"], ["Brecha", "b"]],
    source: "argentinadatos.com (no es dato del INDEC)",
    render: (m) => {
      const ser = [["oficial", "Oficial (Banco Nación)", "var(--s1)"], ["bolsa", "MEP · dólar bolsa", "var(--s3)"], ["contadoconliqui", "CCL · contado con liquidación", "var(--s7)"], ["blue", "Blue · informal", "var(--s2)"]]
        .filter(([c]) => byId[c]);
      if (m === "v") return { type: "line", x: dol.fechas, fmt: (v) => "$" + n(v, 0), yfmt: (v) => n(v, 0), series: ser.map(([c, name, color]) => ({ name, color, values: byId[c].v })) };
      const of = byId.oficial.v;
      return { type: "line", x: dol.fechas, fmt: (v) => n(v, 1) + "%", zero: true,
        series: ser.slice(1).map(([c, name, color]) => ({ name, color, values: byId[c].v.map((v, i) => (v && of[i] ? (v / of[i] - 1) * 100 : null)) })) };
    },
  });

  return `
    ${section("Inflación", head + evol)}
    ${section("¿Qué empuja los precios?", comp)}
    ${section("Rubros y regiones", rubros + reg_)}
    ${section("Canastas básicas", canHead + canChart + canHog, { idAttr: "canastas" })}
    ${section("Dólar", card(`<div id="${fxId}"><div class="skeleton" style="height:180px"></div></div>`, { concept: "dolar", title: "Cotizaciones de hoy" }) + dolChart, { idAttr: "dolar", sub: "Fuente externa al INDEC, para tener el panorama completo." })}
    ${section("Más sobre precios", card(`<div class="list">
      <a class="list-item" href="#/mas/caba"><div class="ico">${I.prices}</div><div><div class="t">Inflación porteña (IPCBA)</div><div class="d">La mide la Ciudad y sale antes que la del INDEC</div></div><div class="v">→</div></a>
      <a class="list-item" href="#/mas/mayoristas"><div class="ico">${I.wholesale}</div><div><div class="t">Precios mayoristas</div><div class="d">IPIM, IPIB e IPP: suelen anticipar al IPC</div></div><div class="v">→</div></a>
      <a class="list-item" href="#/mas/construccion"><div class="ico">${I.crane}</div><div><div class="t">Costo de la construcción</div><div class="d">Materiales, mano de obra y gastos generales</div></div><div class="v">→</div></a>
    </div>`))}
    <div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
}
