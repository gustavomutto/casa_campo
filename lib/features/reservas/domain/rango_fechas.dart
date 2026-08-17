import 'package:casa_campo/core/json.dart';

class RangoFechas {
  RangoFechas({required this.fechaEntrada, required this.fechaSalida}) {
    if (!fechaSalida.isAfter(fechaEntrada)) {
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
    return fechaSalida.difference(fechaEntrada).inDays;
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
