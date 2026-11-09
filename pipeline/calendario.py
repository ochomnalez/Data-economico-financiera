"""Calendario de publicaciones: INDEC + Instituto de Estadística de la Ciudad (IDECBA).

- INDEC: la página https://www.indec.gob.ar/Calendario/Fecha/0 trae embebido un
  arreglo JSON con todas las publicaciones (fecha, hora y título).
- IDECBA: el listado sale de wp-json/wp/v2/calendario, pero la fecha solo está
  en la página de cada entrada. Se guarda en caché por id + fecha de
  modificación para no volver a descargar las páginas que no cambiaron.

Genera app/data/calendario.json y app/data/calendario.ics (suscribible desde
el calendario del teléfono).
"""
from __future__ import annotations

import datetime as dt
import json
import re
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

UA = {"User-Agent": "pulso-economico/1.0"}
INDEC_URL = "https://www.indec.gob.ar/Calendario/Fecha/0"
CABA_API = "https://www.estadisticaciudad.gob.ar/eyc/wp-json/wp/v2/calendario"
ART = dt.timezone(dt.timedelta(hours=-3))  # Argentina no tiene horario de verano

# (expresión del título, id del dato en la app o None, ¿es un dato clave?)
REGLAS = [
    (r"^Índice de precios al consumidor \(IPC\)", "ipc", True),
    (r"canasta básica alimentaria", "canastas", True),
    (r"^Estimador mensual de actividad económica", "emae", True),
    (r"^Índice de salarios", "salarios", True),
    (r"^Mercado de trabajo\. Tasas", "trabajo", True),
    (r"^Incidencia de la pobreza", "pobreza", True),
    (r"^Intercambio comercial argentino", "comex", True),
    (r"^Informe de avance del nivel de actividad", None, True),
    (r"^Balanza de pagos", None, True),
    (r"^Sistema de índices de precios mayoristas", "mayoristas", False),
    (r"^Índice del costo de la construcción", "icc", False),
    (r"^Índice de producción industrial manufacturero", "ipi_manufacturero", False),
    (r"^Índice de producción industrial minero", "ipi_minero", False),
    (r"canasta de crianza de la primera infancia", "crianza", False),
    (r"^IPCBA", "caba_ipc", True),
    (r"^Líneas de pobreza y Canastas de consumo", "caba_lineas", False),
    (r"mercado de alquiler de departamentos", "caba_alquileres", False),
]
RUTAS = {
    "ipc": "#/precios", "canastas": "#/precios/canastas", "emae": "#/actividad", "salarios": "#/ingresos",
    "trabajo": "#/ingresos/trabajo", "pobreza": "#/ingresos/pobreza", "comex": "#/mas/comercio",
    "mayoristas": "#/mas/mayoristas", "icc": "#/mas/construccion", "ipi_manufacturero": "#/mas/industria",
    "ipi_minero": "#/mas/mineria", "crianza": "#/mas/crianza", "caba_ipc": "#/mas/caba",
    "caba_lineas": "#/mas/caba/pobreza", "caba_alquileres": "#/mas/caba/alquileres",
}
PERIODO = re.compile(
    r"^(?P<t>.*?)[.\s]+(?P<p>(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)"
    r"(?:[ -]+\w+)? de \d{4}.*|(?:Primer|Segundo|Tercer|Cuarto|\d\w*\.?)\s+(?:trimestre|semestre) de \d{4}.*"
    r"|(?:Año|Años) \d{4}.*)$", re.I)


def _get(url: str, timeout: int = 90) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def _clasificar(titulo: str):
    for rx, key, clave in REGLAS:
        if re.search(rx, titulo, re.I):
            return key, clave
    return None, False


def _rango(titulo: str) -> int:
    """Orden de importancia dentro del mismo horario (el IPC primero)."""
    for i, (rx, _, _) in enumerate(REGLAS):
        if re.search(rx, titulo, re.I):
            return i
    return len(REGLAS)


def _partir(titulo: str):
    titulo = re.sub(r"\s+", " ", titulo).strip().rstrip(".")
    m = PERIODO.match(titulo)
    return (m.group("t").strip().rstrip("."), m.group("p").strip().rstrip(".")) if m else (titulo, "")


def _evento(fuente, fecha: dt.datetime, titulo, url):
    key, clave = _clasificar(titulo)
    t, per = _partir(titulo)
    return {"fecha": fecha.strftime("%Y-%m-%dT%H:%M"), "fuente": fuente, "titulo": t, "periodo": per,
            "dato": key, "clave": clave, "ruta": RUTAS.get(key), "url": url}


def indec() -> list[dict]:
    s = _get(INDEC_URL).decode("utf-8", "replace")
    m = re.search(r'\[\{"id":\d+,"fechaPublicacion"', s)
    if not m:
        raise RuntimeError("No se encontró el calendario embebido en la página del INDEC")
    items, _ = json.JSONDecoder().raw_decode(s, m.start())
    out = []
    for x in items:
        if not x.get("publicado", 1):
            continue
        f = dt.datetime.fromisoformat(x["fechaPublicacion"][:19])
        url = x.get("urlArchivo") or ""
        if url and not url.startswith("http"):
            url = "https://www.indec.gob.ar/" + url.lstrip("/")
        out.append(_evento("INDEC", f, x["titulo_espaniol"], url or "https://www.indec.gob.ar/Calendario/Fecha/0"))
    return out


def caba(cache: dict) -> tuple[list[dict], dict]:
    posts = []
    for page in range(1, 6):
        try:
            batch = json.loads(_get(f"{CABA_API}?per_page=100&page={page}&_fields=id,date,modified,title,link"))
        except Exception:
            break
        if not batch:
            break
        posts += batch
        if len(batch) < 100:
            break
    hace_un_anio = (dt.date.today() - dt.timedelta(days=400)).isoformat()
    posts = [p for p in posts if p["date"][:10] >= hace_un_anio]

    def fecha_de(p):
        c = cache.get(str(p["id"]))
        if c and c.get("modified") == p["modified"]:
            return p, c.get("fecha")
        try:
            html = _get(p["link"], 60).decode("utf-8", "replace")
        except Exception:
            return p, c.get("fecha") if c else None
        m = re.search(r"custom-hora[\s\S]{0,400}?(\d{2})/(\d{2})/(\d{4})\s*(\d{1,2}):(\d{2})\s*([ap])m", html)
        if not m:
            return p, None
        d, mo, y, h, mi, ap = m.groups()
        h = int(h) % 12 + (12 if ap == "p" else 0)
        return p, f"{y}-{mo}-{d}T{h:02d}:{mi}"

    with ThreadPoolExecutor(max_workers=8) as ex:
        res = list(ex.map(fecha_de, posts))
    nuevo_cache, out = {}, []
    for p, f in res:
        titulo = re.sub(r"&#?\w+;", lambda e: {"&#8211;": "–", "&amp;": "&", "&#038;": "&"}.get(e.group(0), " "),
                        p["title"]["rendered"])
        nuevo_cache[str(p["id"])] = {"modified": p["modified"], "fecha": f}
        if f:
            out.append(_evento("Ciudad", dt.datetime.fromisoformat(f), titulo, p["link"]))
    return out, nuevo_cache


def _ics(eventos: list[dict]) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    esc = lambda s: s.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;")  # noqa: E731
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pulso Economico//Calendario//ES", "CALSCALE:GREGORIAN",
             "METHOD:PUBLISH", "X-WR-CALNAME:Pulso Económico · INDEC y Ciudad", "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
             "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"]
    for e in eventos:
        ini = dt.datetime.fromisoformat(e["fecha"]).replace(tzinfo=ART).astimezone(dt.timezone.utc)
        base = unicodedata.normalize("NFKD", f"{e['fuente']}-{e['titulo']}-{e['periodo']}-{e['fecha']}")
        uid = re.sub(r"[^a-z0-9]+", "-", base.encode("ascii", "ignore").decode().lower()).strip("-")[:120]
        resumen = f"{e['fuente']} · {e['titulo']}" + (f" ({e['periodo']})" if e["periodo"] else "")
        lines += ["BEGIN:VEVENT", f"UID:{uid}@pulso-economico", f"DTSTAMP:{stamp}",
                  f"DTSTART:{ini.strftime('%Y%m%dT%H%M%SZ')}",
                  f"DTEND:{(ini + dt.timedelta(minutes=30)).strftime('%Y%m%dT%H%M%SZ')}",
                  f"SUMMARY:{esc(resumen)}", f"URL:{e['url']}",
                  f"DESCRIPTION:{esc('Publicación oficial. Ver en la app Pulso Económico.')}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    # RFC 5545: líneas de hasta 75 octetos
    out = []
    for ln in lines:
        b = ln.encode("utf-8")
        while len(b) > 74:
            cut = 74
            while (b[cut] & 0xC0) == 0x80:
                cut -= 1
            out.append(b[:cut].decode("utf-8"))
            b = b" " + b[cut:]
        out.append(b.decode("utf-8"))
    return "\r\n".join(out) + "\r\n"


def build(out_dir: Path, now_iso) -> int:
    path = out_dir / "calendario.json"
    previo = json.loads(path.read_text("utf-8")) if path.exists() else {}
    errores = {}
    try:
        ev_indec = indec()
    except Exception as e:  # si falla una fuente, se conserva lo anterior de esa fuente
        errores["INDEC"] = str(e)
        ev_indec = [x for x in previo.get("eventos", []) if x["fuente"] == "INDEC"]
    try:
        ev_caba, cache = caba(previo.get("cache_ciudad", {}))
    except Exception as e:
        errores["Ciudad"] = str(e)
        ev_caba, cache = [x for x in previo.get("eventos", []) if x["fuente"] == "Ciudad"], previo.get("cache_ciudad", {})
    hoy = dt.date.today()
    desde, hasta = (hoy - dt.timedelta(days=45)).isoformat(), (hoy + dt.timedelta(days=400)).isoformat()
    eventos = sorted([e for e in ev_indec + ev_caba if desde <= e["fecha"][:10] <= hasta],
                     key=lambda e: (e["fecha"], not e["clave"], _rango(e["titulo"]), e["titulo"]))
    data = {"updated": now_iso(), "eventos": eventos, "errores": errores, "cache_ciudad": cache,
            "fuentes": {"INDEC": INDEC_URL, "Ciudad": "https://www.estadisticaciudad.gob.ar/eyc/calendario/"}}
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    seguidos = [e for e in eventos if e["dato"] or e["clave"]]
    (out_dir / "calendario.ics").write_text(_ics(seguidos), encoding="utf-8", newline="")
    if errores and not eventos:
        raise RuntimeError("; ".join(f"{k}: {v}" for k, v in errores.items()))
    return len(eventos)
