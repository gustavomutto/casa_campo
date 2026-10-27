import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:flutter_test/flutter_test.dart';

Reserva _reserva({
  EstadoReserva estado = const Pendiente(),
  List<Pago> pagos = const [],
}) {
  return Reserva(
    id: 'r1',
    casaId: 'casa1',
    clienteNombre: 'Gustavo',
    rangoFechas: RangoFechas(
      fechaEntrada: DateTime.utc(2026, 9, 1),
      fechaSalida: DateTime.utc(2026, 9, 4),
    ),
    montoTotal: 900000,
    estado: estado,
    pagos: pagos,
  );
}

void main() {
  group('RangoFechas', () {
    test('calcula correctamente la cantidad de noches', () {
      final rango = RangoFechas(
        fechaEntrada: DateTime.utc(2026, 9, 1),
        fechaSalida: DateTime.utc(2026, 9, 5),
      );

      expect(rango.cantidadNoches, 4);
      expect(rango.noches.first, DateTime.utc(2026, 9, 1));
      expect(rango.noches.last, DateTime.utc(2026, 9, 4));
    });

    test('cuenta noches por fecha calendario aunque haya horas', () {
      // Defecto corregido: antes 20:00 -> 16:00 de 3 días después daba 2.
      final rango = RangoFechas(
        fechaEntrada: DateTime.utc(2026, 8, 20, 20),
        fechaSalida: DateTime.utc(2026, 8, 23, 16),
      );

      expect(rango.cantidadNoches, 3);
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

    test('detecta solapamientos y permite entrada el día de salida', () {
      final base = RangoFechas(
        fechaEntrada: DateTime.utc(2026, 11, 13),
        fechaSalida: DateTime.utc(2026, 11, 16),
      );
      RangoFechas r(int a, int b) => RangoFechas(
        fechaEntrada: DateTime.utc(2026, 11, a),
        fechaSalida: DateTime.utc(2026, 11, b),
      );

      expect(base.seSolapaCon(r(14, 17)), isTrue);
      expect(base.seSolapaCon(r(10, 14)), isTrue);
      expect(base.seSolapaCon(r(12, 20)), isTrue);
      expect(base.seSolapaCon(r(14, 15)), isTrue);
      expect(base.seSolapaCon(r(16, 18)), isFalse);
      expect(base.seSolapaCon(r(10, 13)), isFalse);
    });

    test('igualdad y JSON', () {
      final a = RangoFechas.fromJson({
        'fechaEntrada': '2026-09-01T00:00:00.000Z',
        'fechaSalida': '2026-09-04T00:00:00.000Z',
      });
      final b = RangoFechas.fromJson(a.toJson());

      expect(a, b);
      expect(a.hashCode, b.hashCode);
    });
  });

  group('EstadoReserva', () {
    test('convierte pendiente desde JSON', () {
      expect(EstadoReserva.fromJson({'tipo': 'pendiente'}), isA<Pendiente>());
    });

    test('convierte confirmada desde JSON', () {
      final estado = EstadoReserva.fromJson({
        'tipo': 'confirmada',
        'confirmadaPor': 'admin',
      });

      expect(estado, isA<Confirmada>());
      expect((estado as Confirmada).confirmadaPor, 'admin');
    });

    test('convierte en curso y finalizada desde JSON', () {
      expect(EstadoReserva.fromJson({'tipo': 'en_curso'}), isA<EnCurso>());
      expect(EstadoReserva.fromJson({'tipo': 'finalizada'}), isA<Finalizada>());
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

    test('ida y vuelta JSON, igualdad y propiedades', () {
      const estados = <EstadoReserva>[
        Pendiente(),
        Confirmada('admin'),
        EnCurso(),
        Finalizada(),
        Cancelada('motivo'),
      ];

      for (final estado in estados) {
        final copia = EstadoReserva.fromJson(estado.toJson());
        expect(copia, estado);
        expect(copia.hashCode, estado.hashCode);
        expect(copia.etiqueta, isNotEmpty);
        expect(copia.tipo, estado.toJson()['tipo']);
      }

      expect(const Confirmada('a') == const Confirmada('b'), isFalse);
      expect(estados.where((e) => e.esActiva), hasLength(3));
    });
  });

  group('Reserva', () {
    test('crea una reserva correctamente', () {
      final reserva = _reserva();

      expect(reserva.id, 'r1');
      expect(reserva.rangoFechas.cantidadNoches, 3);
      expect(reserva.estado, isA<Pendiente>());
      expect(reserva.cantidadHuespedes, 1);
      expect(reserva.saldoPendiente, 900000);
    });

    test('convierte una reserva desde JSON (campos opcionales)', () {
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

      expect(reserva.clienteId, '');
      expect(reserva.montoTotal, 0);
      expect(reserva.pagos, isEmpty);
    });

    test('rechaza rangoFechas o estado con formato inválido', () {
      final base = {
        'id': 'r1',
        'casaId': 'c',
        'clienteNombre': 'G',
        'rangoFechas': 'x',
        'estado': {'tipo': 'pendiente'},
      };

      expect(() => Reserva.fromJson(base), throwsA(isA<CampoInvalido>()));
      expect(
        () => Reserva.fromJson({
          ...base,
          'rangoFechas': {
            'fechaEntrada': '2026-09-01T00:00:00.000Z',
            'fechaSalida': '2026-09-04T00:00:00.000Z',
          },
          'estado': 'pendiente',
        }),
        throwsA(isA<CampoInvalido>()),
      );
    });

    test('ida y vuelta JSON con pagos', () {
      final reserva = _reserva(
        pagos: [
          Pago(
            id: 'p1',
            monto: 300000,
            fecha: DateTime.utc(2026, 8, 1),
            metodo: MetodoPago.tarjeta,
          ),
        ],
      );
      final copia = Reserva.fromJson(reserva.toJson());

      expect(copia, reserva);
      expect(copia.hashCode, reserva.hashCode);
      expect(copia.totalPagado, 300000);
      expect(copia.saldoPendiente, 600000);
    });

    test('el saldo nunca es negativo', () {
      final reserva = _reserva(
        pagos: [
          Pago(
            id: 'p1',
            monto: 1000000,
            fecha: DateTime.utc(2026, 8, 1),
            metodo: MetodoPago.efectivo,
          ),
        ],
      );

      expect(reserva.saldoPendiente, 0);
    });

    test('copiarCon permite cambiar el estado', () {
      final reserva = _reserva();
      final actualizada = reserva.copiarCon(estado: const Confirmada('admin'));

      expect(actualizada.id, reserva.id);
      expect(actualizada.estado, const Confirmada('admin'));
      expect(actualizada == reserva, isFalse);
    });

    test('rechaza un método de pago desconocido', () {
      expect(
        () => MetodoPago.desdeNombre('cheque'),
        throwsA(isA<CampoInvalido>()),
      );
    });
  });
}
