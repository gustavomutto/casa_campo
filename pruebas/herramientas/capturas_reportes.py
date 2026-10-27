"""Toma capturas de pantalla de los reportes HTML generados por las
herramientas (JMeter, Lighthouse, OWASP ZAP, Selenium).

Uso: python3 capturas_reportes.py CARPETA_REPORTES
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.path.abspath(sys.argv[1])
SALIDA = os.path.join(BASE, "capturas")
os.makedirs(SALIDA, exist_ok=True)

objetivos = []
for nombre in ["jmeter_carga", "jmeter_estres", "jmeter_pages", "jmeter_resistencia"]:
    indice = os.path.join(BASE, nombre, "index.html")
    if os.path.exists(indice):
        objetivos.append((f"{nombre}_dashboard", indice, None))
        estad = os.path.join(BASE, nombre, "content", "pages", "OverTime.html")
        if os.path.exists(estad):
            objetivos.append((f"{nombre}_tiempos", estad, None))
        rt = os.path.join(BASE, nombre, "content", "pages", "ResponseTimes.html")
        if os.path.exists(rt):
            objetivos.append((f"{nombre}_percentiles", rt, None))
for archivo in sorted(os.listdir(os.path.join(BASE, "lighthouse")) if os.path.isdir(os.path.join(BASE, "lighthouse")) else []):
    if archivo.endswith(".report.html"):
        objetivos.append((f"lighthouse_{archivo.replace('.report.html', '')}", os.path.join(BASE, "lighthouse", archivo), None))
for archivo in ["zap_pages.html", "zap_local.html"]:
    ruta = os.path.join(BASE, "zap", archivo)
    if os.path.exists(ruta):
        objetivos.append((archivo.replace(".html", ""), ruta, None))
ruta = os.path.join(BASE, "aceptacion", "reporte_selenium.html")
if os.path.exists(ruta):
    objetivos.append(("selenium_reporte", ruta, None))

with sync_playwright() as p:
    navegador = p.chromium.launch()
    pagina = navegador.new_page(viewport={"width": 1366, "height": 900})
    for nombre, ruta, _ in objetivos:
        try:
            pagina.goto("file://" + ruta)
            pagina.wait_for_timeout(2500)
            pagina.screenshot(path=os.path.join(SALIDA, nombre + ".png"))
            pagina.screenshot(path=os.path.join(SALIDA, nombre + "_completo.png"), full_page=True)
            print("ok", nombre)
        except Exception as e:  # noqa: BLE001
            print("error", nombre, e)
    navegador.close()
