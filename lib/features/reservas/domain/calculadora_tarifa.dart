import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';

/// Calcula el valor de una estadía.
///
/// * Cada noche en temporada alta (15 dic - 15 ene y 15 jun - 15 jul) tiene
///   un recargo del 20 %.
/// * Las estadías de 7 noches o más tienen un descuento del 10 % sobre el
///   total.
class CalculadoraTarifa {
  const CalculadoraTarifa({
    this.recargoTemporadaAlta = 20,
    this.descuentoEstanciaLarga = 10,
    this.nochesEstanciaLarga = 7,
  });

  /// Porcentajes enteros para evitar errores de redondeo.
  final int recargoTemporadaAlta;
  final int descuentoEstanciaLarga;
  final int nochesEstanciaLarga;

  static bool esTemporadaAlta(DateTime noche) {
    final mes = noche.month;
    final dia = noche.day;

    if (mes == 12 && dia >= 15) {
      return true;
    }

    if (mes == 1 && dia <= 15) {
      return true;
    }

    if (mes == 6 && dia >= 15) {
      return true;
    }

    return mes == 7 && dia <= 15;
  }

  int calcular({required int precioNoche, required RangoFechas rango}) {
    if (precioNoche <= 0) {
      throw ArgumentError('El precio por noche debe ser mayor que cero.');
    }

    var total = 0;

    for (final noche in rango.noches) {
      if (esTemporadaAlta(noche)) {
        total += precioNoche * (100 + recargoTemporadaAlta) ~/ 100;
      } else {
        total += precioNoche;
      }
    }

    if (rango.cantidadNoches >= nochesEstanciaLarga) {
      total -= total * descuentoEstanciaLarga ~/ 100;
    }

    return total;
  }
}
