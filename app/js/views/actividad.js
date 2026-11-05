import { bars } from "../charts.js";
import { lastOf, n, period } from "../fmt.js";
import { I } from "../icons.js";
import { card, chartCard, loadMany, section, stats, switcher, updatedNote } from "../ui.js";

export const title = "Actividad";
const pf = (v) => n(v, 1, { sign: true }) + "%";

export async function render() {
  const [emae, ipi, min] = await loadMany("emae", "ipi_manufacturero", "ipi_minero");
  const P = emae.p, g = emae.general;
  const vm = lastOf(g.vm_desest), via = lastOf(g.via);

  const head = card(stats([
    { label: "Mensual (sin estacionalidad)", value: n(vm.v, 1, { sign: true }), unit: "%", foot: `antes ${pf(g.vm_desest[vm.i - 1])}` },
    { label: "Interanual", value: n(via.v, 1, { sign: true }), unit: "%", foot: `antes ${pf(g.via[via.i - 1])}` },
    { label: "Vs. máximo", value: emae.pico.dist >= -0.05 ? "Récord" : n(emae.pico.dist, 1), unit: emae.pico.dist >= -0.05 ? "" : "%", foot: `pico: ${period(emae.pico.periodo)}` },
  ]), { concept: "emae", title: `Actividad económica · ${period(P[vm.i], { long: true })}`, sub: "Estimador mensual de actividad económica (EMAE)",
    infoText: "El EMAE es un adelanto mensual del PBI. La serie <b>desestacionalizada</b> quita los efectos del calendario (feriados, cosechas, vacaciones) para poder comparar un mes con el anterior. La <b>tendencia-ciclo</b> suaviza todavía más y muestra la dirección de fondo." });

  const nivel = chartCard({
    concept: "emae", title: "Nivel de actividad", sub: "Índice base 2004 = 100", range: 60,
    render: () => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [
      { name: "Desestacionalizada (sin efectos de calendario)", values: g.desest, color: "var(--s1)" },
      { name: "Tendencia-ciclo (la dirección de fondo)", values: g.tend, color: "var(--s2)" }] }),
  });
  const vars = chartCard({
    concept: "variaciones", title: "Variaciones", sub: "Mensual: contra el mes anterior, sin efectos de calendario · Interanual: contra el mismo mes del año pasado", modes: [["Mensual", "m"], ["Interanual", "a"]], range: 24,
    render: (m) => ({ type: "col", x: P, values: m === "m" ? g.vm_desest : g.via, name: m === "m" ? "Variación mensual desestacionalizada" : "Variación interanual", fmt: pf }),
  });

  const SL = emae.ps.length - 1;
  const sect = card(bars(emae.sectores.filter((s) => s.code !== "T_S")
    .map((s) => ({ label: s.name, value: s.via[SL] })).sort((a, b) => b.value - a.value), { fmt: pf, color: "var(--s3)" }),
  { concept: "emae_sectores", title: "¿Qué sectores crecen y cuáles caen?", sub: `Variación interanual · ${period(emae.ps[SL], { long: true })}`, source: "INDEC, EMAE por sector" });

  const sectChart = chartCard({
    concept: "emae_sectores", title: "Evolución por sector", sub: "Variación interanual", range: 24,
    modes: [["Industria", "D"], ["Comercio", "G"], ["Agro", "A"], ["Construcción", "F"], ["Minería", "C"]],
    render: (c) => { const s = emae.sectores.find((x) => x.code === c); return { type: "col", x: emae.ps, values: s.via, name: s.name, fmt: pf }; },
  });

  const IL = lastOf(ipi.general.vm), ML = lastOf(min.general.vm);
  const more = card(`<div class="list">
    <a class="list-item" href="#/mas/industria"><div class="ico">${I.factory}</div><div><div class="t">Industria (IPI manufacturero)</div><div class="d">${period(ipi.p[IL.i])}</div></div>
      <div class="v">${pf(ipi.general.via[IL.i])}<small>interanual</small></div></a>
    <a class="list-item" href="#/mas/mineria"><div class="ico">${I.mine}</div><div><div class="t">Minería, petróleo y gas</div><div class="d">${period(min.p[ML.i])}</div></div>
      <div class="v">${pf(min.general.via[ML.i])}<small>interanual</small></div></a>
  </div>`);

  return `
    ${section("Cómo viene la economía", head + nivel + vars)}
    ${section("Sectores", sect + sectChart)}
    ${section("Producción", more)}
    <div class="foot">${updatedNote(P[vm.i])} · Fuente: INDEC</div>`;
}
