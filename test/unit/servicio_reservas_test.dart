// Módulos de reservas y pagos: pruebas unitarias.
// Los casos CP-RES-C* recorren los caminos independientes de crearReserva().
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/servicio_disponibilidad.dart';
import 'package:casa_campo/features/reservas/domain/servicio_reservas.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

SolicitudReserva _solicitud({
  String casaId = 'casa-003',
  String clienteId = 'cli-003',
  DateTime? entrada,
  DateTime? salida,
  int huespedes = 3,
}) {
  return SolicitudReserva(
    casaId: casaId,
    clienteId: clienteId,
    fechaEntrada: entrada ?? DateTime.utc(2027, 2, 1),
    fechaSalida: salida ?? DateTime.utc(2027, 2, 4),
    cantidadHuespedes: huespedes,
  );
}

void main() {
  late Repositorios repos;
  late ServicioReservas servicio;

  setUp(() {
    repos = crearRepositorios();
    servicio = ServicioReservas(
      casas: repos.casas,
      clientes: repos.clientes,
      reservas: repos.reservas,
      disponibilidad: ServicioDisponibilidad(repos.casas, repos.reservas),
      reloj: relojPruebas,
    );
  });

  Matcher negocio(String texto) => throwsA(
    isA<ErrorDeNegocio>().having((e) => e.mensaje, 'mensaje', contains(texto)),
  );

  Matcher validacion(String campo) =>
      throwsA(isA<ErrorDeValidacion>().having((e) => e.campo, 'campo', campo));

  group('crearReserva() - camino básico', () {
    test('CP-RES-C1 casa inexistente', () {
      expect(
        servicio.crearReserva(_solicitud(casaId: 'casa-999')),
        negocio('no existe o no está activa'),
      );
    });

    test('CP-RES-C2 casa inactiva', () {
      expect(
        servicio.crearReserva(_solicitud(casaId: 'casa-005')),
        negocio('no existe o no está activa'),
      );
    });

    test('CP-RES-C3 cliente inexistente', () {
      expect(
        servicio.crearReserva(_solicitud(clienteId: 'cli-999')),
        negocio('cliente seleccionado no existe'),
      );
    });

    test('CP-RES-C4 fecha de entrada anterior a hoy', () {
      expect(
        servicio.crearReserva(
          _solicitud(
            entrada: DateTime.utc(2026, 10, 26),
            salida: DateTime.utc(2026, 10, 28),
          ),
        ),
        validacion('fechaEntrada'),
      );
    });

    test('CP-RES-C5 fecha de salida igual a la de entrada', () {
      expect(
        servicio.crearReserva(
          _solicitud(
            entrada: DateTime.utc(2027, 2, 1),
            salida: DateTime.utc(2027, 2, 1),
          ),
        ),
        validacion('fechaSalida'),
      );
    });

    test('CP-RES-C6 estadía de 31 noches', () {
      expect(
        servicio.crearReserva(
          _solicitud(
            entrada: DateTime.utc(2027, 3, 1),
            salida: DateTime.utc(2027, 4, 1),
          ),
        ),
        validacion('fechaSalida'),
      );
    });

    test('CP-RES-C7 cero huéspedes', () {
      expect(
        servicio.crearReserva(_solicitud(huespedes: 0)),
        validacion('cantidadHuespedes'),
      );
    });

    test('CP-RES-C8 huéspedes por encima de la capacidad (5 > 4)', () {
      expect(
        servicio.crearReserva(_solicitud(huespedes: 5)),
        validacion('cantidadHuespedes'),
      );
    });

    test('CP-RES-C9 casa ocupada en las fechas solicitadas', () {
      expect(
        servicio.crearReserva(
          _solicitud(
            casaId: 'casa-001',
            entrada: DateTime.utc(2026, 11, 14),
            salida: DateTime.utc(2026, 11, 17),
          ),
        ),
        negocio('no está disponible'),
      );
    });

    test(
      'CP-RES-C10 reserva válida queda Pendiente y con valor calculado',
      () async {
        final reserva = await servicio.crearReserva(_solicitud());

        expect(reserva.id, 'res-007');
        expect(reserva.estado, const Pendiente());
        expect(reserva.montoTotal, 660000);
        expect(reserva.clienteNombre, 'Andrés Gómez');
        expect(await repos.reservas.obtenerPorId('res-007'), reserva);
      },
    );
  });

  group('crearReserva() - valores límite', () {
    test('entrada hoy es válida', () async {
      final reserva = await servicio.crearReserva(
        _solicitud(
          entrada: DateTime.utc(2026, 10, 27),
          salida: DateTime.utc(2026, 10, 28),
        ),
      );
      expect(reserva.rangoFechas.cantidadNoches, 1);
    });

    test('30 noches es válido', () async {
      final reserva = await servicio.crearReserva(
        _solicitud(
          entrada: DateTime.utc(2027, 3, 1),
          salida: DateTime.utc(2027, 3, 31),
        ),
      );
      expect(reserva.rangoFechas.cantidadNoches, 30);
    });

    test('capacidad exacta (4 de 4) y 1 huésped son válidos', () async {
      expect(
        (await servicio.crearReserva(_solicitud(huespedes: 4)))
            .cantidadHuespedes,
        4,
      );
      expect(
        (await servicio.crearReserva(
          _solicitud(
            huespedes: 1,
            entrada: DateTime.utc(2027, 5, 1),
            salida: DateTime.utc(2027, 5, 2),
          ),
        )).cantidadHuespedes,
        1,
      );
    });

    test('entrar el día de salida de otra reserva es válido', () async {
      final reserva = await servicio.crearReserva(
        _solicitud(
          casaId: 'casa-001',
          entrada: DateTime.utc(2026, 11, 16),
          salida: DateTime.utc(2026, 11, 18),
        ),
      );
      expect(reserva.casaId, 'casa-001');
    });

    test('una reserva cancelada no bloquea la casa', () async {
      final reserva = await servicio.crearReserva(
        _solicitud(
          entrada: DateTime.utc(2026, 11, 6),
          salida: DateTime.utc(2026, 11, 8),
        ),
      );
      expect(reserva.estado, isA<Pendiente>());
    });
  });

  group('Pagos', () {
    test('CP-PAG-01 registra un abono válido', () async {
      final reserva = await servicio.registrarPago(
        'res-005',
        monto: 1500000,
        metodo: MetodoPago.transferencia,
      );

      expect(reserva.pagos, hasLength(1));
      expect(reserva.totalPagado, 1500000);
      expect(reserva.saldoPendiente, 4914000 - 1500000);
    });

    test('CP-PAG-02 monto 0', () {
      expect(
        servicio.registrarPago(
          'res-005',
          monto: 0,
          metodo: MetodoPago.efectivo,
        ),
        validacion('monto'),
      );
    });

    test('CP-PAG-03 monto negativo', () {
      expect(
        servicio.registrarPago(
          'res-005',
          monto: -1,
          metodo: MetodoPago.efectivo,
        ),
        validacion('monto'),
      );
    });

    test('CP-PAG-04 monto mayor que el saldo (saldo + 1)', () {
      expect(
        servicio.registrarPago(
          'res-005',
          monto: 4914001,
          metodo: MetodoPago.efectivo,
        ),
        validacion('monto'),
      );
    });

    test('CP-PAG-05 monto igual al saldo deja la reserva pagada', () async {
      final reserva = await servicio.registrarPago(
        'res-005',
        monto: 4914000,
        metodo: MetodoPago.tarjeta,
      );
      expect(reserva.saldoPendiente, 0);
    });

    test('CP-PAG-06 reserva cancelada no admite pagos', () {
      expect(
        servicio.registrarPago(
          'res-003',
          monto: 1000,
          metodo: MetodoPago.efectivo,
        ),
        negocio('cancelada o finalizada'),
      );
    });

    test('CP-PAG-07 reserva inexistente', () {
      expect(
        servicio.registrarPago(
          'res-999',
          monto: 1000,
          metodo: MetodoPago.efectivo,
        ),
        negocio('no existe'),
      );
    });
  });

  group('Ciclo de vida (transiciones de estado)', () {
    test('CP-EST-01 confirmar sin anticipo del 30 % falla', () {
      // res-006: total 1.440.000, pagado 200.000 (< 432.000).
      expect(
        servicio.confirmar('res-006', usuario: 'admin'),
        negocio('anticipo'),
      );
    });

    test('CP-EST-02 confirmar con anticipo exacto del 30 %', () async {
      await servicio.registrarPago(
        'res-006',
        monto: 232000,
        metodo: MetodoPago.efectivo,
      );
      final reserva = await servicio.confirmar('res-006', usuario: 'admin');

      expect(reserva.estado, const Confirmada('admin'));
    });

    test('CP-EST-03 solo se confirman reservas pendientes', () {
      expect(
        servicio.confirmar('res-004', usuario: 'admin'),
        negocio('Solo se pueden confirmar'),
      );
    });

    test('CP-EST-04 iniciar estadía de una reserva confirmada', () async {
      final reserva = await servicio.iniciarEstadia('res-004');
      expect(reserva.estado, const EnCurso());
    });

    test('CP-EST-05 no se inicia una reserva pendiente', () {
      expect(servicio.iniciarEstadia('res-005'), negocio('confirmada'));
    });

    test('CP-EST-06 finalizar con saldo pendiente falla', () {
      expect(servicio.finalizar('res-002'), negocio('saldo pendiente'));
    });

    test('CP-EST-07 finalizar una reserva en curso y pagada', () async {
      await servicio.registrarPago(
        'res-002',
        monto: 1200000,
        metodo: MetodoPago.tarjeta,
      );
      final reserva = await servicio.finalizar('res-002');

      expect(reserva.estado, const Finalizada());
    });

    test('CP-EST-08 no se finaliza una reserva confirmada', () {
      expect(servicio.finalizar('res-004'), negocio('en curso'));
    });

    test('CP-EST-09 cancelar con motivo válido', () async {
      final reserva = await servicio.cancelar(
        'res-005',
        motivo: 'Cambio de planes',
      );
      expect(reserva.estado, const Cancelada('Cambio de planes'));
    });

    test('CP-EST-10 cancelar con motivo de 4 caracteres', () {
      expect(
        servicio.cancelar('res-005', motivo: 'nada'),
        validacion('motivo'),
      );
    });

    test('CP-EST-11 no se cancela una reserva en curso o finalizada', () {
      expect(
        servicio.cancelar('res-002', motivo: 'Motivo válido'),
        negocio('En curso'),
      );
      expect(
        servicio.cancelar('res-001', motivo: 'Motivo válido'),
        negocio('Finalizada'),
      );
    });
  });

  group('Consultas', () {
    test('lista y filtra por estado, ordenadas por fecha de entrada', () async {
      final todas = await servicio.listar();
      expect(todas, hasLength(6));
      expect(todas.first.id, 'res-001');

      final pendientes = await servicio.listar(tipoEstado: 'pendiente');
      expect(pendientes.map((r) => r.id), ['res-006', 'res-005']);
    });

    test('cotiza una estadía y valida la casa', () async {
      final repos2 = crearRepositorios();
      final rango = (await repos2.reservas.obtenerPorId('res-005'))!
          .rangoFechas;

      expect(await servicio.cotizar('casa-004', rango), 4914000);
      expect(
        servicio.cotizar('casa-999', rango),
        throwsA(isA<ErrorDeNegocio>()),
      );
    });
  });
}
