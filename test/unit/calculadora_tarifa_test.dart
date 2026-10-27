// Camino básico de CalculadoraTarifa.calcular y valores límite de las
// temporadas altas.
import 'package:casa_campo/features/reservas/domain/calculadora_tarifa.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:flutter_test/flutter_test.dart';

RangoFechas _rango(DateTime entrada, DateTime salida) {
  return RangoFechas(fechaEntrada: entrada, fechaSalida: salida);
}

void main() {
  const calculadora = CalculadoraTarifa();

  group('CP-TAR camino básico de calcular()', () {
    test('Camino 1: precio <= 0 lanza ArgumentError', () {
      expect(
        () => calculadora.calcular(
          precioNoche: 0,
          rango: _rango(DateTime.utc(2026, 3, 1), DateTime.utc(2026, 3, 2)),
        ),
        throwsArgumentError,
      );
    });

    test('Camino 2: noches en temporada normal, sin descuento', () {
      final valor = calculadora.calcular(
        precioNoche: 220000,
        rango: _rango(DateTime.utc(2027, 2, 1), DateTime.utc(2027, 2, 4)),
      );

      expect(valor, 660000);
    });

    test('Camino 3: noches en temporada alta (+20 %)', () {
      final valor = calculadora.calcular(
        precioNoche: 350000,
        rango: _rango(DateTime.utc(2026, 12, 20), DateTime.utc(2026, 12, 22)),
      );

      expect(valor, 840000);
    });

    test('Camino 4: estadía de 7 noches con descuento del 10 %', () {
      final valor = calculadora.calcular(
        precioNoche: 100000,
        rango: _rango(DateTime.utc(2027, 3, 1), DateTime.utc(2027, 3, 8)),
      );

      expect(valor, 630000);
    });

    test('Camino 5: temporada alta mixta + descuento', () {
      // 13 y 14 de diciembre normales, 15 a 19 en temporada alta.
      final valor = calculadora.calcular(
        precioNoche: 100000,
        rango: _rango(DateTime.utc(2026, 12, 13), DateTime.utc(2026, 12, 20)),
      );

      expect(valor, (2 * 100000 + 5 * 120000) * 90 ~/ 100);
    });
  });

  group('Valores límite', () {
    test('6 noches no tienen descuento, 7 sí', () {
      final seis = calculadora.calcular(
        precioNoche: 100000,
        rango: _rango(DateTime.utc(2027, 3, 1), DateTime.utc(2027, 3, 7)),
      );
      final siete = calculadora.calcular(
        precioNoche: 100000,
        rango: _rango(DateTime.utc(2027, 3, 1), DateTime.utc(2027, 3, 8)),
      );

      expect(seis, 600000);
      expect(siete, 630000);
    });

    test('límites de temporada alta', () {
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2026, 12, 14)),
        isFalse,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2026, 12, 15)),
        isTrue,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 1, 15)),
        isTrue,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 1, 16)),
        isFalse,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 6, 14)),
        isFalse,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 6, 15)),
        isTrue,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 7, 15)),
        isTrue,
      );
      expect(
        CalculadoraTarifa.esTemporadaAlta(DateTime.utc(2027, 7, 16)),
        isFalse,
      );
    });

    test('precio mínimo positivo (1) es válido', () {
      expect(
        calculadora.calcular(
          precioNoche: 1,
          rango: _rango(DateTime.utc(2027, 3, 1), DateTime.utc(2027, 3, 2)),
        ),
        1,
      );
    });
  });
}
