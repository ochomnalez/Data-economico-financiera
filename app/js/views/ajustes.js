import { ago, esc, period } from "../fmt.js";
import { I } from "../icons.js";
import { card, load, onMount, section } from "../ui.js";
import { current, enable, isIOS, isStandalone, localTest, permission, supported } from "../push.js";
import { feedItem } from "./home.js";

const REPO = "https://github.com/ochomnalez/Data-economico-financiera";

// ───────── Notificaciones y app ─────────
export const ajustes = {
  title: "Notificaciones", back: "#/mas",
  async render() {
    const k = "push-box";
    onMount(() => paint(document.getElementById(k)));
    const theme = (() => { try { return localStorage.getItem("pe:theme") || "auto"; } catch { return "auto"; } })();
    onMount(() => {
      document.getElementById("theme-seg")?.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        document.querySelectorAll("#theme-seg button").forEach((x) => x.classList.toggle("on", x === b));
        const v = b.dataset.v;
        try { localStorage.setItem("pe:theme", v); } catch { /* */ }
        if (v === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = v;
      });
    });
    const ios = isIOS();
    return `
      ${section("Avisos del INDEC", card(`<div id="${k}"><div class="skeleton" style="height:80px"></div></div>`),
        { sub: "Te llega una notificación al teléfono cada vez que el INDEC publica un dato nuevo (inflación, actividad, salarios, empleo, pobreza, comercio exterior y más)." })}
      ${section("Instalar en el teléfono", card(ios ? `<ol class="steps">
          <li>Abrí esta página en <b>Safari</b>.</li>
          <li>Tocá el botón <b>Compartir</b> ${I.share.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px"')}.</li>
          <li>Elegí <b>“Agregar a inicio”</b> y confirmá.</li>
          <li>Abrí la app desde el ícono nuevo. En iPhone las notificaciones solo funcionan así (iOS 16.4 o posterior).</li></ol>`
        : `<ol class="steps"><li>Abrí esta página en <b>Chrome</b>.</li><li>Tocá el menú <b>⋮</b> y elegí <b>“Instalar app”</b> o “Agregar a la pantalla principal”.</li><li>Abrí la app desde el ícono nuevo.</li></ol>`))}
      ${section("Apariencia", card(`<div class="controls" style="margin:0"><span>Tema</span><div class="seg" id="theme-seg">
          ${[["Automático", "auto"], ["Claro", "light"], ["Oscuro", "dark"]].map(([l, v]) => `<button type="button" data-v="${v}" class="${theme === v ? "on" : ""}">${l}</button>`).join("")}</div></div>`))}`;
  },
};

async function paint(box) {
  if (!box) return;
  if (!supported()) {
    box.innerHTML = isIOS() && !isStandalone()
      ? `<p style="margin:0 0 6px"><span class="pill warn">Falta instalar la app</span></p><p class="small" style="margin:0">En iPhone primero tenés que agregar la app a la pantalla de inicio (mirá los pasos más abajo) y abrirla desde ahí.</p>`
      : `<p class="small" style="margin:0">Este navegador no admite notificaciones push. Probá con Safari (iPhone) o Chrome (Android).</p>`;
    return;
  }
  const cfg = await current().catch(() => null);
  if (!cfg) {
    const denied = permission() === "denied";
    box.innerHTML = `<p style="margin:0 0 12px"><span class="pill">${denied ? "Bloqueadas en el sistema" : "Desactivadas"}</span></p>
      ${denied ? `<p class="small">Las bloqueaste antes. Habilitalas en <b>Ajustes del teléfono → Notificaciones → Pulso Económico</b> y volvé a esta pantalla.</p>` : ""}
      <button class="btn block" id="push-on">${I.bell.replace("<svg", '<svg style="width:18px;height:18px"')} Activar notificaciones</button>
      <p class="small muted" style="margin:10px 0 0">Te vamos a pedir permiso. Se activan una sola vez.</p>`;
    box.querySelector("#push-on")?.addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { await enable(); paint(box); } catch (err) { e.target.disabled = false; alert(err.message); }
    });
    return;
  }
  const code = JSON.stringify(cfg);
  box.innerHTML = `<p style="margin:0 0 10px"><span class="pill ok">${I.check.replace("<svg", '<svg style="width:12px;height:12px"')} Permiso concedido en este teléfono</span></p>
    <p class="small" style="margin:0 0 10px"><b>Último paso (una sola vez):</b> pasale este código al robot que revisa el INDEC todos los días, para que sepa a qué teléfono avisar.</p>
    <ol class="steps small">
      <li>Tocá <b>Copiar código</b>.</li>
      <li>Tocá <b>Abrir GitHub</b>. En <i>Name</i> escribí <code>PUSH_CONFIG</code> y en <i>Secret</i> pegá el código. Guardá con <b>Add secret</b>.</li>
      <li>Listo. Para probar, entrá a <a href="${REPO}/actions/workflows/actualizar.yml" target="_blank" rel="noopener">Actions</a> → <b>Run workflow</b> y marcá <i>“Enviar notificación de prueba”</i>.</li>
    </ol>
    <textarea class="code" readonly id="push-code">${esc(code)}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button class="btn" id="push-copy">${I.copy.replace("<svg", '<svg style="width:18px;height:18px"')} Copiar código</button>
      <a class="btn secondary" href="${REPO}/settings/secrets/actions/new" target="_blank" rel="noopener">Abrir GitHub</a>
    </div>
    <button class="btn secondary block" id="push-test" style="margin-top:8px">Ver cómo se ve un aviso</button>
    <p class="small muted" style="margin:10px 0 0">El código es privado: no lo compartas. Si cambiás de teléfono o reinstalás la app, generá uno nuevo y reemplazá el secreto.</p>`;
  box.querySelector("#push-copy").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(code); } catch { const t = box.querySelector("#push-code"); t.select(); document.execCommand("copy"); }
    e.currentTarget.innerHTML = `${I.check.replace("<svg", '<svg style="width:18px;height:18px"')} Copiado`;
  });
  box.querySelector("#push-test").addEventListener("click", () => localTest().catch((err) => alert(err.message)));
}

// ───────── Novedades ─────────
export const novedades = {
  title: "Publicaciones", back: "#/",
  async render() {
    const [nov, estado] = await Promise.all([load("novedades"), load("estado")]);
    const tablas = Object.entries(estado.tablas);
    const rows = tablas.map(([key, t]) => `<tr><td>${esc(t.nombre)}<div class="small muted">${esc(t.seccion)}</div></td><td>${esc(t.frecuencia)}</td><td class="r">${esc(period(t.periodo, { short: true }))}</td></tr>`).join("");
    const errs = Object.keys(estado.errores || {});
    return `
      ${section("Últimas publicaciones", card(`<div class="feed">${nov.map(feedItem).join("") || '<p class="muted">Todavía no hay publicaciones registradas.</p>'}</div>`))}
      ${section("Estado de los datos", card(`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indicador</th><th>Frecuencia</th><th class="r">Último dato</th></tr></thead><tbody>${rows}</tbody></table></div>`,
        { sub: `Revisado ${ago(estado.actualizado)}${errs.length ? ` · con errores en: ${errs.join(", ")}` : ""}`, source: "INDEC — Catálogo API-INDEC" }),
        { sub: "El robot revisa la API del INDEC todos los días hábiles a las 16:15 y a las 18:45, y una vez por la mañana." })}`;
  },
};

// ───────── Fuentes y metodología ─────────
export const acerca = {
  title: "Fuentes y metodología", back: "#/mas",
  async render() {
    const estado = await load("estado");
    const eps = Object.values(estado.tablas).flatMap((t) => t.endpoint.split(", "));
    return `
      ${section("De dónde salen los datos", card(`<p style="margin:0 0 10px">Todos los indicadores salen del <b>Catálogo API-INDEC</b> (api.indec.gob.ar), el servicio oficial de datos del Instituto Nacional de Estadística y Censos. El dólar es la única fuente externa: dolarapi.com (en vivo) y argentinadatos.com (histórico).</p>
        <p class="small muted" style="margin:0">Esta app no es del INDEC. Se reutilizan sus datos citando la fuente, como piden sus términos de uso.</p>`))}
      ${section("Cálculos propios", card(`<ul class="steps small" style="padding-left:18px">
        <li><b>Salario real</b>: índice de salarios dividido por el IPC nacional, base noviembre 2023 = 100. La variación interanual real es (1 + salario i.a.) / (1 + inflación i.a.) − 1.</li>
        <li><b>Núcleo anualizada</b>: se encadenan las variaciones de los últimos 3 meses de la inflación núcleo y se lleva a 12 meses.</li>
        <li><b>Balanza comercial</b>: suma de exportaciones (FOB) menos importaciones (CIF) que informa la API. Puede diferir levemente del informe oficial por redondeos y datos confidenciales.</li>
        <li><b>Brecha cambiaria</b>: diferencia porcentual de cada cotización contra el dólar oficial.</li>
        <li><b>Distancia al máximo</b> del EMAE: último dato desestacionalizado contra el valor más alto de la serie.</li></ul>`))}
      ${section("Signos convencionales del INDEC", card(`<div class="tbl-wrap"><table class="tbl"><tbody>
        ${[["*", "Dato provisorio"], ["**", "Dato preliminar"], ["e", "Estimado por extrapolación o proyección"], ["i", "Estimado por imputación"], ["s", "Confidencial (secreto estadístico)"], ["///", "Dato que no corresponde presentar"], ["...", "Dato no disponible a la fecha"]]
        .map(([s, d]) => `<tr><td style="width:48px"><b>${esc(s)}</b></td><td>${esc(d)}</td></tr>`).join("")}</tbody></table></div>`))}
      ${section("Tablas de la API que usa la app", card(`<div class="small" style="display:grid;gap:4px">${eps.map((e) => `<code>/${esc(e)}</code>`).join("")}</div>`, { sub: `${eps.length} servicios de datos` }))}
      <div class="foot">Pulso Económico · datos del INDEC, ordenados.</div>`;
  },
};
