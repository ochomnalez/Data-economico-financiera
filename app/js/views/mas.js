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
    ${section("Sociedad", card(`<div class="list">
      ${item("crianza", "crianza", I.child, "Canasta de crianza", "Costo de criar a un chico según su edad")}
      ${item("poblacion", "poblacion", I.people, "Población", "Proyecciones por edad, provincia y departamento")}
    </div>`))}
    ${section("App", card(`<div class="list">
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
      { label: "Exportaciones", value: usdM(c.expo[L]), foot: `${pfs((c.expo[L] / c.expo[L - 12] - 1) * 100)} i.a.` },
      { label: "Importaciones", value: usdM(c.impo[L]), foot: `${pfs((c.impo[L] / c.impo[L - 12] - 1) * 100)} i.a.` },
      { label: c.saldo[L] >= 0 ? "Superávit" : "Déficit", value: usdM(Math.abs(c.saldo[L])), foot: "saldo del mes" },
    ]) + `<p class="small muted" style="margin:12px 0 0">Últimos 12 meses: exportaciones ${bn(e12)} (${pfs((e12 / e12p - 1) * 100)}), importaciones ${bn(i12)} (${pfs((i12 / i12p - 1) * 100)}), saldo ${bn(e12 - i12)}.</p>`,
    { title: `Intercambio comercial · ${period(P[L], { long: true })}`, sub: "Millones de dólares",
      infoText: "Exportaciones valuadas FOB (en el puerto argentino) e importaciones CIF (incluyen flete y seguro). Los totales surgen de sumar las aperturas que publica la API; pueden diferir levemente de los informes oficiales por redondeo y por datos confidenciales. <b>Balanza de pagos</b>: el INDEC todavía no la publica en su API." });
    const saldo = chartCard({ title: "Balanza comercial", sub: "Exportaciones menos importaciones, millones de US$", range: 24,
      render: () => ({ type: "col", x: P, values: c.saldo, name: "Saldo", fmt: (v) => n(v, 0) }) });
    const flujos = chartCard({ title: "Exportaciones e importaciones", sub: "Millones de US$ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "Exportaciones", values: c.expo, color: "var(--s1)" }, { name: "Importaciones", values: c.impo, color: "var(--s2)" }] }) });
    const share = (rows) => {
      const tot = rows.reduce((s, r) => s + (r.v[L] || 0), 0);
      return bars(rows.map((r) => ({ label: r.name, value: (r.v[L] / tot) * 100 })).sort((a, b) => b.value - a.value), { fmt: (v) => n(v, 0) + "%" });
    };
    const comp = card(switcher({ options: [["Exportaciones", "e"], ["Importaciones", "i"]],
      render: (m) => share(m === "e" ? c.rubros : c.usos) }),
    { title: "¿Qué vendemos y qué compramos?", sub: `Participación en ${period(P[L], { long: true })}`, source: "INDEC" });
    const soc = card(switcher({ options: [["Destinos de expo.", "e"], ["Orígenes de impo.", "i"]],
      render: (m) => bars((m === "e" ? c.socios_expo : c.socios_impo).slice(0, 10).map((s) => ({ label: s.name, value: s.v })), { fmt: (v) => usdM(v), color: "var(--s7)" }) }),
    { title: "Principales socios", sub: `Acumulado ${period(c.socios_desde)} – ${period(c.socios_hasta)}`, source: "INDEC" });
    const rub = chartCard({ title: "Exportaciones por gran rubro", sub: "Millones de US$", range: 36,
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
      { label: "IPIM", value: n(m.IPIM.vm[L]), unit: "%", foot: `${pf(m.IPIM.via[L])} i.a.` },
      { label: "IPIB", value: n(m.IPIB.vm[L]), unit: "%", foot: `${pf(m.IPIB.via[L])} i.a.` },
      { label: "IPP", value: n(m.IPP.vm[L]), unit: "%", foot: `${pf(m.IPP.via[L])} i.a.` },
    ]), { title: `Sistema de precios mayoristas · ${period(P[L], { long: true })}`, sub: "Variación mensual",
      infoText: "<b>IPIM</b>: precios mayoristas internos (incluye impuestos e importados). <b>IPIB</b>: igual pero sin impuestos. <b>IPP</b>: precios básicos del productor, solo producción nacional. Los precios mayoristas suelen trasladarse al consumidor con algunos meses de demora." });
    const vs = chartCard({ title: "Mayoristas vs. consumidor", sub: "Variación mensual", range: 24,
      render: () => ({ type: "line", x: P, fmt: pf, series: [
        { name: "Mayoristas (IPIM)", values: m.IPIM.vm, color: "var(--s2)" },
        { name: "Consumidor (IPC)", values: P.map((p) => ipcVm[p] ?? null), color: "var(--s1)" }] }) });
    const comps = card(switcher({ options: [["IPIM", "IPIM"], ["IPIB", "IPIB"], ["IPP", "IPP"]],
      render: (k) => bars(m[k].componentes.map((c) => ({ label: c.name, value: c.vm[L] })).sort((a, b) => b.value - a.value), { fmt: pf, color: "var(--s2)" }) }),
    { title: "Por componente", sub: `Variación mensual · ${period(P[L])}`, source: "INDEC, SIPM" });
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
    ]), { title: `Índice del costo de la construcción · ${period(P[L], { long: true })}`, sub: "Vivienda tipo en el Gran Buenos Aires",
      infoText: "El ICC mide cuánto cuesta construir una vivienda modelo en el GBA. Se divide en tres capítulos: materiales, mano de obra y gastos generales." });
    const chart = chartCard({ title: "Por capítulo", sub: "Variación interanual", range: 36,
      render: () => ({ type: "line", x: P, fmt: pf, series: d.capitulos.map((c, k) => ({ name: c.name, values: c.via, color: `var(--s${k + 1})` })) }) });
    const items = card(bars(d.items.map((i) => ({ label: i.name, value: i.via })), { fmt: pf, color: "var(--s4)" }),
      { title: "Por ítem de obra", sub: `Variación interanual · ${period(P[L])}`, source: "INDEC" });
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
    { title: `Índices del Decreto 1295/2002 · ${period(P[L], { long: true })}`,
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
      { label: "Mensual (desest.)", value: n(g.vm[L], 1, { sign: true }), unit: "%" },
      { label: "Interanual", value: n(g.via[L], 1, { sign: true }), unit: "%" },
      { label: "Acumulado del año", value: n(g.acum[L], 1, { sign: true }), unit: "%", foot: "vs. mismo período" },
    ]), { title: `Producción industrial · ${period(P[L], { long: true })}`, sub: "IPI manufacturero",
      infoText: "El índice de producción industrial manufacturero mide el volumen físico que producen las fábricas. Es uno de los primeros datos que muestra cómo viene la actividad." });
    const nivel = chartCard({ title: "Nivel de producción", sub: "Serie desestacionalizada, base 2004 = 100", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [{ name: "IPI manufacturero", values: g.desest, color: "var(--s1)", area: true }] }) });
    const vars = chartCard({ title: "Variación interanual", range: 24, render: () => ({ type: "col", x: P, values: g.via, name: "Interanual", fmt: pfs }) });
    const divs = card(bars(d.divisiones.map((x) => ({ label: x.name, value: x.via[L] })).sort((a, b) => b.value - a.value), { fmt: pfs, color: "var(--s3)" }),
      { title: "Por rama", sub: `Variación interanual · ${period(P[L])}`, source: "INDEC" });
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
      { label: "Mensual (desest.)", value: n(g.vm[L], 1, { sign: true }), unit: "%" },
      { label: "Interanual", value: g.via.length ? n(g.via[L], 1, { sign: true }) : "s/d", unit: "%" },
      { label: "Petróleo", value: n(ia("Petróleo crudo"), 1, { sign: true }), unit: "%", foot: "producción i.a." },
    ]), { title: `Producción minera · ${period(P[L], { long: true })}`, sub: "IPI minero",
      infoText: "Mide la producción de petróleo, gas, minerales metalíferos (oro, plata, litio, cobre), y rocas y minerales para construcción. El crecimiento de Vaca Muerta se ve en el petróleo y gas <b>no convencional</b>." });
    const lvl = chartCard({ title: "Nivel de producción", sub: "Serie desestacionalizada, base 2016 = 100", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [{ name: "IPI minero", values: g.desest, color: "var(--s6)", area: true }] }) });
    const oil = chartCard({ title: "Petróleo crudo", sub: "Miles de m³ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "No convencional", values: prod["Petróleo crudo no convencional"]?.v || [], color: "var(--s1)" },
        { name: "Convencional", values: prod["Petróleo crudo convencional"]?.v || [], color: "var(--s2)" }] }) });
    const gas = chartCard({ title: "Gas natural", sub: "Millones de m³ por mes", range: 60,
      render: () => ({ type: "line", x: P, fmt: (v) => n(v, 0), series: [
        { name: "No convencional", values: prod["Gas natural no convencional"]?.v || [], color: "var(--s1)" },
        { name: "Convencional", values: prod["Gas natural convencional"]?.v || [], color: "var(--s2)" }] }) });
    const lit = chartCard({ title: "Carbonato de litio", sub: "Toneladas por mes", range: 60,
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
      { title: `Costo mensual de criar a un chico · ${period(P[L], { long: true })}`, sub: "Pesos por mes",
        infoText: "La canasta de crianza estima cuánto cuesta criar a un chico: los <b>bienes y servicios</b> que necesita (alimentos, ropa, salud, educación) más el <b>tiempo de cuidado</b>, valorizado según el salario de una trabajadora de casas particulares.", source: "INDEC" });
    const ch = chartCard({ title: "Evolución del costo total", sub: "Pesos por mes", range: 24,
      render: () => ({ type: "line", x: P, fmt: (v) => ars(v, { short: true }), yfmt: (v) => n(v / 1000, 0) + "k",
        series: d.tramos.map((t, k) => ({ name: t.name, values: t.tot, color: `var(--s${k + 1})` })) }) });
    return section("Canasta de crianza", head + ch) + `<div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
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
    ]), { title: "Población de la Argentina", sub: "Estimaciones y proyecciones en base al Censo 2022",
      infoText: "Población estimada al 1.º de julio de cada año. A partir del Censo 2022, el INDEC proyecta cómo va a evolucionar la población por sexo, edad y jurisdicción." });
    const tot = chartCard({ title: "Población total", sub: "Millones de habitantes", ranges: null,
      render: () => ({ type: "line", x: d.years.map(String), fmt: (v) => n(v / 1e6, 2) + " M", yfmt: (v) => n(v / 1e6, 1),
        series: [{ name: "Población", values: d.total, color: "var(--s1)", area: true }] }) });
    const pyr = card(switcher({ options: [[String(y0), "a"], [String(d.years[last]), "b"]],
      render: (k) => pyramid(k === "a" ? d.piramide : d.piramide_2040, { fmt: big }) }),
    { title: "Pirámide de población", sub: "Por sexo y grupo de edad", source: "INDEC",
      infoText: "La base más angosta muestra que nacen menos chicos que antes: la población envejece." });
    const prov = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Provincia</th><th class="r">${y0}</th><th class="r">Var. a ${d.years[last]}</th></tr></thead><tbody>
      ${d.provincias.map((p) => `<tr><td>${esc(p.name)}</td><td class="r">${big(p.pob)}</td><td class="r">${pfs(p.var)}</td></tr>`).join("")}</tbody></table></div>`,
    { title: "Por provincia", source: "INDEC" });
    const sid = "dep-s";
    const depRows = (q) => d.departamentos.filter((r) => !q || (r[0] + " " + r[1]).toLowerCase().includes(q)).slice(0, 40)
      .map((r) => `<tr><td>${esc(r[0])}<div class="small muted">${esc(r[1])}</div></td><td class="r">${n(r[2], 0)}</td><td class="r">${n(r[3], 0)}</td></tr>`).join("");
    onMount(() => {
      const inp = document.getElementById(sid);
      inp?.addEventListener("input", () => { document.getElementById(sid + "-b").innerHTML = depRows(inp.value.trim().toLowerCase()); });
    });
    const dep = card(`<input class="search" id="${sid}" type="search" placeholder="Buscar departamento o partido…">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Departamento</th><th class="r">${y0}</th><th class="r">${d.dep_anio_max}</th></tr></thead><tbody id="${sid}-b">${depRows("")}</tbody></table></div>`,
    { title: "Por departamento", sub: `${d.departamentos.length} departamentos y partidos (se muestran los 40 más poblados)`, source: "INDEC" });
    return section("Población", head + tot + pyr) + section("Territorio", prov + dep);
  },
};
