import { bars, pyramid } from "../charts.js";
import { ars, big, esc, lastOf, n, pct, period, usdM } from "../fmt.js";
import { I } from "../icons.js";
import { card, chartCard, load, loadMany, onMount, section, stats, switcher, updatedNote } from "../ui.js";

const pf = (v) => n(v, 1) + "%";
const pfs = (v) => n(v, 1, { sign: true }) + "%";
const bn = (v) => "US$ " + n(v / 1000, 1) + " mil M";

// ───────── Índice de "Más indicadores" ─────────
export const title = "Más indicadores";
export async function render() {
  const estado = await load("estado");
  const t = estado.tablas;
  const u = estado.ultimos;
  const item = (key, route, icon, name, desc) => {
    const h = u[key];
    return `<a class="list-item" href="#/mas/${route}"><div class="ico">${icon}</div>
      <div><div class="t">${esc(name)}</div><div class="d">${esc(desc)}</div></div>
      <div class="v">${h ? esc(period(h.periodo, { short: true })) : ""}<small>${esc(t[key]?.frecuencia || "")}</small></div></a>`;
  };
  return `
    <p class="section-sub" style="margin-top:12px">El resto de los datos que publica el INDEC en su API, ordenados por tema.</p>
    ${section("Sector externo", card(`<div class="list">
      ${item("comex", "comercio", I.ship, "Comercio exterior", "Exportaciones, importaciones, balanza y socios")}
    </div>`))}
    ${section("Precios", card(`<div class="list">
      ${item("mayoristas", "mayoristas", I.wholesale, "Precios mayoristas", "IPIM, IPIB e IPP")}
      ${item("icc", "construccion", I.crane, "Costo de la construcción", "ICC en el Gran Buenos Aires")}
      ${item("obra_publica", "obra-publica", I.doc, "Índices para obra pública", "Redeterminación de contratos (Decreto 1295/02)")}
    </div>`))}
    ${section("Producción", card(`<div class="list">
      ${item("ipi_manufacturero", "industria", I.factory, "Industria", "Índice de producción industrial manufacturero")}
      ${item("ipi_minero", "mineria", I.mine, "Minería, petróleo y gas", "Índice de producción industrial minero")}
    </div>`))}
    ${section("Ciudad de Buenos Aires", card(`<div class="list">
      ${item("caba_ipc", "caba", I.prices, "Inflación porteña (IPCBA)", "Sale antes que la del INDEC")}
      ${item("caba_alquileres", "caba/alquileres", I.home, "Alquileres en la Ciudad", "Precio de 1, 2 y 3 ambientes")}
      ${item("caba_lineas", "caba/pobreza", I.basket, "Líneas de pobreza porteñas", "Ingreso necesario según el hogar")}
    </div>`), { sub: "Datos del Instituto de Estadística de la Ciudad (IDECBA)." })}
    ${section("Sociedad", card(`<div class="list">
      ${item("crianza", "crianza", I.child, "Canasta de crianza", "Costo de criar a un chico según su edad")}
      ${item("poblacion", "poblacion", I.people, "Población", "Proyecciones por edad, provincia y departamento")}
    </div>`))}
    ${section("App", card(`<div class="list">
      <a class="list-item" href="#/calendario"><div class="ico">${I.calendar}</div><div><div class="t">Calendario de publicaciones</div><div class="d">Cuándo sale cada dato del INDEC y la Ciudad</div></div><div class="v">→</div></a>
      <a class="list-item" href="#/ajustes"><div class="ico">${I.bell}</div><div><div class="t">Notificaciones</div><div class="d">Recibí un aviso cuando el INDEC publica</div></div><div class="v">→</div></a>
      <a class="list-item" href="#/acerca"><div class="ico">${I.info}</div><div><div class="t">Fuentes y metodología</div><div class="d">De dónde salen los datos y cómo se calculan</div></div><div class="v">→</div></a>
    </div>`))}`;
}

// ───────── Comercio exterior ─────────
export const comercio = {
  title: "Comercio exterior", back: "#/mas",
  async render() {
    const c = await load("comex");
    const P = c.p, L = P.length - 1;
    const sum12 = (a, i) => a.slice(i - 11, i + 1).reduce((s, v) => s + (v || 0), 0);
    const e12 = sum12(c.expo, L), i12 = sum12(c.impo, L), e12p = sum12(c.expo, L - 12), i12p = sum12(c.impo, L - 12);
    const head = card(stats([
      { label: "Exportaciones", value: usdM(c.expo[L]), foot: `${pfs((c.expo[L] / c.expo[L - 12] - 1) * 100)} interanual` },
      { label: "Importaciones", value: usdM(c.impo[L]), foot: `${pfs((c.impo[L] / c.impo[L - 12] - 1) * 100)} interanual` },
      { label: c.saldo[L] >= 0 ? "Superávit" : "Déficit", value: usdM(Math.abs(c.saldo[L])), foot: "saldo del mes" },
    ]) + `<p class="small muted" style="margin:12px 0 0">Últimos 12 meses: exportaciones ${bn(e12)} (${pfs((e12 / e12p - 1) * 100)}), importaciones ${bn(i12)} (${pfs((i12 / i12p - 1) * 100)}), saldo ${bn(e12 - i12)}.</p>`,
    { concept: "comex", title: `Intercambio comercial · ${period(P[L], { long: true })}`, sub: "Millones de dólares",
      infoText: "Exportaciones valuadas FOB (en el puerto argentino) e importaciones CIF (incluyen flete y seguro). Los totales surgen de sumar las aperturas que publica la API; pueden diferir levemente de los informes oficiales por redondeo y por datos confidenciales. <b>Balanza de pagos</b>: el INDEC todavía no la publica en su API." });
    const saldo = chartCard({ concept: "balanza", title: "Balanza comercial", sub: "Exportaciones menos importaciones, millones de US$", range: 24,
      render: () => ({ type: "col", x: P, values: c.saldo, name: "Saldo", fmt: (v) => n(v, 0) }) });
    const flujos = chartCard({ concept: "comex", title: "Exportaciones e importaciones", sub: "Millones de US$ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "Exportaciones", values: c.expo, color: "var(--s1)" }, { name: "Importaciones", values: c.impo, color: "var(--s2)" }] }) });
    const share = (rows) => {
      const tot = rows.reduce((s, r) => s + (r.v[L] || 0), 0);
      return bars(rows.map((r) => ({ label: r.name, value: (r.v[L] / tot) * 100 })).sort((a, b) => b.value - a.value), { fmt: (v) => n(v, 0) + "%" });
    };
    const comp = card(switcher({ options: [["Exportaciones", "e"], ["Importaciones", "i"]],
      render: (m) => share(m === "e" ? c.rubros : c.usos) }),
    { concept: "composicion", title: "¿Qué vendemos y qué compramos?", sub: `Participación en ${period(P[L], { long: true })}`, source: "INDEC" });
    const soc = card(switcher({ options: [["Destinos de expo.", "e"], ["Orígenes de impo.", "i"]],
      render: (m) => bars((m === "e" ? c.socios_expo : c.socios_impo).slice(0, 10).map((s) => ({ label: s.name, value: s.v })), { fmt: (v) => usdM(v), color: "var(--s7)" }) }),
    { concept: "socios", title: "Principales socios", sub: `Acumulado ${period(c.socios_desde)} – ${period(c.socios_hasta)}`, source: "INDEC" });
    const rub = chartCard({ concept: "composicion", title: "Exportaciones por gran rubro", sub: "Millones de US$", range: 36,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: c.rubros.map((r, k) => ({ name: r.name.replace(/ \(.*\)/, "").replace("Manufacturas de origen", "Manuf."), values: r.v, color: `var(--s${k + 1})` })) }) });
    return section("Balanza", head + saldo + flujos) + section("Composición", comp + rub) + section("Socios comerciales", soc) +
      `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Precios mayoristas ─────────
export const mayoristas = {
  title: "Precios mayoristas", back: "#/mas",
  async render() {
    const [m, ipc] = await loadMany("mayoristas", "ipc");
    const P = m.p, L = P.length - 1;
    const ipcVm = Object.fromEntries(ipc.p.map((p, i) => [p, ipc.general.vm[i]]));
    const head = card(stats([
      { label: "IPIM · mayoristas", value: n(m.IPIM.vm[L]), unit: "%", foot: `${pf(m.IPIM.via[L])} interanual` },
      { label: "IPIB · sin impuestos", value: n(m.IPIB.vm[L]), unit: "%", foot: `${pf(m.IPIB.via[L])} interanual` },
      { label: "IPP · productor", value: n(m.IPP.vm[L]), unit: "%", foot: `${pf(m.IPP.via[L])} interanual` },
    ]), { concept: "mayoristas", title: `Sistema de precios mayoristas · ${period(P[L], { long: true })}`, sub: "Variación mensual",
      infoText: "<b>IPIM</b>: precios mayoristas internos (incluye impuestos e importados). <b>IPIB</b>: igual pero sin impuestos. <b>IPP</b>: precios básicos del productor, solo producción nacional. Los precios mayoristas suelen trasladarse al consumidor con algunos meses de demora." });
    const vs = chartCard({ concept: "mayoristas_vs_ipc", title: "Mayoristas vs. consumidor", sub: "Variación mensual", range: 24,
      render: () => ({ type: "line", x: P, fmt: pf, series: [
        { name: "IPIM · Precios mayoristas", values: m.IPIM.vm, color: "var(--s2)" },
        { name: "IPC · Precios al consumidor", values: P.map((p) => ipcVm[p] ?? null), color: "var(--s1)" }] }) });
    const comps = card(switcher({ options: [["IPIM · mayoristas", "IPIM"], ["IPIB · sin imp.", "IPIB"], ["IPP · productor", "IPP"]],
      render: (k) => bars(m[k].componentes.map((c) => ({ label: c.name, value: c.vm[L] })).sort((a, b) => b.value - a.value), { fmt: pf, color: "var(--s2)" }) }),
    { concept: "mayoristas", title: "Por componente", sub: `Variación mensual · ${period(P[L])}`, source: "INDEC, SIPM" });
    return section("Precios mayoristas", head + vs + comps) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Construcción ─────────
export const construccion = {
  title: "Costo de la construcción", back: "#/mas",
  async render() {
    const d = await load("icc");
    const P = d.p, L = P.length - 1;
    const caps = Object.fromEntries(d.capitulos.map((c) => [c.name, c]));
    const head = card(stats([
      { label: "Mensual", value: n(d.general.vm[L]), unit: "%", foot: `antes ${pf(d.general.vm[L - 1])}` },
      { label: "Interanual", value: n(d.general.via[L]), unit: "%" },
      { label: "Mano de obra", value: n(caps["Mano de obra"]?.vm[L]), unit: "%", foot: "mensual" },
    ]), { concept: "icc", title: `Índice del costo de la construcción · ${period(P[L], { long: true })}`, sub: "Vivienda tipo en el Gran Buenos Aires",
      infoText: "El ICC mide cuánto cuesta construir una vivienda modelo en el GBA. Se divide en tres capítulos: materiales, mano de obra y gastos generales." });
    const chart = chartCard({ concept: "icc", title: "Por capítulo", sub: "Variación interanual", range: 36,
      render: () => ({ type: "line", x: P, fmt: pf, series: d.capitulos.map((c, k) => ({ name: c.name, values: c.via, color: `var(--s${k + 1})` })) }) });
    const items = card(bars(d.items.map((i) => ({ label: i.name, value: i.via })), { fmt: pf, color: "var(--s4)" }),
      { concept: "icc", title: "Por ítem de obra", sub: `Variación interanual · ${period(P[L])}`, source: "INDEC" });
    return section("Construcción", head + chart + items) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Obra pública ─────────
export const obraPublica = {
  title: "Obra pública", back: "#/mas",
  async render() {
    const d = await load("obra_publica");
    const P = d.p, L = P.length - 1;
    const sid = "op-search";
    const rows = (q) => d.incisos.filter((i) => !q || (i.name + i.detalle).toLowerCase().includes(q)).map((i) =>
      `<tr><td><b>${esc(i.inciso)})</b> ${esc(i.name)}<div class="small muted">${esc(i.detalle)}${i.origen && i.origen !== "-" ? " · " + esc(i.origen) : ""} · ${esc(i.fuente)}</div></td>
       <td class="r">${pf(i.vm[L])}</td><td class="r">${pf(i.via[L])}</td></tr>`).join("");
    onMount(() => {
      const inp = document.getElementById(sid);
      inp?.addEventListener("input", () => { document.getElementById(sid + "-b").innerHTML = rows(inp.value.trim().toLowerCase()); });
    });
    return section("Redeterminación de precios", card(`<input class="search" id="${sid}" type="search" placeholder="Buscar insumo…">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Inciso</th><th class="r">Mensual</th><th class="r">Interanual</th></tr></thead><tbody id="${sid}-b">${rows("")}</tbody></table></div>`,
    { concept: "obra_publica", title: `Índices del Decreto 1295/2002 · ${period(P[L], { long: true })}`,
      infoText: "Son los índices que se usan para actualizar los precios de los contratos de obra pública. Cada inciso (a, b, c…) corresponde a un insumo del decreto; la fuente es el ICC o el índice de precios mayoristas básicos (IPIB).", source: "INDEC" }),
    { sub: "Herramienta técnica para empresas constructoras y organismos públicos." }) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Industria ─────────
export const industria = {
  title: "Industria", back: "#/mas",
  async render() {
    const d = await load("ipi_manufacturero");
    const P = d.p, g = d.general;
    const L = lastOf(g.vm).i;
    const head = card(stats([
      { label: "Mensual (sin estacionalidad)", value: n(g.vm[L], 1, { sign: true }), unit: "%" },
      { label: "Interanual", value: n(g.via[L], 1, { sign: true }), unit: "%" },
      { label: "Acumulado del año", value: n(g.acum[L], 1, { sign: true }), unit: "%", foot: "vs. mismo período" },
    ]), { concept: "ipi_manuf", title: `Producción industrial · ${period(P[L], { long: true })}`, sub: "IPI manufacturero",
      infoText: "El índice de producción industrial manufacturero mide el volumen físico que producen las fábricas. Es uno de los primeros datos que muestra cómo viene la actividad." });
    const nivel = chartCard({ concept: "ipi_manuf", title: "Nivel de producción", sub: "Serie desestacionalizada, base 2004 = 100", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [{ name: "Producción industrial (IPI manufacturero)", values: g.desest, color: "var(--s1)", area: true }] }) });
    const vars = chartCard({ concept: "variaciones", title: "Variación interanual", range: 24, render: () => ({ type: "col", x: P, values: g.via, name: "Interanual", fmt: pfs }) });
    const divs = card(bars(d.divisiones.map((x) => ({ label: x.name, value: x.via[L] })).sort((a, b) => b.value - a.value), { fmt: pfs, color: "var(--s3)" }),
      { concept: "ipi_manuf", title: "Por rama", sub: `Variación interanual · ${period(P[L])}`, source: "INDEC" });
    return section("Industria manufacturera", head + nivel + vars) + section("Ramas industriales", divs) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Minería ─────────
export const mineria = {
  title: "Minería y energía", back: "#/mas",
  async render() {
    const d = await load("ipi_minero");
    const P = d.p, g = d.general, L = lastOf(g.vm).i;
    const prod = Object.fromEntries(d.productos.map((p) => [p.name, p]));
    const ia = (p) => { const v = prod[p]?.v; return v && v[L] && v[L - 12] ? (v[L] / v[L - 12] - 1) * 100 : null; };
    const head = card(stats([
      { label: "Mensual (sin estacionalidad)", value: n(g.vm[L], 1, { sign: true }), unit: "%" },
      { label: "Interanual", value: g.via.length ? n(g.via[L], 1, { sign: true }) : "s/d", unit: "%" },
      { label: "Petróleo", value: n(ia("Petróleo crudo"), 1, { sign: true }), unit: "%", foot: "producción i.a." },
    ]), { concept: "ipi_minero", title: `Producción minera · ${period(P[L], { long: true })}`, sub: "Índice de producción industrial minero (IPI minero)",
      infoText: "Mide la producción de petróleo, gas, minerales metalíferos (oro, plata, litio, cobre), y rocas y minerales para construcción. El crecimiento de Vaca Muerta se ve en el petróleo y gas <b>no convencional</b>." });
    const lvl = chartCard({ concept: "ipi_minero", title: "Nivel de producción", sub: "Serie desestacionalizada, base 2016 = 100", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [{ name: "Producción minera (IPI minero)", values: g.desest, color: "var(--s6)", area: true }] }) });
    const oil = chartCard({ concept: "petroleo", title: "Petróleo crudo", sub: "Miles de m³ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "No convencional", values: prod["Petróleo crudo no convencional"]?.v || [], color: "var(--s1)" },
        { name: "Convencional", values: prod["Petróleo crudo convencional"]?.v || [], color: "var(--s2)" }] }) });
    const gas = chartCard({ concept: "petroleo", title: "Gas natural", sub: "Millones de m³ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "No convencional", values: prod["Gas natural no convencional"]?.v || [], color: "var(--s1)" },
        { name: "Convencional", values: prod["Gas natural convencional"]?.v || [], color: "var(--s2)" }] }) });
    const lit = chartCard({ concept: "litio", title: "Carbonato de litio", sub: "Toneladas por mes", range: 60,
      render: () => ({ type: "col", x: P, values: prod["Carbonato de litio"]?.v || [], name: "Carbonato de litio", fmt: (v) => n(v, 0), pos: "var(--s3)" }) });
    return section("Minería", head + lvl) + section("Energía y litio", oil + gas + lit) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Canasta de crianza ─────────
export const crianza = {
  title: "Canasta de crianza", back: "#/ingresos",
  async render() {
    const d = await load("crianza");
    const P = d.p, L = P.length - 1;
    const rows = d.tramos.map((t) => `<tr><td>${esc(t.name)}</td><td class="r">${ars(t.bys[L])}</td><td class="r">${ars(t.cuid[L])}</td><td class="r"><b>${ars(t.tot[L])}</b></td></tr>`).join("");
    const head = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Edad</th><th class="r">Bienes y servicios</th><th class="r">Cuidado</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      { concept: "crianza", title: `Costo mensual de criar a un chico · ${period(P[L], { long: true })}`, sub: "Pesos por mes",
        infoText: "La canasta de crianza estima cuánto cuesta criar a un chico: los <b>bienes y servicios</b> que necesita (alimentos, ropa, salud, educación) más el <b>tiempo de cuidado</b>, valorizado según el salario de una trabajadora de casas particulares.", source: "INDEC" });
    const ch = chartCard({ concept: "crianza", title: "Evolución del costo total", sub: "Pesos por mes", range: 24,
      render: () => ({ type: "line", x: P, fmt: (v) => ars(v, { short: true }), yfmt: (v) => n(v / 1000, 0) + "k",
        series: d.tramos.map((t, k) => ({ name: t.name, values: t.tot, color: `var(--s${k + 1})` })) }) });
    return section("Canasta de crianza", head + ch) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
  },
};

// ───────── Ciudad de Buenos Aires (IDECBA) ─────────
export const caba = {
  title: "Ciudad de Buenos Aires", back: "#/mas",
  async render() {
    const [c, lin, alq, ipc] = await loadMany("caba_ipc", "caba_lineas", "caba_alquileres", "ipc");
    const P = c.p, L = P.length - 1;
    const dic = P.lastIndexOf(`${+P[L].slice(0, 4) - 1}-12`);
    const acum = dic >= 0 ? (c.idx[L] / c.idx[dic] - 1) * 100 : null;
    const ipcVia = Object.fromEntries(ipc.p.map((p, i) => [p, ipc.general.via[i]]));
    const ipcVm = Object.fromEntries(ipc.p.map((p, i) => [p, ipc.general.vm[i]]));
    const nac = ipcVm[P[L]];
    const head = card(stats([
      { label: "Mensual", value: n(c.vm[L]), unit: "%", foot: `antes ${pf(c.vm[L - 1])}` },
      { label: "Interanual", value: n(c.via[L]), unit: "%", foot: `antes ${pf(c.via[L - 1])}` },
      { label: `Acumulada ${P[L].slice(0, 4)}`, value: n(acum), unit: "%", foot: "desde diciembre" },
    ]) + `<p class="small muted" style="margin:12px 0 0">${nac !== undefined && nac !== null
      ? `El INDEC midió ${pf(nac)} para el total del país en ${period(P[L])}.`
      : `El INDEC todavía no publicó la inflación nacional de ${period(P[L], { long: true })}: este dato llega antes y sirve de anticipo.`}</p>`,
    { concept: "caba_ipc", title: `Inflación porteña · ${period(P[L], { long: true })}`, sub: "Índice de Precios al Consumidor de la Ciudad (IPCBA)", source: "IDECBA" });
    const evol = chartCard({ concept: "variaciones", title: "Evolución de la inflación porteña", source: "IDECBA",
      sub: "Mensual: contra el mes anterior · Interanual: contra el mismo mes del año pasado",
      modes: [["Mensual", "m"], ["Interanual", "a"]], range: 24,
      render: (m) => (m === "m" ? { type: "col", x: P, values: c.vm, name: "Inflación mensual (IPCBA)", fmt: pf }
        : { type: "line", x: P, fmt: pf, series: [{ name: "IPCBA · Ciudad", values: c.via, color: "var(--s1)" },
          { name: "IPC INDEC · total país", values: P.map((p) => ipcVia[p] ?? null), color: "var(--s2)" }] }) });
    const K = c.categorias;
    const comp = chartCard({ concept: "caba_ipc", title: "Estacionales, regulados y resto", sub: "Variación mensual. “Resto IPCBA” es la inflación de fondo (como la núcleo)", source: "IDECBA", range: 24,
      render: () => ({ type: "line", x: P, fmt: pf, series: [
        { name: "Resto IPCBA (de fondo)", values: K.resto.vm, color: "var(--s1)" },
        { name: "Regulados", values: K.regulados.vm, color: "var(--s2)" },
        { name: "Estacionales", values: K.estacionales.vm, color: "var(--s3)" }] }) }) +
      card(stats([
        { label: "Resto IPCBA", value: n(K.resto.vm[L]), unit: "%", foot: `${pf(K.resto.via[L])} interanual` },
        { label: "Bienes", value: n(K.bienes.vm[L]), unit: "%", foot: `${pf(K.bienes.via[L])} interanual` },
        { label: "Servicios", value: n(K.servicios.vm[L]), unit: "%", foot: `${pf(K.servicios.via[L])} interanual` },
      ]));
    const IL = c.pi.length - 1;
    const inc = card(bars(c.divisiones.map((d) => ({ label: d.name, value: d.inc[IL] })).sort((a, b) => b.value - a.value),
      { fmt: (v) => n(v, 2) + " p.p.", color: "var(--s1)" }),
    { concept: "caba_incidencia", title: "¿Qué rubros empujaron la inflación?", sub: `Puntos que aportó cada rubro a la inflación de ${period(c.pi[IL], { long: true })} (${pf(c.vm[L])})`, source: "IDECBA" });

    // Alquileres
    const AP = alq.p, AL = AP.length - 1;
    const A = alq.ambientes;
    const prov = alq.provisorio.includes(AP[AL]) ? " (provisorio)" : "";
    const alqHead = card(stats(A.map((a) => ({ label: a.name, value: ars(a.v[AL], { short: true }), foot: `${n(a.via[AL], 1, { sign: true })}% interanual` }))) +
      `<p class="small muted" style="margin:12px 0 0">Precio promedio publicado por mes, sin expensas, para ${A.map((a) => `${a.name.split(" ")[0]} amb. = ${a.m2} m²`).join(" · ")}.</p>`,
    { concept: "alquileres", title: `Alquileres · ${period(AP[AL], { long: true })}${prov}`, sub: "Departamentos usados y a estrenar en la Ciudad", source: "IDECBA sobre avisos de Argenprop" });
    const caVia = Object.fromEntries(P.map((p, i) => [p, c.via[i]]));
    const alqChart = chartCard({ concept: "alquileres", title: "Evolución de los alquileres", source: "IDECBA", range: 36,
      sub: "Precio: pesos por mes · Vs. inflación: suba interanual del alquiler contra el IPCBA",
      modes: [["Precio", "v"], ["Vs. inflación", "i"]],
      render: (m) => (m === "v"
        ? { type: "line", x: AP, fmt: (v) => ars(v, { short: true }), yfmt: (v) => n(v / 1000, 0) + "k",
          series: A.map((a, k) => ({ name: a.name, values: a.v, color: `var(--s${k + 1})` })) }
        : { type: "line", x: AP, fmt: pf, series: [
          { name: "Alquiler 2 ambientes", values: A[1].via, color: "var(--s7)" },
          { name: "Inflación porteña (IPCBA)", values: AP.map((p) => caVia[p] ?? null), color: "var(--s8)" }] }) });

    // Líneas de pobreza
    const LP = lin.p, LL = LP.length - 1;
    const rows = lin.hogares.map((h, k) => `<tr class="${k === 0 ? "hl" : ""}"><td><b>Hogar ${k + 1}</b><div class="small muted">${esc(h.desc)}</div></td>
      <td class="r">${ars(h.li[LL])}</td><td class="r">${ars(h.lp[LL])}</td></tr>`).join("");
    const linTbl = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tipo de hogar</th><th class="r">Indigencia<div class="small muted" style="font-weight:400">alimentos</div></th><th class="r">Pobreza<div class="small muted" style="font-weight:400">alimentos + otros</div></th></tr></thead><tbody>${rows}</tbody></table></div>`,
      { concept: "caba_lineas", title: `Ingreso necesario por mes · ${period(LP[LL], { long: true })}`, sub: "Para no ser indigente o pobre en la Ciudad", source: "IDECBA" });
    const linChart = chartCard({ concept: "caba_lineas", title: "Línea de pobreza vs. inflación", sub: "Variación interanual", source: "IDECBA", range: 36,
      render: () => ({ type: "line", x: LP, fmt: pf, series: [
        { name: "Línea de pobreza · hogar 1", values: lin.hogares[0].lp_via, color: "var(--s4)" },
        { name: "Inflación porteña (IPCBA)", values: LP.map((p) => caVia[p] ?? null), color: "var(--s1)" }] }) });

    return `<p class="section-sub" style="margin-top:12px">Datos del Instituto de Estadística y Censos de la Ciudad de Buenos Aires (IDECBA), distinto del INDEC.</p>` +
      section("Inflación porteña", head + evol) + section("Qué la empuja", comp + inc) +
      section("Alquileres", alqHead + alqChart, { idAttr: "alquileres" }) +
      section("Pobreza en la Ciudad", linTbl + linChart, { idAttr: "pobreza-caba" }) +
      `<div class="foot">${updatedNote(P[L])} · Fuente: IDECBA (estadisticaciudad.gob.ar)</div>`;
  },
};

// ───────── Población ─────────
export const poblacion = {
  title: "Población", back: "#/mas",
  async render() {
    const d = await load("poblacion");
    const y0 = d.anio_actual, i0 = d.years.indexOf(y0), last = d.years.length - 1;
    const head = card(stats([
      { label: `Habitantes ${y0}`, value: n(d.total[i0] / 1e6, 2), unit: " M" },
      { label: `Proyección ${d.years[last]}`, value: n(d.total[last] / 1e6, 2), unit: " M" },
      { label: "Crecimiento anual", value: n(((d.total[i0] / d.total[i0 - 1]) - 1) * 100, 2), unit: "%" },
    ]), { concept: "poblacion", title: "Población de la Argentina", sub: "Estimaciones y proyecciones en base al Censo 2022",
      infoText: "Población estimada al 1.º de julio de cada año. A partir del Censo 2022, el INDEC proyecta cómo va a evolucionar la población por sexo, edad y jurisdicción." });
    const tot = chartCard({ concept: "poblacion", title: "Población total", sub: "Millones de habitantes", ranges: null,
      render: () => ({ type: "line", x: d.years.map(String), fmt: (v) => n(v / 1e6, 2) + " M", yfmt: (v) => n(v / 1e6, 1),
        series: [{ name: "Población", values: d.total, color: "var(--s1)", area: true }] }) });
    const pyr = card(switcher({ options: [[String(y0), "a"], [String(d.years[last]), "b"]],
      render: (k) => pyramid(k === "a" ? d.piramide : d.piramide_2040, { fmt: big }) }),
    { concept: "piramide", title: "Pirámide de población", sub: "Por sexo y grupo de edad", source: "INDEC",
      infoText: "La base más angosta muestra que nacen menos chicos que antes: la población envejece." });
    const prov = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Provincia</th><th class="r">${y0}</th><th class="r">Var. a ${d.years[last]}</th></tr></thead><tbody>
      ${d.provincias.map((p) => `<tr><td>${esc(p.name)}</td><td class="r">${big(p.pob)}</td><td class="r">${pfs(p.var)}</td></tr>`).join("")}</tbody></table></div>`,
    { concept: "poblacion", title: "Por provincia", source: "INDEC" });
    const sid = "dep-s";
    const depRows = (q) => d.departamentos.filter((r) => !q || (r[0] + " " + r[1]).toLowerCase().includes(q)).slice(0, 40)
      .map((r) => `<tr><td>${esc(r[0])}<div class="small muted">${esc(r[1])}</div></td><td class="r">${n(r[2], 0)}</td><td class="r">${n(r[3], 0)}</td></tr>`).join("");
    onMount(() => {
      const inp = document.getElementById(sid);
      inp?.addEventListener("input", () => { document.getElementById(sid + "-b").innerHTML = depRows(inp.value.trim().toLowerCase()); });
    });
    const dep = card(`<input class="search" id="${sid}" type="search" placeholder="Buscar departamento o partido…">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Departamento</th><th class="r">${y0}</th><th class="r">${d.dep_anio_max}</th></tr></thead><tbody id="${sid}-b">${depRows("")}</tbody></table></div>`,
    { concept: "poblacion", title: "Por departamento", sub: `${d.departamentos.length} departamentos y partidos (se muestran los 40 más poblados)`, source: "INDEC" });
    return section("Población", head + tot + pyr) + section("Territorio", prov + dep);
  },
};
