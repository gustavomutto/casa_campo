# Casa Campo

Sistema de gestión de reservas de casas de campo desarrollado en **Flutter 3.47 / Dart 3.13** (web, Android, Windows y Linux).

- **Aplicación web:** https://gustavomutto.github.io/casa_campo/
- **Usuarios de demostración:** `admin / Admin2026*` (administrador) · `recepcion / Recep2026*` (recepcionista)

## Funcionalidades

- Inicio de sesión con roles, contraseñas con hash SHA-256 y bloqueo tras 3 intentos fallidos.
- Gestión de casas (capacidad, precio por noche, activación) y de clientes.
- Consulta de disponibilidad y registro de reservas sin cruces de fechas.
- Tarifa automática: +20 % en temporada alta (15 dic–15 ene y 15 jun–15 jul) y −10 % desde 7 noches.
- Pagos con control de saldo y ciclo de vida: Pendiente → Confirmada (anticipo 30 %) → En curso → Finalizada, o Cancelada.
- Reportes de ingresos, saldos, reservas por estado y ocupación mensual.

## Arquitectura

```
lib/
  app/        Aplicación, navegación e inyección de dependencias
  core/       Validadores, formato, errores, almacenamiento y repositorio JSON genérico
  features/
    autenticacion/  casas/  clientes/  reservas/  reportes/
      domain/        entidades y servicios con las reglas de negocio
      data/          repositorios locales (shared_preferences / localStorage)
      presentation/  pantallas
```

## Pruebas

```bash
flutter test test/unit          # pruebas unitarias
flutter test test/widget        # pruebas de widgets
flutter test test/integracion   # integración ascendente, descendente y por hilos
flutter test --coverage         # suite completa con cobertura
```

Pruebas de sistema y aceptación (`pruebas/`): Selenium WebDriver (`pruebas/aceptacion`), Apache JMeter (`pruebas/jmeter`), Playwright (`pruebas/portabilidad`) y métricas CK (`pruebas/herramientas/metricas_ck.py`).

GitHub Actions ejecuta todo en cada cambio (`.github/workflows/`) y publica los reportes en las ramas `reportes`, `reportes-sistema`, `reportes-sonar` y `reportes-plataformas`.

## Documentación

Diagramas UML en `docs/diagramas/` y cálculos de estimación en `docs/estimacion/`.
