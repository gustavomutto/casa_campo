"""Utilidades para automatizar con Selenium una aplicación Flutter web.

Flutter dibuja la interfaz en un canvas; con la semántica activada expone
un árbol accesible en el DOM (<flt-semantics>) con roles ARIA, etiquetas e
<input> reales, que es lo que usa Selenium para interactuar.
"""
import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080/casa_campo/")
CAPTURAS = os.environ.get("CAPTURAS", "capturas")
ESPERA = 25


def crear_driver():
    opciones = webdriver.ChromeOptions()
    opciones.add_argument("--headless=new")
    opciones.add_argument("--no-sandbox")
    opciones.add_argument("--window-size=1366,900")
    opciones.add_argument("--lang=es-CO")
    binario = os.environ.get("CHROME_BIN")
    if binario:
        opciones.binary_location = binario
    servicio = None
    ruta_driver = os.environ.get("CHROMEDRIVER")
    if ruta_driver:
        servicio = webdriver.ChromeService(executable_path=ruta_driver)
    return webdriver.Chrome(options=opciones, service=servicio)


class App:
    def __init__(self, driver, caso):
        self.d = driver
        self.caso = caso
        self.paso = 0
        self.espera = WebDriverWait(driver, ESPERA)
        os.makedirs(CAPTURAS, exist_ok=True)

    # --- Navegación -----------------------------------------------------
    def abrir(self):
        self.d.get(BASE_URL)
        self.espera.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[aria-label="Usuario"]'))
        )
        time.sleep(0.5)

    def captura(self, descripcion):
        self.paso += 1
        nombre = f"{self.caso}_paso{self.paso:02d}_{descripcion}.png"
        time.sleep(0.4)
        self.d.save_screenshot(os.path.join(CAPTURAS, nombre))
        return nombre

    # --- Búsqueda de elementos -----------------------------------------
    def campo(self, etiqueta):
        return self.espera.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, f'input[aria-label="{etiqueta}"], textarea[aria-label="{etiqueta}"]')
            )
        )

    def escribir(self, etiqueta, texto):
        elemento = self.campo(etiqueta)
        elemento.click()
        time.sleep(0.3)
        # Flutter mueve el foco a su propio <input> de edición.
        elemento = self.d.switch_to.active_element
        elemento.send_keys(Keys.CONTROL, "a")
        elemento.send_keys(Keys.DELETE)
        elemento.send_keys(texto)
        time.sleep(0.2)

    def boton(self, texto):
        xpath = (
            f'//*[@role="button" or @role="tab" or @role="menuitem" or @role="option"]'
            f'[normalize-space(.)="{texto}" or @aria-label="{texto}"]'
        )
        try:
            return self.espera.until(EC.element_to_be_clickable((By.XPATH, xpath)))
        except Exception:
            xpath = f'//*[@role="button" or @role="tab"][contains(normalize-space(.), "{texto}")]'
            return self.espera.until(EC.element_to_be_clickable((By.XPATH, xpath)))

    def clic(self, texto):
        self.boton(texto).click()
        time.sleep(0.6)

    def texto_pantalla(self):
        # Texto visible más las etiquetas accesibles (aria-label) de los nodos.
        return self.d.execute_script(
            "const h = document.querySelector('flt-semantics-host');"
            "if (!h) return '';"
            "const etiquetas = [...h.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'));"
            "return h.textContent + '\\n' + etiquetas.join('\\n');"
        )

    def esperar_texto(self, texto, tiempo=ESPERA):
        WebDriverWait(self.d, tiempo).until(lambda d: texto in self.texto_pantalla())
        return True

    def hay_texto(self, texto):
        return texto in self.texto_pantalla()

    def seleccionar(self, etiqueta_campo, opcion):
        self.clic(etiqueta_campo)
        self.clic(opcion)

    def iniciar_sesion(self, usuario, clave):
        self.escribir("Usuario", usuario)
        self.escribir("Contraseña", clave)
        self.clic("Ingresar")
