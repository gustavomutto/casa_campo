import 'package:casa_campo/core/json.dart';

enum MetodoPago {
  efectivo('Efectivo'),
  transferencia('Transferencia'),
  tarjeta('Tarjeta');

  const MetodoPago(this.etiqueta);

  final String etiqueta;

  static MetodoPago desdeNombre(String nombre) {
    for (final metodo in values) {
      if (metodo.name == nombre) {
        return metodo;
      }
    }

    throw CampoInvalido('metodo', 'método de pago desconocido', nombre);
  }
}

/// Abono realizado por el cliente a una reserva.
class Pago {
  const Pago({
    required this.id,
    required this.monto,
    required this.fecha,
    required this.metodo,
  });

  factory Pago.fromJson(Map<String, dynamic> json) {
    return Pago(
      id: leerTexto(json, 'id'),
      monto: leerEntero(json, 'monto'),
      fecha: leerFecha(json, 'fecha'),
      metodo: MetodoPago.desdeNombre(leerTexto(json, 'metodo')),
    );
  }

  final String id;
  final int monto;
  final DateTime fecha;
  final MetodoPago metodo;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'monto': monto,
      'fecha': fecha.toUtc().toIso8601String(),
      'metodo': metodo.name,
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Pago &&
            other.id == id &&
            other.monto == monto &&
            other.fecha == fecha &&
            other.metodo == metodo;
  }

  @override
  int get hashCode => Object.hash(id, monto, fecha, metodo);
}
