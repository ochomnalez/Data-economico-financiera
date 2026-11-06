"""Envía notificaciones push (Web Push) al teléfono cuando hay datos nuevos.

Lee pipeline/.novedades.json (lo genera build.py) y la configuración del
secreto PUSH_CONFIG, que la propia app genera en Ajustes → Notificaciones:

  {"vapid_private": "...", "vapid_public": "...", "subscription": {...}}

(También acepta una lista de esos objetos, para varios dispositivos.)

Uso:
  python pipeline/notify.py            # manda lo pendiente
  python pipeline/notify.py --prueba   # manda una notificación de prueba
  python pipeline/notify.py --errores  # avisa si el token del INDEC venció
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PENDING = Path(__file__).parent / ".novedades.json"
ESTADO = Path(__file__).resolve().parent.parent / "app" / "data" / "estado.json"
CONTACT = "https://github.com"  # py_vapid exige mailto: o un origen https sin ruta


def configs() -> list[dict]:
    raw = os.environ.get("PUSH_CONFIG", "").strip()
    if not raw:
        return []
    data = json.loads(raw)
    return data if isinstance(data, list) else [data]


def payload(items: list[dict]) -> dict:
    if len(items) == 1:
        it = items[0]
        return {"title": it["titulo"], "body": it["texto"], "url": it.get("ruta", "#/"), "tag": it["id"]}
    titles = ", ".join(i["titulo"].split(" de ")[0].split(" — ")[0] for i in items[:4])
    return {"title": f"Hay {len(items)} datos nuevos",
            "body": titles + ("…" if len(items) > 4 else "."), "url": "#/novedades", "tag": "varios"}


def send(msg: dict) -> int:
    from pywebpush import WebPushException, webpush

    ok = 0
    for i, cfg in enumerate(configs()):
        try:
            webpush(
                subscription_info=cfg["subscription"],
                data=json.dumps(msg, ensure_ascii=False),
                vapid_private_key=cfg["vapid_private"],
                vapid_claims={"sub": CONTACT},
                ttl=60 * 60 * 24,
            )
            ok += 1
        except WebPushException as e:
            code = getattr(e.response, "status_code", "?")
            print(f"Dispositivo {i + 1}: falló el envío ({code}). Si es 404/410, la suscripción venció: "
                  f"volvé a activar las notificaciones en la app y actualizá el secreto PUSH_CONFIG.",
                  file=sys.stderr)
    return ok


def main():
    if not configs():
        print("PUSH_CONFIG no está configurado: no se envían notificaciones.")
        return
    if "--errores" in sys.argv:
        errores = json.loads(ESTADO.read_text("utf-8")).get("errores", {}) if ESTADO.exists() else {}
        token = [k for k, v in errores.items() if "token" in v.lower() or "401" in v or "403" in v]
        if errores:
            print(f"::warning::Tablas con error: {', '.join(errores)}")
        if token:
            send({"title": "Hay que renovar el token del INDEC",
                  "body": "La API rechazó el token, así que los datos no se están actualizando. "
                          "Generá uno nuevo en api.indec.gob.ar y reemplazá el secreto INDEC_TOKEN en GitHub.",
                  "url": "#/novedades", "tag": "token"})
            print("::error::El token del INDEC fue rechazado (401/403).")
        return
    if "--prueba" in sys.argv:
        n = send({"title": "Pulso Económico", "body": "¡Listo! Las notificaciones funcionan.", "url": "#/", "tag": "prueba"})
        print(f"Prueba enviada a {n} dispositivo(s).")
        return
    items = json.loads(PENDING.read_text("utf-8")) if PENDING.exists() else []
    if not items:
        print("Sin novedades para notificar.")
        return
    n = send(payload(items))
    print(f"Notificación enviada a {n} dispositivo(s): {[i['id'] for i in items]}")


if __name__ == "__main__":
    main()
