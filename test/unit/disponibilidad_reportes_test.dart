import 'package:casa_campo/features/reportes/domain/servicio_reportes.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/servicio_disponibilidad.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

RangoFechas _rango(DateTime a, DateTime b) =>
    RangoFechas(fechaEntrada: a, fechaSalida: b);

void main() {
  late ServicioDisponibilidad disponibilidad;
  late ServicioReportes reportes;

  setUp(() {
    final repos = crearRepositorios();
    disponibilidad = ServicioDisponibilidad(repos.casas, repos.reservas);
    reportes = ServicioReportes(repos.casas, repos.reservas);
  });

  group('ServicioDisponibilidad', () {
    test('CP-DIS-01 excluye casas ocupadas e inactivas', () async {
      final casas = await disponibilidad.casasDisponibles(
        _rango(DateTime.utc(2026, 11, 14), DateTime.utc(2026, 11, 15)),
      );

      expect(casas.map((c) => c.id), ['casa-002', 'casa-003', 'casa-004']);
    });

    test('CP-DIS-02 filtra por capacidad', () async {
      final casas = await disponibilidad.casasDisponibles(
        _rango(DateTime.utc(2027, 2, 1), DateTime.utc(2027, 2, 3)),
        huespedes: 13,
      );

      expect(casas.map((c) => c.id), ['casa-004']);
    });

    test('CP-DIS-03 la reserva cancelada no ocupa la casa', () async {
      expect(
        await disponibilidad.estaDisponible(
          'casa-003',
          _rango(DateTime.utc(2026, 11, 6), DateTime.utc(2026, 11, 8)),
        ),
        isTrue,
      );
    });

    test('CP-DIS-04 se puede excluir la propia reserva', () async {
      final rango = _rango(
        DateTime.utc(2026, 11, 13),
        DateTime.utc(2026, 11, 16),
      );

      expect(await disponibilidad.estaDisponible('casa-001', rango), isFalse);
      expect(
        await disponibilidad.estaDisponible(
          'casa-001',
          rango,
          excluirReservaId: 'res-004',
        ),
        isTrue,
      );
    });

    test('CP-DIS-05 sin resultados cuando nadie tiene capacidad', () async {
      final casas = await disponibilidad.casasDisponibles(
        _rango(DateTime.utc(2027, 2, 1), DateTime.utc(2027, 2, 3)),
        huespedes: 30,
      );

      expect(casas, isEmpty);
    });
  });

  group('ServicioReportes', () {
    test('CP-REP-01 totales por estado e ingresos', () async {
      final resumen = await reportes.generar(anio: 2026, mes: 11);

      expect(resumen.totalReservas, 6);
      expect(resumen.reservasPorEstado['Pendiente'], 2);
      expect(resumen.reservasPorEstado['Cancelada'], 1);
      expect(
        resumen.ingresosRecaudados,
        315000 + 735000 + 1200000 + 500000 + 200000,
      );
      expect(
        resumen.ingresosProyectados,
        1050000 + 2400000 + 1050000 + 4914000 + 1440000,
      );
      expect(resumen.saldoPorCobrar, 1200000 + 550000 + 4914000 + 1240000);
    });

    test('CP-REP-02 ocupación mensual por casa (noviembre)', () async {
      final resumen = await reportes.generar(anio: 2026, mes: 11);
      final ocupacion = {for (final o in resumen.ocupacion) o.casa.id: o};

      expect(ocupacion['casa-001']!.nochesOcupadas, 3);
      expect(ocupacion['casa-001']!.diasDelMes, 30);
      expect(ocupacion['casa-001']!.porcentaje, closeTo(10, 0.001));
      expect(ocupacion['casa-002']!.nochesOcupadas, 3);
      expect(ocupacion['casa-003']!.nochesOcupadas, 0);
    });

    test('CP-REP-03 reservas que cruzan de mes (octubre)', () async {
      final resumen = await reportes.generar(anio: 2026, mes: 10);
      final ocupacion = {for (final o in resumen.ocupacion) o.casa.id: o};

      expect(ocupacion['casa-002']!.nochesOcupadas, 5);
      expect(ocupacion['casa-001']!.nochesOcupadas, 3);
      expect(ocupacion['casa-001']!.diasDelMes, 31);
    });
  });
}
