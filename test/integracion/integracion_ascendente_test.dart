// PRUEBAS DE INTEGRACIÓN INCREMENTAL ASCENDENTE (bottom-up).
//
// Nivel 1: Almacenamiento + Repositorios JSON (los tests actúan como
//          controladores/drivers).
// Nivel 2: Repositorios + Servicios de dominio.
// Nivel 3: Servicios + persistencia completa (se reabren los repositorios
//          sobre el mismo almacenamiento para verificar los datos).
import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/features/casas/domain/servicio_casas.dart';
import 'package:casa_campo/features/clientes/domain/servicio_clientes.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/servicio_disponibilidad.dart';
import 'package:casa_campo/features/reservas/domain/servicio_reservas.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

ServicioReservas _servicioReservas(Repositorios r) => ServicioReservas(
  casas: r.casas,
  clientes: r.clientes,
  reservas: r.reservas,
  disponibilidad: ServicioDisponibilidad(r.casas, r.reservas),
  reloj: relojPruebas,
);

void main() {
  group('Nivel 1: Almacenamiento + Repositorios', () {
    test(
      'CPI-A1 los tres repositorios cargan las semillas y las persisten',
      () async {
        final almacenamiento = AlmacenamientoEnMemoria();
        final repos = crearRepositorios(almacenamiento);

        expect(await repos.casas.obtenerTodas(), hasLength(5));
        expect(await repos.clientes.obtenerTodos(), hasLength(5));
        expect(await repos.reservas.obtenerTodos(), hasLength(6));

        for (final clave in [
          'casa_campo.casas.v1',
          'casa_campo.clientes.v1',
          'casa_campo.reservas.v1',
        ]) {
          expect(await almacenamiento.leer(clave), isNotNull);
        }
      },
    );

    test(
      'CPI-A2 las reservas referencian casas y clientes existentes',
      () async {
        final repos = crearRepositorios();
        final casas = {for (final c in await repos.casas.obtenerTodas()) c.id};
        final clientes = {
          for (final c in await repos.clientes.obtenerTodos()) c.id,
        };

        for (final reserva in await repos.reservas.obtenerTodos()) {
          expect(casas, contains(reserva.casaId));
          expect(clientes, contains(reserva.clienteId));
        }
      },
    );
  });

  group('Nivel 2: Repositorios + Servicios', () {
    test('CPI-A3 ServicioDisponibilidad usa reservas y casas reales', () async {
      final repos = crearRepositorios();
      final disponibilidad = ServicioDisponibilidad(
        repos.casas,
        repos.reservas,
      );
      final reserva = (await repos.reservas.obtenerPorId('res-004'))!;

      final casas = await disponibilidad.casasDisponibles(reserva.rangoFechas);
      expect(casas.map((c) => c.id), isNot(contains('casa-001')));
    });

    test('CPI-A4 ServicioReservas integra clientes, casas y tarifa', () async {
      final repos = crearRepositorios();
      final cliente = await ServicioClientes(repos.clientes).registrar(
        const DatosCliente(
          documento: '1067999888',
          nombreCompleto: 'Cliente Integración',
          telefono: '3009998877',
          correo: 'integracion@correo.com',
        ),
      );
      final casa = await ServicioCasas(repos.casas, repos.reservas).crear(
        const DatosCasa(
          nombre: 'Finca Integración',
          municipio: 'Becerril',
          capacidadMaxima: '6',
          precioNoche: '300000',
        ),
      );

      final reserva = await _servicioReservas(repos).crearReserva(
        SolicitudReserva(
          casaId: casa.id,
          clienteId: cliente.id,
          fechaEntrada: DateTime.utc(2026, 12, 13),
          fechaSalida: DateTime.utc(2026, 12, 20),
          cantidadHuespedes: 6,
        ),
      );

      // 2 noches normales + 5 de temporada alta, con 10 % de descuento.
      expect(reserva.montoTotal, (2 * 300000 + 5 * 360000) * 90 ~/ 100);
      expect(reserva.clienteNombre, 'Cliente Integración');
    });
  });

  group('Nivel 3: Servicios + persistencia', () {
    test('CPI-A5 el ciclo completo de una reserva queda persistido', () async {
      final almacenamiento = AlmacenamientoEnMemoria();
      final servicio = _servicioReservas(crearRepositorios(almacenamiento));

      final creada = await servicio.crearReserva(
        SolicitudReserva(
          casaId: 'casa-003',
          clienteId: 'cli-002',
          fechaEntrada: DateTime.utc(2027, 1, 20),
          fechaSalida: DateTime.utc(2027, 1, 22),
          cantidadHuespedes: 2,
        ),
      );
      await servicio.registrarPago(
        creada.id,
        monto: 200000,
        metodo: MetodoPago.efectivo,
      );
      await servicio.confirmar(creada.id, usuario: 'admin');
      await servicio.iniciarEstadia(creada.id);
      await servicio.registrarPago(
        creada.id,
        monto: creada.montoTotal - 200000,
        metodo: MetodoPago.tarjeta,
      );
      await servicio.finalizar(creada.id);

      // Se reabre todo sobre el mismo almacenamiento (simula reiniciar la app).
      final reabierta = await crearRepositorios(almacenamiento).reservas
          .obtenerPorId(creada.id);

      expect(reabierta!.estado, const Finalizada());
      expect(reabierta.pagos, hasLength(2));
      expect(reabierta.saldoPendiente, 0);
    });
  });
}
