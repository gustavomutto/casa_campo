"""Capturas del tablero de SonarQube (servidor local en el puerto 9000)."""
import os
import sys

from playwright.sync_api import sync_playwright

SALIDA = sys.argv[1]
URL = "http://localhost:9000"
PAGINAS = {
    "sonar_resumen": "/dashboard?id=casa_campo",
    "sonar_medidas": "/component_measures?id=casa_campo",
    "sonar_tamano": "/component_measures?id=casa_campo&metric=ncloc&view=list",
    "sonar_complejidad": "/component_measures?id=casa_campo&metric=complexity&view=list",
    "sonar_cobertura": "/component_measures?id=casa_campo&metric=coverage&view=list",
    "sonar_mantenibilidad": "/component_measures?id=casa_campo&metric=Maintainability",
    "sonar_issues": "/project/issues?id=casa_campo&resolved=false",
    "sonar_codigo": "/code?id=casa_campo",
}

with sync_playwright() as p:
    navegador = p.chromium.launch()
    pagina = navegador.new_page(viewport={"width": 1440, "height": 900})
    pagina.goto(URL + "/sessions/new")
    pagina.fill("#login", "admin")
    pagina.fill("#password", "CasaCampo2026*")
    pagina.keyboard.press("Enter")
    pagina.wait_for_timeout(4000)
    # SonarQube pide aceptar el riesgo de los plugins de terceros la primera vez.
    boton = pagina.get_by_role("button", name="I understand the risk")
    if boton.count():
        boton.click()
        pagina.wait_for_timeout(3000)
    for nombre, ruta in PAGINAS.items():
        try:
            pagina.goto(URL + ruta)
            pagina.wait_for_timeout(5000)
            pagina.screenshot(path=os.path.join(SALIDA, nombre + ".png"))
            print("ok", nombre)
        except Exception as e:  # noqa: BLE001
            print("error", nombre, e)
    navegador.close()
