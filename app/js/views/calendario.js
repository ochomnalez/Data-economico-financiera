// Calendario de publicaciones del INDEC y de la Ciudad (IDECBA).
import { esc } from "../fmt.js";
import { I } from "../icons.js";
import { card, load, onMount, section } from "../ui.js";

const SITE = "ochomnalez.github.io/Data-economico-financiera";
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const NOMBRE = {
  ipc: "Inflación (IPC)", canastas: "Canastas básicas (CBA y CBT)", emae: "Actividad económica (EMAE)",
  salarios: "Salarios", trabajo: "Desempleo y mercado de trabajo", pobreza: "Pobreza e indigencia",
  comex: "Comercio exterior", mayoristas: "Precios mayoristas", icc: "Costo de la construcción",
  ipi_manufacturero: "Producción industrial", ipi_minero: "Producción minera", crianza: "Canasta de crianza",
  caba_ipc: "Inflación porteña (IPCBA)", caba_lineas: "Líneas de pobreza de la Ciudad", caba_alquileres: "Alquileres en la Ciudad",
};
export function nombre(e) {
  if (e.dato && NOMBRE[e.dato]) return NOMBRE[e.dato];
  if (/^Informe de avance del nivel de actividad/i.test(e.titulo)) return "PBI trimestral";
  if (/^Balanza de pagos/i.test(e.titulo)) return "Balanza de pagos y deuda externa";
  return e.titulo;
}
const sigue = (e) => e.dato || e.clave;
const dia = (f) => f.slice(0, 10);
const hora = (f) => { const [h, m] = f.slice(11, 16).split(":"); return m === "00" ? `${+h} h` : `${+h}:${m} h`; };
function hoyISO(offset = 0) {
  const d = new Date(Date.now() - 3 * 3600e3 + offset * 86400e3); // hora de Argentina
  return d.toISOString().slice(0, 10);
}
function cuando(f) {
  const d = dia(f);
  if (d === hoyISO()) return "Hoy";
  if (d === hoyISO(1)) return "Mañana";
  const dt = new Date(d + "T12:00:00");
  return `${DIAS_L[dt.getDay()][0].toUpperCase() + DIAS_L[dt.getDay()].slice(1)} ${dt.getDate()} de ${MESES[dt.getMonth()]}`;
}
function faltan(f) {
  const ms = new Date(f + ":00-03:00").getTime() - Date.now();
  if (ms < 0) return "";
  // días de calendario (hora de Argentina), no horas corridas
  const d = Math.round((new Date(dia(f) + "T12:00:00Z") - new Date(hoyISO() + "T12:00:00Z")) / 86400e3);
  if (d === 0) { const h = Math.max(1, Math.round(ms / 3600e3)); return `hoy, en ${h} h`; }
  return d === 1 ? "mañana" : `en ${d} días`;
}

function item(e, { compact = false } = {}) {
  const tag = e.ruta ? "a" : "div";
  return `<${tag} class="cal-item ${e.clave ? "key" : ""}" ${e.ruta ? `href="${e.ruta}"` : ""}>
    <div class="cal-time">${esc(hora(e.fecha))}</div>
    <div class="cal-main">
      <div class="cal-t">${esc(nombre(e))}${e.clave ? '<span class="cal-badge">Clave</span>' : ""}</div>
      <div class="cal-d">${esc(e.periodo || "")}${e.periodo ? " · " : ""}<span class="cal-src ${e.fuente === "INDEC" ? "indec" : "caba"}">${e.fuente === "INDEC" ? "INDEC" : "Ciudad"}</span></div>
      ${!compact && nombre(e) !== e.titulo ? `<div class="cal-full">${esc(e.titulo)}</div>` : ""}
    </div>
    ${e.ruta ? `<div class="cal-go">${I.chevron}</div>` : ""}
  </${tag}>`;
}

/** Bloque "Próximas publicaciones" para Inicio. */
export function proximas(cal, n = 4) {
  const ahora = hoyISO();
  const prox = cal.eventos.filter((e) => dia(e.fecha) >= ahora && sigue(e)).slice(0, n);
  if (!prox.length) return "";
  const rows = prox.map((e) => {
    const d = new Date(dia(e.fecha) + "T12:00:00");
    return `<a class="cal-row" href="${e.ruta || "#/calendario"}">
      <div class="cal-date"><span>${DIAS[d.getDay()]}</span><b>${d.getDate()}</b><span>${MESES[d.getMonth()].slice(0, 3)}</span></div>
      <div class="cal-main"><div class="cal-t">${esc(nombre(e))}</div>
      <div class="cal-d">${esc(e.periodo)} · ${esc(hora(e.fecha))} · ${e.fuente === "INDEC" ? "INDEC" : "Ciudad"}</div></div>
      <div class="cal-when">${esc(faltan(e.fecha))}</div></a>`;
  }).join("");
  return card(`<div class="cal-list">${rows}</div>
    <a href="#/calendario" class="small" style="display:block;margin-top:10px;font-weight:600">Ver el calendario completo →</a>`);
}

export const calendario = {
  title: "Calendario", back: "#/",
  async render() {
    const cal = await load("calendario");
    const ahora = hoyISO();
    let modo = (() => { try { return localStorage.getItem("pe:cal") || "app"; } catch { return "app"; } })();
    const k = "cal-body";

    const paint = () => {
      const evs = cal.eventos.filter((e) => modo === "todo" || sigue(e));
      const futuros = evs.filter((e) => dia(e.fecha) >= ahora);
      const pasados = evs.filter((e) => dia(e.fecha) < ahora).reverse();
      const prox = futuros.find((e) => e.clave);
      let html = prox ? `<div class="card cal-next"><div class="eyebrow">Próximo dato clave · ${esc(faltan(prox.fecha))}</div>
        <h3>${esc(nombre(prox))} <span class="muted" style="font-weight:500">· ${esc(prox.periodo)}</span></h3>
        <div class="small muted">${esc(cuando(prox.fecha))}, ${esc(hora(prox.fecha))} · ${prox.fuente === "INDEC" ? "INDEC" : "Ciudad de Buenos Aires"}</div></div>` : "";
      let mes = "", diaAct = "";
      let body = "";
      for (const e of futuros) {
        const m = e.fecha.slice(0, 7);
        if (m !== mes) {
          if (mes) body += "</div></div>";
          mes = m; diaAct = "";
          body += `<h3 class="cal-month">${MESES[+m.slice(5) - 1][0].toUpperCase() + MESES[+m.slice(5) - 1].slice(1)} ${m.slice(0, 4)}</h3><div class="card cal-card"><div>`;
        }
        if (dia(e.fecha) !== diaAct) {
          diaAct = dia(e.fecha);
          const c = cuando(e.fecha);
          body += `<div class="cal-day ${c === "Hoy" ? "today" : ""}">${esc(c)}</div>`;
        }
        body += item(e);
      }
      if (mes) body += "</div></div>";
      html += body || '<p class="muted">No hay publicaciones próximas cargadas.</p>';
      if (pasados.length) {
        html += `<details class="cal-past"><summary>Publicado en las últimas semanas (${pasados.length})</summary><div class="card cal-card">
          ${pasados.map((e) => `<div class="cal-day">${esc(cuando(e.fecha))}</div>${item(e, { compact: true })}`).join("")}</div></details>`;
      }
      document.getElementById(k).innerHTML = html;
    };
    onMount(() => {
      document.getElementById("cal-seg").addEventListener("click", (ev) => {
        const b = ev.target.closest("button"); if (!b) return;
        modo = b.dataset.v;
        try { localStorage.setItem("pe:cal", modo); } catch { /* */ }
        document.querySelectorAll("#cal-seg button").forEach((x) => x.classList.toggle("on", x === b));
        paint();
      });
      paint();
    });
    const errs = Object.keys(cal.errores || {});
    return `
      <p class="section-sub" style="margin-top:12px">Cuándo publica cada dato el INDEC y el Instituto de Estadística de la Ciudad. Horarios de Argentina. Se actualiza solo con el calendario oficial.</p>
      <div class="controls"><div class="seg" id="cal-seg">
        <button type="button" data-v="app" class="${modo === "app" ? "on" : ""}">Lo que sigue la app</button>
        <button type="button" data-v="todo" class="${modo === "todo" ? "on" : ""}">Todas las publicaciones</button>
      </div></div>
      <div id="${k}"></div>
      ${section("En el calendario del teléfono", card(`<p style="margin:0 0 12px">Sumá estas fechas al calendario de tu iPhone o Android. Se actualizan solas cuando el INDEC o la Ciudad cambian una fecha.</p>
        <a class="btn block" href="webcal://${SITE}/data/calendario.ics">${I.share.replace("<svg", '<svg style="width:18px;height:18px"')} Suscribirme en el calendario</a>
        <p class="small muted" style="margin:10px 0 0">Incluye los datos que sigue la app y los clave (PBI, balanza de pagos). Si no se abre, copiá este enlace y agregalo como “calendario suscripto”: <code>https://${SITE}/data/calendario.ics</code></p>`))}
      <div class="foot">Fuente: calendarios oficiales del INDEC y del IDECBA${errs.length ? ` · sin actualizar: ${errs.join(", ")}` : ""}.</div>`;
  },
};
