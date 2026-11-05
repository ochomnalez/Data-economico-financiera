"""Cliente mínimo del Catálogo API-INDEC (https://api.indec.gob.ar/v1).

La API es estilo PostgREST: filtros por columna, `order`, `limit` (máx. 1000
filas por respuesta) y `offset` para paginar. Todas las tablas piden un JWT en
el header Authorization (variable de entorno INDEC_TOKEN).
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.indec.gob.ar/v1/"
PAGE = 1000


class IndecError(RuntimeError):
    pass


def _token() -> str:
    tok = os.environ.get("INDEC_TOKEN", "").strip()
    if not tok:
        raise IndecError("Falta la variable de entorno INDEC_TOKEN")
    return tok


def get(table: str, params: dict[str, str] | None = None, retries: int = 4) -> list[dict]:
    """Una sola página (hasta 1000 filas)."""
    qs = urllib.parse.urlencode(params or {}, safe="().,*:")
    url = BASE + table + ("?" + qs if qs else "")
    req = urllib.request.Request(
        url,
        headers={"Authorization": "Bearer " + _token(), "Accept": "application/json",
                 "User-Agent": "pulso-economico/1.0"},
    )
    delay = 2.0
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code in (401, 403):
                raise IndecError(f"{e.code} en {table}: token inválido o vencido. {body}") from e
            if e.code == 400:
                raise IndecError(f"400 en {table} ({qs}): {body}") from e
            if attempt == retries:
                raise IndecError(f"{e.code} en {table}: {body}") from e
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == retries:
                raise IndecError(f"Error de red en {table}: {e}") from e
        time.sleep(delay)
        delay *= 2
    raise IndecError("inalcanzable")


def get_all(table: str, params: dict[str, str] | None = None, order: str = "") -> list[dict]:
    """Recorre todas las páginas. `order` debe ser la clave completa de la tabla
    (o, en consultas agregadas, todas las columnas agrupadas) para que el
    paginado sea estable."""
    params = dict(params or {})
    if order:
        params["order"] = order
    rows: list[dict] = []
    offset = 0
    while True:
        page = get(table, {**params, "limit": str(PAGE), "offset": str(offset)})
        rows.extend(page)
        if len(page) < PAGE:
            return rows
        offset += PAGE
