"""Datos del Instituto de Estadística y Censos de la Ciudad de Buenos Aires (IDECBA).

No hay una API de datos: cada serie del "Banco de datos" es una entrada de
WordPress (estadisticaciudad.gob.ar/eyc/wp-json/wp/v2/banco_datos/{id}) cuya
página enlaza a un Excel que se reemplaza cada mes con otro nombre. Por eso,
en cada corrida se busca el enlace vigente y se lee el Excel con openpyxl.
"""
from __future__ import annotations

import datetime as dt
import io
import json
import re
import time
import urllib.request

WP = "https://www.estadisticaciudad.gob.ar/eyc/wp-json/wp/v2/banco_datos/"
UA = {"User-Agent": "pulso-economico/1.0"}

SERIES = {
    "ipc_gral": 185745,       # IPCBA: nivel general, estacionales, regulados y resto (índice y var. mensual)
    "ipc_bys": 185750,        # IPCBA: bienes y servicios
    "ipc_empalme": 185751,    # IPCBA: nivel general empalmado desde julio 2012
    "ipc_incidencia": 185749,  # IPCBA: incidencia mensual de las divisiones
    "lineas": 185775,         # Líneas de indigencia y pobreza para hogares tipo
    "alquileres": 139193,     # Alquiler promedio de departamentos de 1, 2 y 3 ambientes
}
MESES = {m: i + 1 for i, m in enumerate(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
                                          "septiembre", "octubre", "noviembre", "diciembre"])}


def _get(url: str, retries: int = 3) -> bytes:
    for k in range(retries + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read()
        except Exception:
            if k == retries:
                raise
            time.sleep(2 * (k + 1))
    raise RuntimeError("inalcanzable")


def _rows(key: str) -> list[list]:
    """Descarga el Excel vigente de una serie y devuelve sus filas no vacías (primera hoja)."""
    import openpyxl

    post = json.loads(_get(WP + str(SERIES[key])))
    page = _get(post["link"]).decode("utf-8", "replace")
    m = re.search(r"https://www\.estadisticaciudad\.gob\.ar/eyc/wp-content/uploads/[^\"'\s]+?\.xlsx", page)
    if not m:
        raise RuntimeError(f"No se encontró el Excel de {key} en {post['link']}")
    wb = openpyxl.load_workbook(io.BytesIO(_get(m.group(0))), data_only=True, read_only=True)
    out = []
    for r in wb.worksheets[0].iter_rows(values_only=True):
        cells = [c for c in r if c is not None and not (isinstance(c, str) and not c.strip())]
        if cells:
            out.append(cells)
    return out


def _num(v):
    return float(v) if isinstance(v, (int, float)) else None


def _ym(d: dt.datetime) -> str:
    return f"{d.year}-{d.month:02d}"


def _r(v, nd=2):
    return None if v is None else round(v, nd)


def _var(idx: list, lag: int) -> list:
    return [_r((idx[i] / idx[i - lag] - 1) * 100) if i >= lag and idx[i] and idx[i - lag] else None
            for i in range(len(idx))]


def _dated(rows):
    """Filas cuyo primer valor es una fecha: (AAAA-MM, [números…])."""
    return [(_ym(r[0]), [_num(x) for x in r[1:]]) for r in rows if isinstance(r[0], dt.datetime)]


def _monthly_text(rows, ncols):
    """Filas tipo  [2016] / ['Enero', v1, v2…] / ['Febrero*', …]  →  [(AAAA-MM, [v…], provisorio)]."""
    out, year = [], None
    for r in rows:
        first = r[0]
        if isinstance(first, (int, float)) and 1990 < first < 2100:
            year = int(first)
            r = r[1:]
            if not r:
                continue
            first = r[0]
        if isinstance(first, str) and year:
            name = first.strip().rstrip("*").strip().lower()
            if name in MESES and len(r) >= ncols + 1:
                out.append((f"{year}-{MESES[name]:02d}", [_num(x) for x in r[1:ncols + 1]], first.strip().endswith("*")))
    return out


def build_ipc(now_iso, write, mes_label, fmt):
    emp = _dated(_rows("ipc_empalme"))
    P = [p for p, _ in emp]
    idx = [v[0] for _, v in emp]
    vm, via = _var(idx, 1), _var(idx, 12)
    # Estacionales / regulados / resto y bienes / servicios (desde feb-2022): índices en las primeras columnas
    gral = dict(_dated(_rows("ipc_gral")))
    bys = dict(_dated(_rows("ipc_bys")))

    def comp(src, col):
        s = [src.get(p, [None] * 8)[col] if p in src else None for p in P]
        return {"vm": _var(s, 1), "via": _var(s, 12)}

    cats = {"estacionales": comp(gral, 1), "regulados": comp(gral, 2), "resto": comp(gral, 3),
            "bienes": comp(bys, 1), "servicios": comp(bys, 2)}
    # Incidencia de las divisiones en la variación mensual
    rows = _rows("ipc_incidencia")
    head = next(r for r in rows if all(isinstance(c, dt.datetime) for c in r))
    PI = [_ym(d) for d in head]
    divs = []
    for r in rows:
        if len(r) >= 3 and isinstance(r[1], str) and not isinstance(r[0], dt.datetime) and str(r[0]).strip().isdigit():
            vals = [_num(x) for x in r[2:2 + len(PI)]]
            divs.append({"code": str(r[0]).strip().zfill(2), "name": r[1].strip(), "inc": vals})
    data = {"updated": now_iso(), "fuente": "IDECBA — Instituto de Estadística y Censos de la Ciudad de Buenos Aires",
            "p": P, "idx": [_r(x, 3) for x in idx], "vm": vm, "via": via, "categorias": cats,
            "pi": PI, "divisiones": divs}
    write("caba_ipc", data)
    lp = P[-1]
    return {"id": "caba_ipc", "periodo": lp, "titulo": f"Inflación en la Ciudad (IPCBA) de {mes_label(lp)}",
            "texto": f"{fmt(vm[-1])}% mensual · {fmt(via[-1])}% interanual en CABA. "
                     f"Es un anticipo: el INDEC publica el IPC nacional unos días después.",
            "valor": vm[-1], "unidad": "%", "ruta": "#/mas/caba"}


def build_lineas(now_iso, write, mes_label, fmt):
    rows = _rows("lineas")
    hog_desc = next((r for r in rows if len(r) == 5 and all(isinstance(c, str) and len(c) > 30 for c in r)), None)
    li, lp, cur = [], [], None
    for r in rows:
        if isinstance(r[0], str) and r[0].startswith("Línea de indigencia"):
            cur = li
        elif isinstance(r[0], str) and r[0].startswith("Línea de pobreza"):
            cur = lp
        elif cur is not None:
            cur.append(r)
    LI, LP = _monthly_text(li, 5), _monthly_text(lp, 5)
    P = [p for p, _, _ in LP]
    lim = {p: v for p, v, _ in LI}
    data = {"updated": now_iso(), "p": P,
            "hogares": [{"key": f"h{k + 1}", "desc": (hog_desc[k] if hog_desc else f"Hogar {k + 1}"),
                         "lp": [_r(v[k], 0) for _, v, _ in LP],
                         "li": [_r(lim.get(p, [None] * 5)[k], 0) for p in P]} for k in range(5)]}
    for h in data["hogares"]:
        h["lp_vm"], h["lp_via"] = _var(h["lp"], 1), _var(h["lp"], 12)
    write("caba_lineas", data)
    h1 = data["hogares"][0]
    return {"id": "caba_lineas", "periodo": P[-1], "titulo": f"Líneas de pobreza en la Ciudad — {mes_label(P[-1])}",
            "texto": f"Una pareja con dos hijos, propietaria, necesitó ${fmt(h1['lp'][-1], 0)} para no ser pobre en CABA "
                     f"(${fmt(h1['li'][-1], 0)} para no ser indigente).",
            "valor": h1["lp"][-1], "unidad": "$", "ruta": "#/mas/caba"}


def build_alquileres(now_iso, write, mes_label, fmt):
    rows = _monthly_text(_rows("alquileres"), 3)
    P = [p for p, _, _ in rows]
    amb = [[_r(v[k], 0) for _, v, _ in rows] for k in range(3)]
    data = {"updated": now_iso(), "p": P, "provisorio": [p for p, _, prov in rows if prov],
            "ambientes": [{"key": f"a{k + 1}", "name": f"{k + 1} ambiente{'s' if k else ''}",
                           "m2": [30, 43, 70][k], "v": amb[k], "via": _var(amb[k], 12)} for k in range(3)]}
    write("caba_alquileres", data)
    a2 = data["ambientes"][1]
    return {"id": "caba_alquileres", "periodo": P[-1], "titulo": f"Alquileres en la Ciudad — {mes_label(P[-1])}",
            "texto": f"Un 2 ambientes se publicó en promedio a ${fmt(a2['v'][-1], 0)} por mes "
                     f"({fmt(a2['via'][-1], 1, True)}% interanual).",
            "valor": a2["v"][-1], "unidad": "$", "ruta": "#/mas/caba"}
