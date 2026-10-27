import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/core/json.dart';

/// Periodo de una estadía. Las noches se calculan por fecha calendario,
/// sin tener en cuenta la hora de llegada o de salida.
class RangoFechas {
  RangoFechas({required this.fechaEntrada, required this.fechaSalida}) {
    if (!soloFecha(fechaSalida).isAfter(soloFecha(fechaEntrada))) {
      throw ArgumentError(
        'La fecha de salida debe ser posterior '
        'a la fecha de entrada.',
      );
    }
  }

  factory RangoFechas.fromJson(Map<String, dynamic> json) {
    return RangoFechas(
      fechaEntrada: leerFecha(json, 'fechaEntrada'),
      fechaSalida: leerFecha(json, 'fechaSalida'),
    );
  }

  final DateTime fechaEntrada;
  final DateTime fechaSalida;

  int get cantidadNoches {
    return soloFecha(fechaSalida).difference(soloFecha(fechaEntrada)).inDays;
  }

  /// Fechas de cada una de las noches de la estadía.
  List<DateTime> get noches {
    final inicio = soloFecha(fechaEntrada);

    return List.generate(
      cantidadNoches,
      (i) => DateTime.utc(inicio.year, inicio.month, inicio.day + i),
    );
  }

  /// Dos estadías se cruzan si comparten al menos una noche. El día de salida
  /// de una puede coincidir con el día de entrada de otra.
  bool seSolapaCon(RangoFechas otro) {
    final inicioA = soloFecha(fechaEntrada);
    final finA = soloFecha(fechaSalida);
    final inicioB = soloFecha(otro.fechaEntrada);
    final finB = soloFecha(otro.fechaSalida);

    return inicioA.isBefore(finB) && inicioB.isBefore(finA);
  }

  Map<String, dynamic> toJson() {
    return {
      'fechaEntrada': fechaEntrada.toUtc().toIso8601String(),
      'fechaSalida': fechaSalida.toUtc().toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is RangoFechas &&
            other.fechaEntrada == fechaEntrada &&
            other.fechaSalida == fechaSalida;
  }

  @override
  int get hashCode {
    return Object.hash(fechaEntrada, fechaSalida);
  }
}
