"""Pruebas de aceptación de Casa Campo con Selenium WebDriver.

Cada caso (CA-XX) corresponde a un requisito funcional y guarda una
captura de pantalla por paso en la carpeta indicada por CAPTURAS.

Ejecución:
    BASE_URL=http://localhost:8080/casa_campo/ pytest pruebas/aceptacion -v
"""
import time

import pytest

from flutter_web import App, crear_driver


@pytest.fixture
def app(request):
    driver = crear_driver()
    caso = request.node.name.split("_")[1].upper().replace("CA", "CA-")
    aplicacion = App(driver, caso)
    aplicacion.abrir()
    yield aplicacion
    driver.quit()


def ingresar_admin(app):
    app.iniciar_sesion("admin", "Admin2026*")
    app.esperar_texto("Nueva reserva")


def test_ca01_inicio_sesion_exitoso(app):
    """RF01 - Ingreso exitoso con el usuario administrador."""
    app.captura("pantalla_login")
    app.escribir("Usuario", "admin")
    app.escribir("Contraseña", "Admin2026*")
    app.captura("credenciales_ingresadas")
    app.clic("Ingresar")
    app.esperar_texto("Nueva reserva")
    app.captura("pantalla_principal")
    assert app.hay_texto("Reportes")
    assert app.hay_texto("Administrador Casa Campo")


def test_ca02_credenciales_incorrectas(app):
    """RF01 - Ingreso rechazado con contraseña incorrecta."""
    app.escribir("Usuario", "admin")
    app.escribir("Contraseña", "ClaveMala1")
    app.captura("credenciales_incorrectas")
    app.clic("Ingresar")
    app.esperar_texto("Usuario o contraseña incorrectos.")
    app.captura("mensaje_error")
    assert not app.hay_texto("Nueva reserva")


def test_ca03_bloqueo_por_intentos(app):
    """RF01 - Bloqueo temporal de la cuenta al tercer intento fallido."""
    app.escribir("Usuario", "recepcion")
    for _ in range(3):
        app.escribir("Contraseña", "ClaveMala1")
        app.clic("Ingresar")
        time.sleep(0.5)
    app.escribir("Contraseña", "Recep2026*")
    app.clic("Ingresar")
    app.esperar_texto("Cuenta bloqueada")
    app.captura("cuenta_bloqueada")
    assert not app.hay_texto("Nueva reserva")


def test_ca04_permisos_recepcionista(app):
    """RF03 - El recepcionista no tiene acceso a Casas ni a Reportes."""
    app.iniciar_sesion("recepcion", "Recep2026*")
    app.esperar_texto("Nueva reserva")
    app.captura("menu_recepcionista")
    assert app.hay_texto("Disponibilidad")
    assert not app.hay_texto("Reportes")


def test_ca05_registrar_cliente(app):
    """RF04 - Registro de un cliente nuevo."""
    ingresar_admin(app)
    app.clic("Clientes")
    app.clic("Nuevo cliente")
    app.escribir("Documento de identidad", "1067555444")
    app.escribir("Nombre completo", "Valentina Ospino")
    app.escribir("Teléfono", "3014445566")
    app.escribir("Correo electrónico", "vospino@correo.com")
    app.captura("formulario_cliente")
    app.clic("Guardar cliente")
    app.esperar_texto("Cliente Valentina Ospino registrado.")
    app.captura("cliente_registrado")
    assert app.hay_texto("CC 1067555444")


def test_ca06_cliente_con_datos_invalidos(app):
    """RF04 - El formulario rechaza datos inválidos."""
    ingresar_admin(app)
    app.clic("Clientes")
    app.clic("Nuevo cliente")
    app.escribir("Documento de identidad", "12AB")
    app.escribir("Nombre completo", "Valentina")
    app.escribir("Teléfono", "6051234567")
    app.escribir("Correo electrónico", "correo@")
    app.clic("Guardar cliente")
    app.esperar_texto("El documento solo debe contener números.")
    app.captura("errores_validacion")
    assert app.hay_texto("El teléfono celular debe empezar por 3.")
    assert app.hay_texto("El correo electrónico no es válido.")


def test_ca07_consultar_disponibilidad(app):
    """RF09 - Consulta de casas disponibles."""
    ingresar_admin(app)
    app.clic("Disponibilidad")
    app.escribir("Fecha de entrada", "14/11/2026")
    app.escribir("Fecha de salida", "15/11/2026")
    app.escribir("Huéspedes", "10")
    app.captura("criterios_busqueda")
    app.clic("Buscar")
    app.esperar_texto("2 casa(s) disponible(s)")
    app.captura("resultados")
    assert app.hay_texto("Casa Los Mangos")
    assert app.hay_texto("Villa Manaure")
    assert not app.hay_texto("Finca El Remanso")


def test_ca08_registrar_reserva(app):
    """RF10 - Registro de una reserva válida con cálculo de la tarifa."""
    ingresar_admin(app)
    app.clic("Nueva reserva")
    app.seleccionar("Casa", "Cabaña Sierra Nevada (máx. 4)")
    app.seleccionar("Cliente", "Andrés Gómez · 77182934")
    app.escribir("Fecha de entrada", "01/02/2027")
    app.escribir("Fecha de salida", "04/02/2027")
    app.escribir("Cantidad de huéspedes", "3")
    app.esperar_texto("Valor de la estadía: $ 660.000")
    app.captura("formulario_reserva")
    app.clic("Guardar reserva")
    app.esperar_texto("Reserva res-007 registrada.")
    app.captura("reserva_registrada")


def test_ca09_reserva_en_fechas_ocupadas(app):
    """RF10 - No se permite reservar una casa ocupada."""
    ingresar_admin(app)
    app.clic("Nueva reserva")
    app.seleccionar("Casa", "Finca El Remanso (máx. 8)")
    app.seleccionar("Cliente", "Laura Torres · 1065987654")
    app.escribir("Fecha de entrada", "14/11/2026")
    app.escribir("Fecha de salida", "17/11/2026")
    app.escribir("Cantidad de huéspedes", "4")
    app.clic("Guardar reserva")
    app.esperar_texto("La casa no está disponible en las fechas seleccionadas.")
    app.captura("casa_no_disponible")


def test_ca10_pago_y_confirmacion(app):
    """RF12 y RF13 - Registrar el anticipo y confirmar la reserva."""
    ingresar_admin(app)
    app.clic("res-006")
    app.esperar_texto("Saldo pendiente")
    app.captura("detalle_reserva")
    app.clic("Registrar pago")
    app.escribir("Monto", "232000")
    app.captura("dialogo_pago")
    app.clic("Guardar pago")
    app.esperar_texto("Pago de $ 232.000 registrado.")
    app.captura("pago_registrado")
    app.clic("Confirmar")
    app.esperar_texto("Reserva confirmada.")
    app.esperar_texto("Iniciar estadía")
    app.captura("reserva_confirmada")


def test_ca11_cancelar_reserva(app):
    """RF16 - Cancelación de una reserva pendiente con motivo."""
    ingresar_admin(app)
    app.clic("res-005")
    app.esperar_texto("Saldo pendiente")
    app.clic("Cancelar reserva")
    app.escribir("Motivo de cancelación", "El cliente cambió de planes")
    app.captura("motivo_cancelacion")
    app.clic("Confirmar cancelación")
    app.esperar_texto("Reserva cancelada.")
    app.captura("reserva_cancelada")
    assert app.hay_texto("El cliente cambió de planes")


def test_ca12_registrar_casa(app):
    """RF06 - Registro de una casa por el administrador."""
    ingresar_admin(app)
    app.clic("Casas")
    app.clic("Nueva casa")
    app.escribir("Nombre", "Finca Las Palmas")
    app.escribir("Municipio", "San Diego")
    app.escribir("Capacidad máxima (personas)", "10")
    app.escribir("Precio por noche (COP)", "400000")
    app.captura("formulario_casa")
    app.clic("Guardar casa")
    app.esperar_texto("Casa Finca Las Palmas guardada.")
    app.captura("casa_registrada")


def test_ca13_reportes(app):
    """RF17 - Consulta de reportes de ingresos y ocupación."""
    ingresar_admin(app)
    app.clic("Reportes")
    app.esperar_texto("Ingresos recaudados")
    app.captura("reportes")
    assert app.hay_texto("Reservas registradas")
    assert app.hay_texto("Ocupación")
