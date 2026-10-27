"""Cálculo de las estimaciones del proyecto Casa Campo.

Modelos: Puntos de Función (IFPUG), Puntos de Casos de Uso (Karner),
Puntos de Objeto (COCOMO II - composición de aplicaciones) y Puntos de
Historia. Resultado en estimaciones.json.
"""
import json
import math

SALARIO = 3_800_000          # salario mensual promedio desarrollador (Magneto365)
FACTOR_PRESTACIONAL = 1.52   # prestaciones sociales, seguridad social y parafiscales
COSTO_PM = round(SALARIO * FACTOR_PRESTACIONAL)  # costo de una persona-mes
HORAS_MES = 160
r = {"costo_persona_mes": COSTO_PM, "salario": SALARIO, "factor": FACTOR_PRESTACIONAL}

def tiempo_cocomo(esfuerzo, c=2.5, d=0.38):
    return c * esfuerzo ** d

# ---------------- 1. Puntos de función ----------------------------------
PESOS = {"ILF": {"B": 7, "M": 10, "A": 15}, "EIF": {"B": 5, "M": 7, "A": 10},
         "EI": {"B": 3, "M": 4, "A": 6}, "EO": {"B": 4, "M": 5, "A": 7}, "EQ": {"B": 3, "M": 4, "A": 6}}
funciones = [
    ("ILF", "Usuario", 5, 1, "B"), ("ILF", "Casa", 7, 1, "B"), ("ILF", "Cliente", 5, 1, "B"),
    ("ILF", "Reserva (con Pagos)", 14, 2, "B"),
    ("EI", "Iniciar sesión", 3, 1, "B"), ("EI", "Cerrar sesión", 1, 1, "B"),
    ("EI", "Registrar cliente", 5, 1, "B"), ("EI", "Editar cliente", 5, 1, "B"),
    ("EI", "Registrar casa", 6, 1, "B"), ("EI", "Editar casa", 6, 1, "B"),
    ("EI", "Activar / desactivar casa", 2, 2, "B"),
    ("EI", "Registrar reserva", 7, 3, "A"), ("EI", "Registrar pago", 4, 1, "B"),
    ("EI", "Confirmar reserva", 3, 2, "B"), ("EI", "Iniciar estadía", 2, 1, "B"),
    ("EI", "Finalizar reserva", 2, 1, "B"), ("EI", "Cancelar reserva", 3, 1, "B"),
    ("EO", "Cotización de la estadía (cálculo de tarifa)", 4, 2, "B"),
    ("EO", "Reporte de ingresos y reservas por estado", 9, 2, "M"),
    ("EO", "Reporte de ocupación mensual por casa", 6, 2, "M"),
    ("EQ", "Consultar / filtrar reservas", 10, 2, "M"), ("EQ", "Detalle de reserva", 12, 2, "M"),
    ("EQ", "Consultar disponibilidad", 8, 2, "M"), ("EQ", "Buscar clientes", 6, 1, "B"),
    ("EQ", "Listar casas", 7, 1, "B"),
]
pf_detalle = [{"tipo": t, "funcion": n, "det": det, "ret_ftr": rf, "complejidad": c, "peso": PESOS[t][c]} for t, n, det, rf, c in funciones]
pfna = sum(f["peso"] for f in pf_detalle)
gsc = [("Comunicación de datos", 3), ("Procesamiento distribuido", 1), ("Rendimiento", 3),
       ("Configuración muy utilizada", 2), ("Tasa de transacciones", 2), ("Entrada de datos en línea", 5),
       ("Eficiencia del usuario final", 4), ("Actualización en línea", 4), ("Procesamiento complejo", 3),
       ("Reutilización", 3), ("Facilidad de instalación", 3), ("Facilidad de operación", 4),
       ("Múltiples sitios", 4), ("Facilidad de cambio", 4)]
tdi = sum(v for _, v in gsc)
vaf = 0.65 + 0.01 * tdi
pfa = pfna * vaf
LOC_PF = 53   # Java / lenguajes OO similares a Dart (QSM)
kloc_pf = pfa * LOC_PF / 1000
e_pf = 2.4 * kloc_pf ** 1.05          # COCOMO 81 básico, modo orgánico
t_pf = tiempo_cocomo(e_pf)
r["pf"] = {"detalle": pf_detalle, "pfna": pfna, "gsc": gsc, "tdi": tdi, "vaf": round(vaf, 2), "pfa": round(pfa, 2),
           "loc_pf": LOC_PF, "kloc": round(kloc_pf, 2), "esfuerzo": round(e_pf, 2), "tiempo": round(t_pf, 2),
           "personas": round(e_pf / t_pf, 2), "costo": round(e_pf * COSTO_PM),
           "resumen": {t: sum(f["peso"] for f in pf_detalle if f["tipo"] == t) for t in PESOS}}

# ---------------- 2. Puntos de casos de uso ----------------------------
actores = [("Recepcionista", "Complejo (interfaz gráfica)", 3), ("Administrador", "Complejo (interfaz gráfica)", 3)]
casos = [("CU-01 Iniciar sesión", 4, "Medio", 10), ("CU-02 Cerrar sesión", 1, "Simple", 5),
         ("CU-03 Gestionar clientes", 6, "Medio", 10), ("CU-04 Gestionar casas", 6, "Medio", 10),
         ("CU-05 Registrar reserva", 9, "Complejo", 15), ("CU-06 Consultar disponibilidad", 5, "Medio", 10),
         ("CU-07 Registrar pago", 3, "Simple", 5), ("CU-08 Gestionar estado de la reserva", 7, "Medio", 10),
         ("CU-09 Consultar reservas", 3, "Simple", 5), ("CU-10 Generar reportes", 4, "Medio", 10),
         ("CU-11 Verificar disponibilidad", 2, "Simple", 5), ("CU-12 Calcular tarifa", 3, "Simple", 5)]
uaw = sum(a[2] for a in actores)
uucw = sum(c[3] for c in casos)
tf = [("T1 Sistema distribuido", 2, 1), ("T2 Rendimiento / tiempo de respuesta", 1, 3), ("T3 Eficiencia del usuario final", 1, 4),
      ("T4 Procesamiento interno complejo", 1, 3), ("T5 Código reutilizable", 1, 3), ("T6 Facilidad de instalación", 0.5, 3),
      ("T7 Facilidad de uso", 0.5, 4), ("T8 Portabilidad", 2, 4), ("T9 Facilidad de cambio", 1, 4),
      ("T10 Concurrencia", 1, 1), ("T11 Seguridad", 1, 3), ("T12 Acceso a terceros", 1, 0), ("T13 Capacitación especial", 1, 1)]
tfactor = sum(p * v for _, p, v in tf)
tcf = 0.6 + 0.01 * tfactor
ef = [("E1 Familiaridad con el modelo de proceso", 1.5, 3), ("E2 Experiencia en la aplicación", 0.5, 2),
      ("E3 Experiencia en orientación a objetos", 1, 3), ("E4 Capacidad del analista líder", 0.5, 3),
      ("E5 Motivación", 1, 4), ("E6 Estabilidad de los requisitos", 2, 4), ("E7 Personal a tiempo parcial", -1, 3),
      ("E8 Dificultad del lenguaje", -1, 2)]
efactor = sum(p * v for _, p, v in ef)
ecf = 1.4 - 0.03 * efactor
ucp = (uaw + uucw) * tcf * ecf
bajo = sum(1 for n, p, v in ef[:6] if v < 3) + sum(1 for n, p, v in ef[6:] if v > 3)
horas_ucp = 20 if bajo <= 2 else (28 if bajo <= 4 else 36)
e_ucp_h = ucp * horas_ucp
e_ucp = e_ucp_h / HORAS_MES
t_ucp = tiempo_cocomo(e_ucp)
r["pcu"] = {"actores": actores, "casos": casos, "uaw": uaw, "uucw": uucw, "uucp": uaw + uucw, "tf": tf,
            "tfactor": tfactor, "tcf": round(tcf, 3), "ef": ef, "efactor": efactor, "ecf": round(ecf, 3),
            "ucp": round(ucp, 2), "factores_bajos": bajo, "horas_por_pcu": horas_ucp, "horas": round(e_ucp_h, 1),
            "esfuerzo": round(e_ucp, 2), "tiempo": round(t_ucp, 2), "personas": round(e_ucp / t_ucp, 2),
            "costo": round(e_ucp * COSTO_PM)}

# ---------------- 3. Puntos de objeto -----------------------------------
pantallas = [("Inicio de sesión", "Simple", 1), ("Navegación principal por rol", "Simple", 1),
             ("Lista de reservas con filtros", "Media", 2), ("Formulario de nueva reserva", "Difícil", 3),
             ("Detalle de reserva con pagos y acciones", "Difícil", 3), ("Consulta de disponibilidad", "Media", 2),
             ("Lista de clientes", "Simple", 1), ("Formulario de cliente", "Simple", 1),
             ("Lista de casas", "Simple", 1), ("Formulario de casa", "Simple", 1), ("Reportes", "Media", 2)]
reportes = [("Cotización de la estadía", "Simple", 2), ("Reporte de ingresos y ocupación", "Media", 5)]
componentes = [("Calculadora de tarifas", 10), ("Servicio de disponibilidad", 10),
               ("Autenticación con hash y bloqueo", 10), ("Repositorio JSON persistente genérico", 10)]
op = sum(p[2] for p in pantallas) + sum(x[2] for x in reportes) + sum(c[1] for c in componentes)
reuso = 10
nop = op * (100 - reuso) / 100
prod = 13  # experiencia y madurez nominal
e_po = nop / prod
t_po = tiempo_cocomo(e_po)
r["po"] = {"pantallas": pantallas, "reportes": reportes, "componentes": componentes, "op": op, "reuso": reuso,
           "nop": nop, "prod": prod, "esfuerzo": round(e_po, 2), "tiempo": round(t_po, 2),
           "personas": round(e_po / t_po, 2), "costo": round(e_po * COSTO_PM)}

# ---------------- 4. Puntos de historia ---------------------------------
historias = [("HU-01", "Como usuario quiero iniciar sesión según mi rol", 3),
             ("HU-02", "Como administrador quiero que la cuenta se bloquee tras 3 intentos fallidos", 2),
             ("HU-03", "Como usuario quiero cerrar sesión", 1),
             ("HU-04", "Como recepcionista quiero registrar clientes", 3),
             ("HU-05", "Como recepcionista quiero buscar y editar clientes", 2),
             ("HU-06", "Como administrador quiero registrar y editar casas", 3),
             ("HU-07", "Como administrador quiero activar o desactivar casas", 2),
             ("HU-08", "Como recepcionista quiero consultar la disponibilidad", 5),
             ("HU-09", "Como recepcionista quiero registrar reservas validadas", 8),
             ("HU-10", "Como administrador quiero que la tarifa se calcule por temporada y estadía", 5),
             ("HU-11", "Como recepcionista quiero listar y filtrar reservas", 3),
             ("HU-12", "Como recepcionista quiero registrar pagos", 3),
             ("HU-13", "Como recepcionista quiero confirmar reservas con anticipo", 2),
             ("HU-14", "Como recepcionista quiero iniciar y finalizar estadías", 3),
             ("HU-15", "Como recepcionista quiero cancelar reservas indicando el motivo", 2),
             ("HU-16", "Como administrador quiero ver reportes de ingresos y ocupación", 5),
             ("HU-17", "Como usuario quiero que los datos se conserven entre sesiones", 5),
             ("HU-18", "Como usuario quiero acceder a la aplicación desde la web", 2)]
total_ph = sum(h[2] for h in historias)
equipo = 2
velocidad = 12          # puntos por sprint de 2 semanas para el equipo
sprints = math.ceil(total_ph / velocidad)
t_ph = sprints * 0.5    # meses
e_ph = t_ph * equipo
r["ph"] = {"historias": historias, "total": total_ph, "equipo": equipo, "velocidad": velocidad, "sprints": sprints,
           "semanas_sprint": 2, "esfuerzo": e_ph, "tiempo": t_ph, "personas": equipo, "costo": round(e_ph * COSTO_PM)}

json.dump(r, open("estimaciones.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
for k in ["pf", "pcu", "po", "ph"]:
    x = r[k]
    print(k, {c: x.get(c) for c in ["pfa", "ucp", "nop", "total", "esfuerzo", "tiempo", "personas", "costo"] if c in x})
print("costo PM", COSTO_PM)
