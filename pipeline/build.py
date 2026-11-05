"""Descarga las 19 tablas del Catálogo API-INDEC (más el dólar) y genera los
JSON compactos que lee la app en app/data/.

También detecta qué tablas tienen un período nuevo respecto de la corrida
anterior (app/data/estado.json) y deja la lista en pipeline/.novedades.json
para que notify.py mande la notificación.

Uso:  INDEC_TOKEN=... python pipeline/build.py
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import re
import sys
import traceback
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from indec import get, get_all  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "data"
PENDING = Path(__file__).parent / ".novedades.json"

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
ORD_T = {"1": "1.er", "2": "2.º", "3": "3.er", "4": "4.º"}
ORD_S = {"1": "1.er", "2": "2.º"}

KEYS = {
    "ipc_nacional": "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
    "valorizacion_canastas_cba_cbt": "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
    "indice_salarios": "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,unidad_de_medida",
    "icc_precios_construccion": "indicador,codigo_apertura,codigo_CPC_1,clasificador,nivel,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
    "redeterminacion_precios_contratos_obras_publicas": "indicador,operativo,inciso,descripcion_inciso,codigo_apertura,clasificador,nivel,descripcion,origen,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
    "sipm_precios_mayoristas": "operativo,indicador,clasificador,nivel,codigo_apertura,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
    "emae_ng": "tipo_de_indicador_descripcion,anio,mes,periodo,tipo_de_indicador",
    "emae_sec": "anio,mes,codigo,descripcion,periodo,tipo_de_indicador",
    "ipi_manufacturero": "periodo,indicador,cuadro_web,codigo_CLaNAE_2004,descripcion,serie,tipo_de_indicador",
    "ipi_minero": "periodo,anio,mes,indicador,cuadro_web,codigo_ClaNAE_2010,codigo_CPC_2_1,serie,descripcion,tipo_de_indicador,unidad_de_medida",
    "pob_depto": "departamento_cod,sexo_cod,fecha",
    "pob_jur": "jurisdiccion_cod,sexo_cod,edad_cod,fecha",
    "pob_nac": "edad,sexo_cod,fecha",
}
EMAE_NG = "estimador-mensual-de-actividad-economica-nivel-general"
EMAE_SEC = "estimador-mensual-de-actividad-economica-sectores"


# ───────────────────────── utilidades ─────────────────────────

def ym(p) -> str:
    p = str(p)
    return f"{p[:4]}-{p[4:6]}"


def mes_label(period: str) -> str:
    """'2026-09' -> 'septiembre 2026'; '2026-T2' -> '2.º trimestre 2026'."""
    y, rest = period.split("-")
    if rest.startswith("T"):
        return f"{ORD_T[rest[1]]} trimestre {y}"
    if rest.startswith("S"):
        return f"{ORD_S[rest[1]]} semestre {y}"
    return f"{MESES[int(rest) - 1]} {y}"


def num(v, nd=1):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return round(float(v), nd)


def fmt(v, nd=1, sign=False) -> str:
    if v is None:
        return "s/d"
    s = f"{abs(v):,.{nd}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if v < 0:
        s = "−" + s
    elif sign and v > 0:
        s = "+" + s
    return s


def pivot(rows, keyf, pf, vf="valor"):
    """{clave: {período: valor}}"""
    out: dict = defaultdict(dict)
    for r in rows:
        k = keyf(r)
        if k is None:
            continue
        out[k][pf(r)] = r.get(vf)
    return out


def series(d: dict, periods: list[str], nd=2) -> list:
    return [num(d.get(p), nd) for p in periods]


def last_valid(periods, values):
    for p, v in zip(reversed(periods), reversed(values)):
        if v is not None:
            return p, v
    return None, None


def prev_valid(periods, values, before):
    seen = False
    for p, v in zip(reversed(periods), reversed(values)):
        if p == before:
            seen = True
            continue
        if seen and v is not None:
            return p, v
    return None, None


def now_iso():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def write(name, obj):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.json").write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


# ───────────────────────── PRECIOS ─────────────────────────

def build_ipc():
    rows = get_all("ipc_nacional", {
        "region": "eq.Nacional",
        "nivel": "in.(Nivel General,División,Categoría)",
        "tipo_de_indicador": "in.(v_m,v_ia,v_acum,Indice)",
        "select": "clasificador,nivel,codigo,descripcion,periodo,tipo_de_indicador,valor",
    }, KEYS["ipc_nacional"])
    pv = pivot(rows, lambda r: (r["codigo"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    names = {r["codigo"]: r["descripcion"] for r in rows}
    clasif = {r["codigo"]: (r["clasificador"], r["nivel"]) for r in rows}
    P = sorted({ym(r["periodo"]) for r in rows})
    ng = next(c for c, (cl, nv) in clasif.items() if nv == "Nivel General")

    def s(code, t, nd=2):
        return series(pv.get((code, t), {}), P, nd)

    general = {"vm": s(ng, "v_m"), "via": s(ng, "v_ia"), "vacum": s(ng, "v_acum"), "idx": s(ng, "Indice", 4)}
    cats = {}
    for code, (cl, nv) in clasif.items():
        if cl == "Estacional, Núcleo y Regulados" or cl == "Bienes y servicios":
            cats[code] = {"name": names[code], "grupo": cl, "vm": s(code, "v_m"), "via": s(code, "v_ia")}
    divs = []
    for code, (cl, nv) in sorted(clasif.items()):
        if nv == "División":
            divs.append({"code": code, "name": names[code], "vm": s(code, "v_m"), "via": s(code, "v_ia")})

    # Regiones (nivel general)
    reg = get_all("ipc_nacional", {
        "nivel": "eq.Nivel General", "tipo_de_indicador": "in.(v_m,v_ia)",
        "periodo": f"gte.{P[-24].replace('-', '')}",
        "select": "region,periodo,tipo_de_indicador,valor"}, KEYS["ipc_nacional"])
    rp = pivot(reg, lambda r: (r["region"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    regiones = []
    for rname in ["GBA", "Pampeana", "Noreste", "Noroeste", "Cuyo", "Patagonia", "Nacional"]:
        regiones.append({"name": rname, "vm": num(rp.get((rname, "v_m"), {}).get(P[-1])),
                         "via": num(rp.get((rname, "v_ia"), {}).get(P[-1]))})

    # Núcleo anualizada (promedio móvil 3 meses) — señal de tendencia
    nucleo_code = next((c for c, v in cats.items() if v["name"].lower().startswith("n")), None)
    nucleo3 = None
    if nucleo_code:
        last3 = [x for x in cats[nucleo_code]["vm"][-3:] if x is not None]
        if len(last3) == 3:
            g = 1.0
            for x in last3:
                g *= 1 + x / 100
            nucleo3 = num((g ** 4 - 1) * 100, 1)

    data = {"updated": now_iso(), "p": P, "general": general, "categorias": cats,
            "divisiones": divs, "regiones": regiones, "nucleo_3m_anual": nucleo3, "nucleo_code": nucleo_code}
    write("ipc", data)

    lp = P[-1]
    vm, via = general["vm"][-1], general["via"][-1]
    pvm = general["vm"][-2]
    nuc = cats[nucleo_code]["vm"][-1] if nucleo_code else None
    tend = "bajó" if pvm is not None and vm < pvm else ("subió" if pvm is not None and vm > pvm else "se mantuvo")
    text = f"{fmt(vm)}% mensual · {fmt(via)}% interanual. Respecto del mes anterior ({fmt(pvm)}%) {tend}."
    if nuc is not None:
        text += f" La núcleo fue {fmt(nuc)}%."
    return {"id": "ipc", "periodo": lp, "titulo": f"Inflación de {mes_label(lp)}", "texto": text,
            "valor": vm, "unidad": "%", "ruta": "#/precios"}


def build_canastas():
    rows = get_all("valorizacion_canastas_cba_cbt", {
        "select": "nivel,codigo,descripcion,periodo,tipo_de_indicador,valor"}, KEYS["valorizacion_canastas_cba_cbt"])
    pv = pivot(rows, lambda r: (r["codigo"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    P = sorted({ym(r["periodo"]) for r in rows})

    def val(code):  # valor en pesos, cualquiera sea el tipo
        d = {}
        for (c, t), m in pv.items():
            if c == code and t not in ("v_m", "v_ia"):
                d.update(m)
        return series(d, P, 0)

    data = {
        "updated": now_iso(), "p": P,
        "cba_ae": val("CBA"), "cbt_ae": val("CBT"),
        "cba_h2": val("CBA H2"), "cbt_h2": val("CBT H2"),
        "cbt_h1": val("CBT H1"), "cbt_h3": val("CBT H3"),
        "cba_h1": val("CBA H1"), "cba_h3": val("CBA H3"),
        "cba_vm": series(pv.get(("CBA", "v_m"), {}), P), "cba_via": series(pv.get(("CBA", "v_ia"), {}), P),
        "cbt_vm": series(pv.get(("CBT", "v_m"), {}), P), "cbt_via": series(pv.get(("CBT", "v_ia"), {}), P),
        "hogares": {
            "h1": "3 integrantes: mujer de 35 años, su hijo de 18 y su madre de 61",
            "h2": "4 integrantes: varón de 35, mujer de 31, hijo de 6 e hija de 8 (familia tipo)",
            "h3": "5 integrantes: pareja de 30 años y tres hijos de 5, 3 y 1 año",
        },
    }
    write("canastas", data)
    lp = P[-1]
    return {"id": "canastas", "periodo": lp, "titulo": f"Canastas básicas de {mes_label(lp)}",
            "texto": f"Una familia tipo necesitó ${fmt(data['cbt_h2'][-1], 0)} para no ser pobre "
                     f"(CBT, {fmt(data['cbt_vm'][-1], 1, True)}% mensual) y ${fmt(data['cba_h2'][-1], 0)} "
                     f"para no ser indigente (CBA).",
            "valor": data["cbt_h2"][-1], "unidad": "$", "ruta": "#/precios/canastas"}


def build_mayoristas():
    rows = get_all("sipm_precios_mayoristas", {
        "nivel": "in.(Nivel general,Sector,Origen)", "tipo_de_indicador": "in.(v_m,v_ia)",
        "select": "indicador,nivel,codigo_apertura,descripcion,periodo,tipo_de_indicador,valor"},
        KEYS["sipm_precios_mayoristas"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: (r["indicador"], r["nivel"], r["descripcion"], r["tipo_de_indicador"]),
               lambda r: ym(r["periodo"]))
    out = {}
    for ind in ("IPIM", "IPIB", "IPP"):
        comps = []
        for (i, nv, desc, t) in pv:
            if i == ind and t == "v_m" and nv != "Nivel general" and not (nv == "Sector" and desc == "Productos importados"):
                comps.append({"name": desc, "nivel": nv, "vm": series(pv[(i, nv, desc, "v_m")], P),
                              "via": series(pv.get((i, nv, desc, "v_ia"), {}), P)})
        out[ind] = {"vm": series(pv.get((ind, "Nivel general", "Nivel general", "v_m"), {}), P),
                    "via": series(pv.get((ind, "Nivel general", "Nivel general", "v_ia"), {}), P),
                    "componentes": sorted(comps, key=lambda c: (c["nivel"], c["name"]))}
    write("mayoristas", {"updated": now_iso(), "p": P, **out})
    lp = P[-1]
    return {"id": "mayoristas", "periodo": lp, "titulo": f"Precios mayoristas de {mes_label(lp)}",
            "texto": f"IPIM {fmt(out['IPIM']['vm'][-1])}% mensual · {fmt(out['IPIM']['via'][-1])}% interanual.",
            "valor": out["IPIM"]["vm"][-1], "unidad": "%", "ruta": "#/mas/mayoristas"}


def build_icc():
    rows = get_all("icc_precios_construccion", {
        "clasificador": "eq.ICC 93", "nivel": "in.(Nivel general,Capitulo,Ítems)",
        "tipo_de_indicador": "in.(v_m,v_ia)",
        "select": "nivel,codigo_apertura,descripcion,periodo,tipo_de_indicador,valor"},
        KEYS["icc_precios_construccion"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: (r["nivel"], r["descripcion"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    caps, items = [], []
    for (nv, desc, t) in pv:
        if t != "v_m":
            continue
        e = {"name": desc, "vm": series(pv[(nv, desc, "v_m")], P), "via": series(pv.get((nv, desc, "v_ia"), {}), P)}
        if nv == "Capitulo":
            caps.append(e)
        elif nv == "Ítems":
            items.append({"name": desc, "vm": e["vm"][-1], "via": e["via"][-1]})
    ng = {"vm": series(pv.get(("Nivel general", "Nivel general", "v_m"), {}), P),
          "via": series(pv.get(("Nivel general", "Nivel general", "v_ia"), {}), P)}
    write("icc", {"updated": now_iso(), "p": P, "general": ng, "capitulos": caps,
                  "items": sorted(items, key=lambda x: -(x["via"] or -999))})
    lp = P[-1]
    return {"id": "icc", "periodo": lp, "titulo": f"Costo de la construcción de {mes_label(lp)}",
            "texto": f"{fmt(ng['vm'][-1])}% mensual · {fmt(ng['via'][-1])}% interanual (GBA).",
            "valor": ng["vm"][-1], "unidad": "%", "ruta": "#/mas/construccion"}


def build_obra_publica():
    rows = get_all("redeterminacion_precios_contratos_obras_publicas", {
        "inciso": "neq.-", "tipo_de_indicador": "in.(v_m,v_ia)",
        "select": "operativo,inciso,descripcion_inciso,descripcion,origen,periodo,tipo_de_indicador,valor,valor_null"},
        KEYS["redeterminacion_precios_contratos_obras_publicas"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: (r["inciso"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    meta = {}
    for r in rows:
        meta[r["inciso"]] = {"inciso": r["inciso"], "name": r["descripcion_inciso"], "fuente": r["operativo"],
                             "detalle": r["descripcion"], "origen": r["origen"]}
    incisos = []
    for inc in sorted(meta):
        incisos.append({**meta[inc], "vm": series(pv.get((inc, "v_m"), {}), P),
                        "via": series(pv.get((inc, "v_ia"), {}), P)})
    write("obra_publica", {"updated": now_iso(), "p": P, "incisos": incisos})
    lp = P[-1]
    return {"id": "obra_publica", "periodo": lp, "titulo": f"Índices para obra pública de {mes_label(lp)}",
            "texto": f"Se actualizaron los {len(incisos)} índices del Decreto 1295/2002.",
            "valor": None, "unidad": "", "ruta": "#/mas/obra-publica", "silencioso": True}


# ───────────────────────── ACTIVIDAD ─────────────────────────

def build_emae():
    rows = get_all(EMAE_NG, {"select": "tipo_de_indicador_descripcion,periodo,valor"}, KEYS["emae_ng"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: r["tipo_de_indicador_descripcion"], lambda r: ym(r["periodo"]))
    g = lambda k, nd=2: series(pv.get(k, {}), P, nd)  # noqa: E731
    general = {"orig": g("Índice serie original"), "desest": g("Índice serie desestacionalizada"),
               "tend": g("Índice serie tendencia-ciclo"), "vm_desest": g("Var % mensual serie desestacionalizada"),
               "vm_tend": g("Var % mensual serie tendencia-ciclo"), "via": g("Var % interanual serie original")}

    sec = get_all(EMAE_SEC, {"select": "codigo,descripcion,periodo,tipo_de_indicador,valor"}, KEYS["emae_sec"])
    PS = sorted({ym(r["periodo"]) for r in sec})
    sp = pivot(sec, lambda r: (r["codigo"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    snames = {r["codigo"]: r["descripcion"] for r in sec}
    sectores = []
    for code, name in sorted(snames.items()):
        via = series(sp.get((code, "Variación porcentual interanual"), {}), PS)
        sectores.append({"code": code, "name": name, "via": via})

    # Distancia al máximo histórico de la serie desestacionalizada
    des = [x for x in general["desest"] if x is not None]
    pico = max(des) if des else None
    pico_p = P[general["desest"].index(pico)] if pico else None
    data = {"updated": now_iso(), "p": P, "general": general, "ps": PS, "sectores": sectores,
            "pico": {"periodo": pico_p, "valor": pico,
                     "dist": num((des[-1] / pico - 1) * 100, 1) if pico else None}}
    write("emae", data)
    lp = P[-1]
    vm, via = general["vm_desest"][-1], general["via"][-1]
    verbo = "creció" if (vm or 0) > 0 else ("cayó" if (vm or 0) < 0 else "no varió")
    return {"id": "emae", "periodo": lp, "titulo": f"Actividad económica (EMAE) de {mes_label(lp)}",
            "texto": f"La economía {verbo} {fmt(abs(vm) if vm else vm)}% respecto del mes anterior (desestacionalizado) "
                     f"y {fmt(via, 1, True)}% interanual.",
            "valor": vm, "unidad": "%", "ruta": "#/actividad"}


def build_ipi_manuf():
    rows = get_all("ipi_manufacturero", {
        "select": "periodo,cuadro_web,codigo_CLaNAE_2004,descripcion,serie,tipo_de_indicador,valor"},
        KEYS["ipi_manufacturero"])
    P = sorted({ym(r["periodo"]) for r in rows})
    NG = "IPI Manufacturero - Nivel general"
    pv = pivot(rows, lambda r: (r["descripcion"], r["serie"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    g = lambda s, t: series(pv.get((NG, s, t), {}), P)  # noqa: E731
    general = {"desest": g("Serie desestacionalizada", "Índice"), "vm": g("Serie desestacionalizada", "Variación intermensual"),
               "via": g("Serie original", "Variación interanual"), "acum": g("Serie original", "Variación acumulada interanual")}
    div_re = re.compile(r"^\d\d(-\d\d)?$")
    divs = {}
    for r in rows:
        c = r["codigo_CLaNAE_2004"]
        if r["cuadro_web"] == "Cuadro 3" and div_re.match(c or ""):
            divs[c] = r["descripcion"]
    divisiones = []
    for c, name in sorted(divs.items()):
        divisiones.append({"code": c, "name": name, "via": series(pv.get((name, "Serie original", "Variación interanual"), {}), P)})
    write("ipi_manufacturero", {"updated": now_iso(), "p": P, "general": general, "divisiones": divisiones})
    lp = P[-1]
    return {"id": "ipi_manufacturero", "periodo": lp, "titulo": f"Producción industrial de {mes_label(lp)}",
            "texto": f"{fmt(general['vm'][-1], 1, True)}% mensual (desest.) · {fmt(general['via'][-1], 1, True)}% interanual.",
            "valor": general["vm"][-1], "unidad": "%", "ruta": "#/mas/industria"}


def build_ipi_minero():
    rows = get_all("ipi_minero", {
        "select": "periodo,cuadro_web,descripcion,serie,tipo_de_indicador,unidad_de_medida,valor"}, KEYS["ipi_minero"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: (r["cuadro_web"], r["descripcion"], r["serie"].lower(), r["tipo_de_indicador"]),
               lambda r: ym(r["periodo"]))
    NG = "Nivel General - IPI Minero"
    def find(cuadro, desc, serie, tipo):
        return series(pv.get((cuadro, desc, serie, tipo), {}), P)
    # Nivel general: índice original (cuadro 2) y desestacionalizado (cuadro 1)
    orig_key = next((k for k in pv if k[1] == NG and k[2] == "serie original" and k[3] == "Índice"), None)
    via_key = next((k for k in pv if k[1] == NG and k[2] == "serie original" and k[3] == "Variación interanual"), None)
    general = {"desest": find("Cuadro 1", NG, "serie desestacionalizada", "Índice"),
               "vm": find("Cuadro 1", NG, "serie desestacionalizada", "Variación intermensual"),
               "orig": series(pv.get(orig_key, {}), P) if orig_key else [],
               "via": series(pv.get(via_key, {}), P) if via_key else []}
    productos = []
    units = {(r["cuadro_web"], r["descripcion"]): r["unidad_de_medida"] for r in rows if r["tipo_de_indicador"] == "Unidades físicas"}
    for (cuadro, desc), unit in sorted(units.items()):
        vals = series(pv.get((cuadro, desc, "serie original", "Unidades físicas"), {}), P, 1)
        productos.append({"name": desc, "unidad": unit, "v": vals})
    write("ipi_minero", {"updated": now_iso(), "p": P, "general": general, "productos": productos})
    lp = P[-1]
    return {"id": "ipi_minero", "periodo": lp, "titulo": f"Producción minera de {mes_label(lp)}",
            "texto": f"{fmt(general['vm'][-1], 1, True)}% mensual (desest.)"
                     + (f" · {fmt(general['via'][-1], 1, True)}% interanual." if general["via"] else "."),
            "valor": general["vm"][-1], "unidad": "%", "ruta": "#/mas/mineria"}


# ───────────────────────── INGRESOS ─────────────────────────

def build_salarios(ipc_idx: dict, ipc_via: dict):
    rows = get_all("indice_salarios", {"select": "codigo,descripcion,periodo,tipo_de_indicador,valor"},
                   KEYS["indice_salarios"])
    P = sorted({ym(r["periodo"]) for r in rows})
    pv = pivot(rows, lambda r: (r["descripcion"], r["tipo_de_indicador"]), lambda r: ym(r["periodo"]))
    names = ["Nivel general", "Total registrado", "Sector privado registrado", "Sector público",
             "Subsector público nacional", "Subsector público provincial", "Total no registrado"]
    sect = []
    for n in names:
        idx = series(pv.get((n, "Indice"), {}), P, 3)
        vm = series(pv.get((n, "v_m"), {}), P)
        via = series(pv.get((n, "v_ia"), {}), P)
        if not any(idx):  # sin índice publicado: se encadena desde la variación mensual
            acc, idx = None, []
            for x in vm:
                if x is None:
                    idx.append(acc)
                    continue
                acc = 100.0 if acc is None else acc * (1 + x / 100)
                idx.append(acc)
        # Salario real = índice nominal / IPC
        real = [w / ipc_idx[p] if (w is not None and ipc_idx.get(p)) else None for p, w in zip(P, idx)]
        base_p = "2023-11"
        base = real[P.index(base_p)] if base_p in P else None
        real_idx = [num(x / base * 100, 2) if (x and base) else None for x in real]
        real_vm = [None] * len(P)
        real_via = [None] * len(P)
        for i, p in enumerate(P):
            if i >= 1 and real[i] and real[i - 1]:
                real_vm[i] = num((real[i] / real[i - 1] - 1) * 100, 2)
            pi = ipc_via.get(p)
            if via[i] is not None and pi is not None:
                real_via[i] = num(((1 + via[i] / 100) / (1 + pi / 100) - 1) * 100, 2)
        sect.append({"name": n, "vm": vm, "via": via, "real_idx": real_idx, "real_via": real_via, "real_vm": real_vm})
    data = {"updated": now_iso(), "p": P, "base_real": "2023-11", "sectores": sect,
            "nota": "El índice del sector no registrado se publica con un rezago de 5 meses."}
    write("salarios", data)
    reg = next(s for s in sect if s["name"] == "Total registrado")
    lp = P[-1]
    ng = sect[0]
    rp, rv = last_valid(P, reg["real_via"])
    texto = f"Nivel general {fmt(ng['vm'][-1], 1)}% mensual · {fmt(ng['via'][-1], 1)}% interanual."
    if rv is not None:
        texto += f" Salario real registrado: {fmt(rv, 1, True)}% interanual ({mes_label(rp)})."
    return {"id": "salarios", "periodo": lp, "titulo": f"Salarios de {mes_label(lp)}", "texto": texto,
            "valor": ng["vm"][-1], "unidad": "%", "ruta": "#/ingresos"}


def tri(p):  # '20262T' -> '2026-T2'
    return f"{p[:4]}-T{p[4]}"


def sem(p):  # '20261S' -> '2026-S1'
    return f"{p[:4]}-S{p[4]}"


def build_trabajo():
    rows = get_all("mercado_trabajo_eph", {}, "area_geografica_nom,periodo")
    rows.sort(key=lambda r: r["periodo"])
    P = [tri(r["periodo"]) for r in rows]
    cols = ["tasa_de_actividad", "tasa_de_empleo", "tasa_de_desocupacion", "tasa_de_empleo_informal",
            "tasa_de_empleo_formal", "tasa_de_subocupacion", "tasa_de_subocupacion_demandante",
            "tasa_de_ocupacion_demandante"]
    data = {"updated": now_iso(), "p": P}
    for c in cols:
        data[c.replace("tasa_de_", "")] = [num(r.get(c)) for r in rows]
    data["obs"] = {tri(r["periodo"]): r["observaciones"] for r in rows if r.get("observaciones")}
    write("trabajo", data)
    lp = P[-1]
    d = data["desocupacion"]
    texto = f"Desocupación {fmt(d[-1])}% (un año antes: {fmt(d[-5]) if len(d) > 4 else 's/d'}%)."
    if data["empleo_informal"][-1] is not None:
        texto += f" Informalidad {fmt(data['empleo_informal'][-1])}%."
    return {"id": "trabajo", "periodo": lp, "titulo": f"Mercado de trabajo — {mes_label(lp)}", "texto": texto,
            "valor": d[-1], "unidad": "%", "ruta": "#/ingresos/trabajo"}


def build_pobreza():
    rows = get_all("pobreza_eph", {}, "area_geografica_nom,periodo")
    rows.sort(key=lambda r: r["periodo"])
    P = [sem(r["periodo"]) for r in rows]
    data = {"updated": now_iso(), "p": P,
            "pobreza_personas": [num(r["tasa_pobreza_personas"]) for r in rows],
            "pobreza_hogares": [num(r["tasa_pobreza_hogares"]) for r in rows],
            "indigencia_personas": [num(r["tasa_indigencia_personas"]) for r in rows],
            "indigencia_hogares": [num(r["tasa_indigencia_hogares"]) for r in rows],
            "obs": {sem(r["periodo"]): r["observaciones"] for r in rows if r.get("observaciones")}}
    write("pobreza", data)
    lp = P[-1]
    pp = data["pobreza_personas"]
    return {"id": "pobreza", "periodo": lp, "titulo": f"Pobreza — {mes_label(lp)}",
            "texto": f"{fmt(pp[-1])}% de las personas es pobre (semestre anterior: {fmt(pp[-2])}%). "
                     f"Indigencia: {fmt(data['indigencia_personas'][-1])}%.",
            "valor": pp[-1], "unidad": "%", "ruta": "#/ingresos/pobreza"}


def build_crianza():
    rows = get_all("canasta-crianza", {}, "Periodo")
    rows.sort(key=lambda r: r["Periodo"])
    P = [ym(r["Periodo"]) for r in rows]
    tramos = [("men1", "Menores de 1 año"), ("1a3", "1 a 3 años"), ("4a5", "4 a 5 años"), ("6a12", "6 a 12 años")]
    out = []
    for k, label in tramos:
        out.append({"key": k, "name": label,
                    "bys": [num(r.get(f"bys_{k}"), 0) for r in rows],
                    "cuid": [num(r.get(f"cuid_{k}"), 0) for r in rows],
                    "tot": [num(r.get(f"tot_{k}"), 0) for r in rows]})
    write("crianza", {"updated": now_iso(), "p": P, "tramos": out})
    lp = P[-1]
    t = next(x for x in out if x["key"] == "6a12")
    return {"id": "crianza", "periodo": lp, "titulo": f"Canasta de crianza de {mes_label(lp)}",
            "texto": f"Criar a un chico de 6 a 12 años costó ${fmt(t['tot'][-1], 0)} por mes "
                     f"(bienes, servicios y tiempo de cuidado).",
            "valor": t["tot"][-1], "unidad": "$", "ruta": "#/mas/crianza"}


# ───────────────────────── SECTOR EXTERNO ─────────────────────────

def build_comex():
    nom = get_all("comercio_exterior_nomenclaturas", {}, "nombre_columna,codigo")
    names = defaultdict(dict)
    for r in nom:
        names[r["nombre_columna"]][r["codigo"]] = r["codigo_descripcion"]

    ex = get_all("comercio_exterior_exportacion_bienes",
                 {"select": "Periodo,rubro_cod,valor_FOB.sum()"}, "Periodo,rubro_cod")
    im = get_all("comercio_exterior_importacion_bienes",
                 {"select": "Periodo,uso_economico_cod,valor_CIF.sum()"}, "Periodo,uso_economico_cod")
    P = sorted({ym(r["Periodo"]) for r in ex} | {ym(r["Periodo"]) for r in im})
    expo_tot, impo_tot = defaultdict(float), defaultdict(float)
    expo_r, impo_u = defaultdict(dict), defaultdict(dict)
    for r in ex:
        p = ym(r["Periodo"]); v = (r["sum"] or 0) / 1e6
        expo_tot[p] += v
        expo_r[r["rubro_cod"]][p] = v
    for r in im:
        p = ym(r["Periodo"]); v = (r["sum"] or 0) / 1e6
        impo_tot[p] += v
        impo_u[r["uso_economico_cod"]][p] = v
    expo = [num(expo_tot.get(p), 1) for p in P]
    impo = [num(impo_tot.get(p), 1) for p in P]
    saldo = [num(e - i, 1) if e is not None and i is not None else None for e, i in zip(expo, impo)]

    NOMBRES = {"rubro_cod": {"1": "Productos primarios", "2": "Manufacturas de origen agropecuario (MOA)",
                             "3": "Manufacturas de origen industrial (MOI)", "4": "Combustibles y energía"},
               "uso_economico_cod": {"1": "Bienes de capital", "2": "Bienes intermedios",
                                     "3": "Combustibles y lubricantes", "4": "Piezas y accesorios para bienes de capital",
                                     "5": "Bienes de consumo", "6": "Vehículos automotores de pasajeros"}}

    def comp(d, col, keep):
        return [{"code": c, "name": NOMBRES[col].get(c) or names[col].get(c, c), "v": series(d[c], P, 1)}
                for c in keep if c in d]

    rubros = comp(expo_r, "rubro_cod", ["1", "2", "3", "4"])
    usos = comp(impo_u, "uso_economico_cod", ["1", "2", "3", "4", "5", "6"])

    # Socios: últimos 12 meses
    last12 = P[-12:]
    since = last12[0].replace("-", "")
    exp_p = get_all("comercio_exterior_exportacion_bienes",
                    {"select": "pais_cod,valor_FOB.sum()", "Periodo": f"gte.{since}"}, "pais_cod")
    imp_p = get_all("comercio_exterior_importacion_bienes",
                    {"select": "pais_cod,valor_CIF.sum()", "Periodo": f"gte.{since}"}, "pais_cod")
    pn = names["pais_cod"]
    socios_e = sorted([{"code": r["pais_cod"], "name": pn.get(r["pais_cod"], r["pais_cod"]), "v": num((r["sum"] or 0) / 1e6, 1)}
                       for r in exp_p if not pn.get(r["pais_cod"], "").startswith(("Indeterminado", "Desconocido"))], key=lambda x: -x["v"])[:15]
    socios_i = sorted([{"code": r["pais_cod"], "name": pn.get(r["pais_cod"], r["pais_cod"]), "v": num((r["sum"] or 0) / 1e6, 1)}
                       for r in imp_p if not pn.get(r["pais_cod"], "").startswith(("Indeterminado", "Desconocido"))], key=lambda x: -x["v"])[:15]
    data = {"updated": now_iso(), "p": P, "expo": expo, "impo": impo, "saldo": saldo,
            "rubros": rubros, "usos": usos, "socios_expo": socios_e, "socios_impo": socios_i,
            "socios_desde": last12[0], "socios_hasta": last12[-1]}
    write("comex", data)
    lp = P[-1]
    s = saldo[-1]
    tipo = "superávit" if s >= 0 else "déficit"
    return {"id": "comex", "periodo": lp, "titulo": f"Comercio exterior de {mes_label(lp)}",
            "texto": f"{tipo.capitalize()} comercial de US$ {fmt(abs(s), 0)} millones. Exportaciones US$ {fmt(expo[-1], 0)} M "
                     f"· importaciones US$ {fmt(impo[-1], 0)} M.",
            "valor": s, "unidad": "US$ M", "ruta": "#/mas/comercio"}


# ───────────────────────── POBLACIÓN ─────────────────────────

def build_poblacion():
    nac = get_all("proyecciones_poblacion_nacional_2022_2040", {}, KEYS["pob_nac"])
    years = sorted({int(r["fecha"]) for r in nac})
    tot = defaultdict(int)
    pyr = defaultdict(lambda: defaultdict(int))
    for r in nac:
        y = int(r["fecha"]); v = r["poblacion"] or 0
        tot[y] += v
        e = int(r["edad"]) if str(r["edad"]).isdigit() else 100
        g = min(e // 5 * 5, 100)
        pyr[y][(g, r["sexo_nom"])] += v
    groups = list(range(0, 101, 5))

    def pyramid(y):
        return {"grupos": [f"{g}-{g + 4}" if g < 100 else "100+" for g in groups],
                "mujeres": [pyr[y][(g, "Mujer")] for g in groups],
                "varones": [pyr[y][(g, "Varon")] for g in groups]}

    jur = get_all("proyecciones_poblacion_jurisdiccion_2022_2040", {}, KEYS["pob_jur"])
    jt = defaultdict(lambda: defaultdict(int))
    jn = {}
    for r in jur:
        jt[r["jurisdiccion_cod"]][int(r["fecha"])] += r["poblacion"] or 0
        jn[r["jurisdiccion_cod"]] = r["jurisdiccion_nom"]
    this_year = dt.date.today().year
    y0 = this_year if this_year in years else years[0]
    provincias = sorted([{"code": c, "name": jn[c], "pob": jt[c].get(y0), "pob2040": jt[c].get(years[-1]),
                          "var": num((jt[c].get(years[-1], 0) / jt[c][y0] - 1) * 100, 1) if jt[c].get(y0) else None}
                         for c in jt], key=lambda x: -(x["pob"] or 0))

    dep = get_all("estimaciones_poblacion_departamento_2022_2035", {}, KEYS["pob_depto"])
    dt_ = defaultdict(lambda: defaultdict(int))
    dn = {}
    dmax = max(int(r["fecha"]) for r in dep)
    for r in dep:
        dt_[r["departamento_cod"]][int(r["fecha"])] += r["poblacion"] or 0
        dn[r["departamento_cod"]] = (r["departamento_nom"], r["jurisdiccion_nom"])
    departamentos = sorted([[dn[c][0], dn[c][1], dt_[c].get(y0), dt_[c].get(dmax)] for c in dt_],
                           key=lambda x: -(x[2] or 0))
    data = {"updated": now_iso(), "years": years, "total": [tot[y] for y in years], "anio_actual": y0,
            "piramide": pyramid(y0), "piramide_2040": pyramid(years[-1]), "provincias": provincias,
            "departamentos": departamentos, "dep_anio_max": dmax}
    write("poblacion", data)
    return {"id": "poblacion", "periodo": str(years[-1]), "titulo": "Proyecciones de población",
            "texto": f"Argentina tiene {fmt(tot[y0] / 1e6, 1)} millones de habitantes en {y0}.",
            "valor": tot[y0], "unidad": "hab.", "ruta": "#/mas/poblacion", "silencioso": True}


# ───────────────────────── DÓLAR (fuente externa) ─────────────────────────

def build_dolar():
    casas = [("oficial", "Oficial"), ("mayorista", "Mayorista"), ("bolsa", "MEP"),
             ("contadoconliqui", "CCL"), ("blue", "Blue"), ("tarjeta", "Tarjeta")]
    desde = (dt.date.today() - dt.timedelta(days=365 * 6)).isoformat()
    hist = {}
    for casa, _ in casas:
        try:
            req = urllib.request.Request(f"https://api.argentinadatos.com/v1/cotizaciones/dolares/{casa}",
                                         headers={"User-Agent": "pulso-economico/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                rows = json.load(r)
            hist[casa] = {x["fecha"]: x["venta"] for x in rows if x["fecha"] >= desde and x.get("venta")}
        except Exception as e:  # la fuente externa no debe frenar al resto
            print(f"  dólar {casa}: {e}", file=sys.stderr)
    fechas = sorted(set().union(*[set(h) for h in hist.values()])) if hist else []
    data = {"updated": now_iso(), "fuente": "argentinadatos.com (histórico) · dolarapi.com (en vivo)",
            "fechas": fechas, "casas": [{"id": c, "name": n, "v": [hist.get(c, {}).get(f) for f in fechas]}
                                        for c, n in casas if c in hist]}
    write("dolar", data)
    return None


# ───────────────────────── resumen y novedades ─────────────────────────

INFO = {
    "ipc": ("Inflación (IPC)", "Precios", "Mensual", "ipc_nacional"),
    "canastas": ("Canastas básicas (CBA y CBT)", "Precios", "Mensual", "valorizacion_canastas_cba_cbt"),
    "emae": ("Actividad económica (EMAE)", "Actividad", "Mensual", EMAE_NG + ", " + EMAE_SEC),
    "salarios": ("Índice de salarios", "Ingresos", "Mensual", "indice_salarios"),
    "trabajo": ("Mercado de trabajo (EPH)", "Ingresos", "Trimestral", "mercado_trabajo_eph"),
    "pobreza": ("Pobreza e indigencia (EPH)", "Ingresos", "Semestral", "pobreza_eph"),
    "mayoristas": ("Precios mayoristas (SIPM)", "Más indicadores", "Mensual", "sipm_precios_mayoristas"),
    "icc": ("Costo de la construcción (ICC)", "Más indicadores", "Mensual", "icc_precios_construccion"),
    "obra_publica": ("Redeterminación de precios de obra pública", "Más indicadores", "Mensual",
                     "redeterminacion_precios_contratos_obras_publicas"),
    "ipi_manufacturero": ("Producción industrial (IPI manufacturero)", "Más indicadores", "Mensual", "ipi_manufacturero"),
    "ipi_minero": ("Producción minera (IPI minero)", "Más indicadores", "Mensual", "ipi_minero"),
    "crianza": ("Canasta de crianza", "Más indicadores", "Mensual", "canasta-crianza"),
    "comex": ("Comercio exterior", "Más indicadores", "Mensual",
              "comercio_exterior_exportacion_bienes, comercio_exterior_importacion_bienes, comercio_exterior_nomenclaturas"),
    "poblacion": ("Población", "Más indicadores", "Anual (proyecciones)",
                  "proyecciones_poblacion_nacional_2022_2040, proyecciones_poblacion_jurisdiccion_2022_2040, "
                  "estimaciones_poblacion_departamento_2022_2035"),
}


def main():
    estado_path = OUT / "estado.json"
    estado = json.loads(estado_path.read_text("utf-8")) if estado_path.exists() else {}
    prev = estado.get("periodos", {})
    primera = not prev

    builders = [build_ipc, build_canastas, build_mayoristas, build_icc, build_obra_publica, build_emae,
                build_ipi_manuf, build_ipi_minero, None, build_trabajo, build_pobreza, build_crianza,
                build_comex, build_poblacion]
    heads, errores = {}, {}
    for b in builders:
        if b is None:  # salarios necesita el índice del IPC
            name = "salarios"
            try:
                ipc = json.loads((OUT / "ipc.json").read_text("utf-8"))
                h = build_salarios(dict(zip(ipc["p"], ipc["general"]["idx"])), dict(zip(ipc["p"], ipc["general"]["via"])))
                heads[h["id"]] = h
                print(f"✓ salarios {h['periodo']}")
            except Exception as e:
                errores[name] = str(e)
                traceback.print_exc()
            continue
        name = b.__name__.replace("build_", "")
        try:
            h = b()
            heads[h["id"]] = h
            print(f"✓ {h['id']} {h['periodo']}")
        except Exception as e:
            errores[name] = str(e)
            print(f"✗ {name}: {e}", file=sys.stderr)
            traceback.print_exc()
    try:
        build_dolar()
        print("✓ dólar")
    except Exception as e:
        errores["dolar"] = str(e)

    # Novedades: tablas cuyo último período cambió
    nov_path = OUT / "novedades.json"
    historial = json.loads(nov_path.read_text("utf-8")) if nov_path.exists() else []
    nuevas = []
    for k, h in heads.items():
        if prev.get(k) != h["periodo"]:
            item = {k2: v for k2, v in h.items()}
            item["fecha"] = now_iso()
            item["nuevo_periodo"] = prev.get(k) is not None or primera
            nuevas.append(item)
    if primera:
        # Primera corrida: se arma el historial sin notificar
        orden = list(INFO)
        historial = sorted(nuevas, key=lambda x: (x.get("silencioso", False), orden.index(x["id"]) if x["id"] in orden else 99))
        pending = []
    else:
        historial = nuevas + historial
        pending = [n for n in nuevas if not n.get("silencioso")]
    historial = historial[:80]
    nov_path.write_text(json.dumps(historial, ensure_ascii=False, indent=1), encoding="utf-8")
    PENDING.write_text(json.dumps(pending, ensure_ascii=False, indent=1), encoding="utf-8")

    estado = {
        "actualizado": now_iso(),
        "periodos": {**prev, **{k: h["periodo"] for k, h in heads.items()}},
        "ultimos": heads,
        "tablas": {k: {"nombre": v[0], "seccion": v[1], "frecuencia": v[2], "endpoint": v[3],
                       "periodo": heads.get(k, {}).get("periodo", prev.get(k))} for k, v in INFO.items()},
        "errores": errores,
    }
    estado_path.write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(nuevas)} tabla(s) con datos nuevos; {len(pending)} para notificar; errores: {list(errores)}")
    # Si fallan todas, que la corrida quede en rojo
    if len(errores) >= len(builders):
        sys.exit(1)


if __name__ == "__main__":
    main()
