"""Prueba de portabilidad: abre Casa Campo en Chromium, Firefox y WebKit
(motor de Safari) con tamaños de pantalla de móvil, tableta y escritorio,
inicia sesión y guarda una captura y los tiempos medidos.

Uso: python3 portabilidad.py URL CARPETA_SALIDA
"""
import csv
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

URL = sys.argv[1]
SALIDA = sys.argv[2]
NAVEGADORES = ["chromium", "firefox", "webkit"]
VISTAS = {
    "movil": {"width": 390, "height": 844},
    "tableta": {"width": 768, "height": 1024},
    "escritorio": {"width": 1366, "height": 768},
}
TEXTO_JS = (
    "() => { const h = document.querySelector('flt-semantics-host'); if (!h) return '';"
    "return h.textContent + [...h.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' '); }"
)

os.makedirs(SALIDA, exist_ok=True)
resultados = []

with sync_playwright() as p:
    for nombre in NAVEGADORES:
        navegador = getattr(p, nombre).launch()
        version = navegador.version
        for vista, tamano in VISTAS.items():
            fila = {"navegador": nombre, "version": version, "vista": vista,
                    "ancho": tamano["width"], "alto": tamano["height"]}
            pagina = navegador.new_page(viewport=tamano)
            errores = []
            pagina.on("pageerror", lambda e: errores.append(str(e)))
            try:
                inicio = time.time()
                pagina.goto(URL)
                pagina.wait_for_selector('input[aria-label="Usuario"]', state="attached", timeout=60000)
                fila["carga_login_s"] = round(time.time() - inicio, 2)
                pagina.locator('input[aria-label="Usuario"]').click()
                pagina.wait_for_timeout(300)
                pagina.keyboard.type("admin")
                pagina.locator('input[aria-label="Contraseña"]').click()
                pagina.wait_for_timeout(300)
                pagina.keyboard.type("Admin2026*")
                pagina.wait_for_timeout(300)
                inicio = time.time()
                pagina.get_by_role("button", name="Ingresar").click()
                # Espera la pantalla principal (texto visible o etiqueta accesible).
                pagina.wait_for_function(
                    "() => { const h = document.querySelector('flt-semantics-host'); if (!h) return false;"
                    " const t = h.textContent + [...h.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' ');"
                    " return t.includes('Nueva reserva') || t.includes('Cerrar sesión'); }",
                    timeout=30000,
                )
                fila["login_s"] = round(time.time() - inicio, 2)
                pagina.wait_for_timeout(800)
                captura = f"{nombre}_{vista}.png"
                pagina.screenshot(path=os.path.join(SALIDA, captura))
                fila["captura"] = captura
                fila["resultado"] = "Exitoso"
            except Exception as e:  # noqa: BLE001
                fila["resultado"] = "Fallido"
                fila["error"] = str(e)[:300]
                try:
                    pagina.screenshot(path=os.path.join(SALIDA, f"{nombre}_{vista}_error.png"))
                except Exception:  # noqa: BLE001
                    pass
            fila["errores_js"] = len(errores)
            resultados.append(fila)
            print(fila, flush=True)
            pagina.close()
        navegador.close()

with open(os.path.join(SALIDA, "resultados.json"), "w", encoding="utf-8") as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2)

campos = ["navegador", "version", "vista", "ancho", "alto", "carga_login_s", "login_s", "resultado", "errores_js", "captura", "error"]
with open(os.path.join(SALIDA, "resultados.csv"), "w", newline="", encoding="utf-8") as f:
    escritor = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
    escritor.writeheader()
    escritor.writerows(resultados)
