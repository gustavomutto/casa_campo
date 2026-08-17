import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RangoFechas', () {
    test('calcula correctamente la cantidad de noches', () {
      final rango = RangoFechas(
        fechaEntrada: DateTime.utc(2026, 9, 1),
        fechaSalida: DateTime.utc(2026, 9, 5),
      );

      expect(rango.cantidadNoches, 4);
    });

    test('rechaza una fecha de salida anterior a la entrada', () {
      expect(
        () => RangoFechas(
          fechaEntrada: DateTime.utc(2026, 9, 5),
          fechaSalida: DateTime.utc(2026, 9, 1),
        ),
        throwsArgumentError,
      );
    });

    test('rechaza fechas de entrada y salida iguales', () {
      expect(
        () => RangoFechas(
          fechaEntrada: DateTime.utc(2026, 9, 5),
          fechaSalida: DateTime.utc(2026, 9, 5),
        ),
        throwsArgumentError,
      );
    });
  });

  group('EstadoReserva', () {
    test('convierte pendiente desde JSON', () {
      final estado = EstadoReserva.fromJson({'tipo': 'pendiente'});

      expect(estado, isA<Pendiente>());
    });

    test('convierte confirmada desde JSON', () {
      final estado = EstadoReserva.fromJson({
        'tipo': 'confirmada',
        'confirmadaPor': 'admin',
      });

      expect(estado, isA<Confirmada>());
      expect((estado as Confirmada).confirmadaPor, 'admin');
    });

    test('convierte en curso desde JSON', () {
      final estado = EstadoReserva.fromJson({'tipo': 'en_curso'});

      expect(estado, isA<EnCurso>());
    });

    test('convierte finalizada desde JSON', () {
      final estado = EstadoReserva.fromJson({'tipo': 'finalizada'});

      expect(estado, isA<Finalizada>());
    });

    test('convierte cancelada desde JSON', () {
      final estado = EstadoReserva.fromJson({
        'tipo': 'cancelada',
        'motivo': 'El cliente canceló',
      });

      expect(estado, isA<Cancelada>());
      expect((estado as Cancelada).motivo, 'El cliente canceló');
    });

    test('rechaza un tipo de estado desconocido', () {
      expect(
        () => EstadoReserva.fromJson({'tipo': 'estado_inexistente'}),
        throwsA(isA<CampoInvalido>()),
      );
    });
  });

  group('Reserva', () {
    test('crea una reserva correctamente', () {
      final reserva = Reserva(
        id: 'r1',
        casaId: 'casa1',
        clienteNombre: 'Gustavo',
        rangoFechas: RangoFechas(
          fechaEntrada: DateTime.utc(2026, 9, 1),
          fechaSalida: DateTime.utc(2026, 9, 4),
        ),
        estado: const Pendiente(),
      );

      expect(reserva.id, 'r1');
      expect(reserva.casaId, 'casa1');
      expect(reserva.clienteNombre, 'Gustavo');
      expect(reserva.rangoFechas.cantidadNoches, 3);
      expect(reserva.estado, isA<Pendiente>());
    });

    test('convierte una reserva desde JSON', () {
      final reserva = Reserva.fromJson({
        'id': 'r1',
        'casaId': 'casa1',
        'clienteNombre': 'Gustavo',
        'rangoFechas': {
          'fechaEntrada': '2026-09-01T00:00:00.000Z',
          'fechaSalida': '2026-09-04T00:00:00.000Z',
        },
        'estado': {'tipo': 'pendiente'},
      });

      expect(reserva.id, 'r1');
      expect(reserva.casaId, 'casa1');
      expect(reserva.clienteNombre, 'Gustavo');
      expect(reserva.rangoFechas.cantidadNoches, 3);
      expect(reserva.estado, isA<Pendiente>());
    });

    test('convierte una reserva a JSON', () {
      final reserva = Reserva(
        id: 'r1',
        casaId: 'casa1',
        clienteNombre: 'Gustavo',
        rangoFechas: RangoFechas(
          fechaEntrada: DateTime.utc(2026, 9, 1),
          fechaSalida: DateTime.utc(2026, 9, 4),
        ),
        estado: const Pendiente(),
      );

      final json = reserva.toJson();

      expect(json['id'], 'r1');
      expect(json['casaId'], 'casa1');
      expect(json['clienteNombre'], 'Gustavo');
      expect(
        (json['rangoFechas'] as Map<String, dynamic>)['fechaEntrada'],
        '2026-09-01T00:00:00.000Z',
      );
      expect((json['estado'] as Map<String, dynamic>)['tipo'], 'pendiente');
    });

    test('copiarCon permite cambiar el estado', () {
      final reserva = Reserva(
        id: 'r1',
        casaId: 'casa1',
        clienteNombre: 'Gustavo',
        rangoFechas: RangoFechas(
          fechaEntrada: DateTime.utc(2026, 9, 1),
          fechaSalida: DateTime.utc(2026, 9, 4),
        ),
        estado: const Pendiente(),
      );

      final actualizada = reserva.copiarCon(estado: const Confirmada('admin'));

      expect(actualizada.id, reserva.id);
      expect(actualizada.casaId, reserva.casaId);
      expect(actualizada.estado, isA<Confirmada>());
      expect((actualizada.estado as Confirmada).confirmadaPor, 'admin');
    });

    test('rechaza una reserva con rango de fechas inválido', () {
      expect(
        () => Reserva(
          id: 'r1',
          casaId: 'casa1',
          clienteNombre: 'Gustavo',
          rangoFechas: RangoFechas(
            fechaEntrada: DateTime.utc(2026, 9, 5),
            fechaSalida: DateTime.utc(2026, 9, 1),
          ),
          estado: const Pendiente(),
        ),
        throwsArgumentError,
      );
    });
  });
}
