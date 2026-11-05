import { lastOf, n, pct, period } from "../fmt.js";
import { I } from "../icons.js";
import { card, chartCard, loadMany, RANGES_Q, RANGES_S, section, stats, tone, updatedNote } from "../ui.js";

export const title = "Ingresos";
const pf = (v) => n(v, 1) + "%";
const pfs = (v) => n(v, 1, { sign: true }) + "%";

export async function render() {
  const [sal, ipc, trab, pob, crianza] = await loadMany("salarios", "ipc", "trabajo", "pobreza", "crianza");
  const S = Object.fromEntries(sal.sectores.map((s) => [s.name, s]));
  const P = sal.p;
  const reg = S["Total registrado"], priv = S["Sector privado registrado"], pub = S["Sector público"], nr = S["Total no registrado"], ng = S["Nivel general"];
  const L = lastOf(reg.vm).i;
  const ipcVm = Object.fromEntries(ipc.p.map((p, i) => [p, ipc.general.vm[i]]));
  const ipcVia = Object.fromEntries(ipc.p.map((p, i) => [p, ipc.general.via[i]]));

  const head = card(stats([
    { label: "Salarios registrados", value: n(reg.vm[L]), unit: "%", foot: "mensual" },
    { label: "Inflación del mes", value: n(ipcVm[P[L]]), unit: "%", foot: period(P[L]) },
    { label: "Salario real", value: n(reg.real_via[L], 1, { sign: true }), unit: "%", foot: "interanual" },
  ]) + `<div style="margin-top:10px">${tone(reg.real_vm[L], { good: "up", text: reg.real_vm[L] >= 0 ? `En ${period(P[L])} los salarios registrados le ganaron a la inflación` : `En ${period(P[L])} los salarios registrados perdieron con la inflación` })}</div>`,
  { concept: "salarios", title: `Salarios · ${period(P[L], { long: true })}`, sub: "Índice de salarios",
    infoText: "El <b>salario real</b> compara el aumento de los sueldos con la inflación: si es positivo, el sueldo compra más que antes. Se calcula dividiendo el índice de salarios por el IPC. " + (sal.nota || "") });

  const real = chartCard({
    concept: "salario_real", title: "Poder de compra del salario", sub: `Salario real, índice ${period(sal.base_real)} = 100`, range: 36,
    infoText: "Por encima de 100: el salario compra más que en noviembre de 2023. Por debajo: compra menos. El salario no registrado (informal) es muy volátil y se publica con 5 meses de rezago; por eso se muestra aparte.",
    modes: [["Registrados", "r"], ["+ No registrado", "t"]],
    render: (m) => ({ type: "line", x: P, fmt: (v) => n(v, 1), series: [
      { name: "Privado registrado", values: priv.real_idx, color: "var(--s1)" },
      { name: "Público", values: pub.real_idx, color: "var(--s2)" },
      ...(m === "t" ? [{ name: "No registrado", values: nr.real_idx, color: "var(--s3)" }] : [])] }),
  });
  const vsInf = chartCard({
    concept: "salario_real", title: "Salarios vs. inflación", sub: "Variación interanual", range: 36,
    modes: [["Registrados", "Total registrado"], ["Privados", "Sector privado registrado"], ["Públicos", "Sector público"], ["No reg.", "Total no registrado"]],
    render: (m) => ({ type: "line", x: P, fmt: pf, series: [
      { name: S[m].name, values: S[m].via, color: "var(--s7)" },
      { name: "Inflación", values: P.map((p) => ipcVia[p] ?? null), color: "var(--s8)" }] }),
  });
  const tblRows = ["Nivel general", "Total registrado", "Sector privado registrado", "Sector público", "Subsector público nacional", "Subsector público provincial", "Total no registrado"]
    .map((k) => S[k]).map((s) => { const l = lastOf(s.vm); return `<tr class="${s.name === "Nivel general" ? "hl" : ""}"><td>${s.name}</td><td class="r">${pf(s.vm[l.i])}</td><td class="r">${pf(s.via[l.i])}</td><td class="r">${pfs(s.real_via[l.i])}</td></tr>`; }).join("");
  const tbl = card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sector</th><th class="r">Mensual</th><th class="r">Interanual</th><th class="r">Real i.a.</th></tr></thead><tbody>${tblRows}</tbody></table></div>`,
    { concept: "salarios", title: "Por sector", sub: period(P[L], { long: true }), source: "INDEC. " + (sal.nota || "") });

  // ── Trabajo ──
  const T = trab.p, TL = T.length - 1;
  const trabHead = card(stats([
    { label: "Desocupación", value: n(trab.desocupacion[TL]), unit: "%", foot: `hace un año ${pct(trab.desocupacion[TL - 4])}` },
    { label: "Empleo", value: n(trab.empleo[TL]), unit: "%", foot: `actividad ${pct(trab.actividad[TL])}` },
    { label: "Informalidad", value: trab.empleo_informal[TL] !== null ? n(trab.empleo_informal[TL]) : "s/d", unit: "%", foot: "de la población" },
  ]), { concept: "trabajo", title: `Mercado de trabajo · ${period(T[TL], { long: true })}`, sub: "Encuesta Permanente de Hogares, 31 aglomerados urbanos",
    infoText: "<b>Actividad</b>: % de la población que trabaja o busca trabajo. <b>Empleo</b>: % que trabaja. <b>Desocupación</b>: % de los activos que busca y no consigue. <b>Subocupación</b>: trabaja menos de 35 horas y quiere trabajar más. Las tasas de empleo formal e informal están expresadas sobre el total de la población." });
  const trabChart = chartCard({
    concept: "desocupacion", title: "Desocupación y subocupación", ranges: RANGES_Q, range: 20,
    render: () => ({ type: "line", x: T, fmt: pf, series: [
      { name: "Desocupación", values: trab.desocupacion, color: "var(--s2)" },
      { name: "Subocupación", values: trab.subocupacion, color: "var(--s4)" }] }),
  });
  const trabChart2 = chartCard({
    concept: "actividad_empleo", title: "Actividad y empleo", ranges: RANGES_Q, range: 20,
    render: () => ({ type: "line", x: T, fmt: pf, series: [
      { name: "Tasa de actividad", values: trab.actividad, color: "var(--s1)" },
      { name: "Tasa de empleo", values: trab.empleo, color: "var(--s3)" }] }),
  });

  // ── Pobreza ──
  const Q = pob.p, QL = Q.length - 1;
  const pobHead = card(stats([
    { label: "Personas pobres", value: n(pob.pobreza_personas[QL]), unit: "%", foot: `antes ${pct(pob.pobreza_personas[QL - 1])}` },
    { label: "Hogares pobres", value: n(pob.pobreza_hogares[QL]), unit: "%", foot: `antes ${pct(pob.pobreza_hogares[QL - 1])}` },
    { label: "Indigencia", value: n(pob.indigencia_personas[QL]), unit: "%", foot: "de las personas" },
  ]), { concept: "pobreza", title: `Pobreza · ${period(Q[QL], { long: true })}`, sub: "Encuesta Permanente de Hogares, 31 aglomerados urbanos",
    infoText: "Una persona es <b>pobre</b> si el ingreso de su hogar no alcanza para comprar la Canasta Básica Total, e <b>indigente</b> si no alcanza ni para la Canasta Básica Alimentaria. Se mide por semestre." });
  const pobChart = chartCard({
    concept: "pobreza", title: "Evolución", sub: "% de personas", ranges: RANGES_S, range: 0,
    render: () => ({ type: "line", x: Q, fmt: pf, series: [
      { name: "Pobreza", values: pob.pobreza_personas, color: "var(--s8)" },
      { name: "Indigencia", values: pob.indigencia_personas, color: "var(--s7)" }] }),
  });

  const cr = crianza.tramos.find((t) => t.key === "6a12");
  const extra = card(`<div class="list"><a class="list-item" href="#/mas/crianza"><div class="ico">${I.child}</div>
    <div><div class="t">Canasta de crianza</div><div class="d">Cuánto cuesta criar a un chico, por edad</div></div>
    <div class="v">$${n(cr.tot[cr.tot.length - 1] / 1000, 0)} mil<small>6 a 12 años</small></div></a></div>`);

  return `
    ${section("Salarios", head + real + vsInf + tbl)}
    ${section("Trabajo", trabHead + trabChart + trabChart2, { idAttr: "trabajo" })}
    ${section("Pobreza e indigencia", pobHead + pobChart, { idAttr: "pobreza" })}
    ${section("Más", extra)}
    <div class="foot">${updatedNote(P[L])} · Fuente: INDEC</div>`;
}
