# Pulso Económico

App para el teléfono con los datos del INDEC ordenados: inflación, actividad,
salarios, empleo, pobreza, comercio exterior, dólar y el resto de los
indicadores del **Catálogo API-INDEC**. Cuando el INDEC publica un dato nuevo,
llega una notificación al teléfono.

## Cómo funciona

```
GitHub Actions (todos los días)        app/data/*.json          App en el teléfono (PWA)
pipeline/build.py  ── descarga las ──►  datos compactos  ──►   app/ servida con GitHub Pages
19 tablas de api.indec.gob.ar          + estado.json            Inicio · Precios · Actividad ·
      │                                + novedades.json         Ingresos · Más indicadores
      └─ ¿período nuevo? ─► pipeline/notify.py ─► notificación push (Web Push)
```

- **pipeline/** — Python. `build.py` arma los datos y detecta novedades; `notify.py` manda la notificación.
- **app/** — la app (HTML, CSS y JavaScript sin dependencias). Funciona sin conexión y se instala en la pantalla de inicio.
- **.github/workflows/actualizar.yml** — corre a las 16:15 y 18:45 los días hábiles (el INDEC publica a las 16:00) y a las 08:20 todos los días.

## Puesta en marcha (una sola vez)

1. **Token del INDEC** → `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `INDEC_TOKEN` · Secret: el JWT generado en tu perfil de api.indec.gob.ar.
   - Vence cada ~6 meses: si vence, la app te manda un aviso para renovarlo.
2. **Publicar la app** → `Settings → Pages → Build and deployment → Source: GitHub Actions`.
3. Correr el workflow una vez: `Actions → Actualizar datos del INDEC → Run workflow`.
4. **En el teléfono**: abrir la dirección de GitHub Pages, agregar la app a la pantalla de inicio,
   entrar a `Más → Notificaciones`, tocar *Activar notificaciones* y seguir los pasos
   (se copia un código y se guarda como secreto `PUSH_CONFIG`).
5. Probar: `Actions → Run workflow` marcando *Enviar notificación de prueba*.

## Correr localmente

```bash
pip install -r pipeline/requirements.txt
INDEC_TOKEN=... python pipeline/build.py
python -m http.server -d app 8080   # http://localhost:8080
```

Fuente: INDEC — Catálogo API-INDEC. Dólar: dolarapi.com y argentinadatos.com.
