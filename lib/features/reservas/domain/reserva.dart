import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';

class Reserva {
  Reserva({
    required this.id,
    required this.casaId,
    required this.clienteNombre,
    required this.rangoFechas,
    required this.estado,
  });

  factory Reserva.fromJson(Map<String, dynamic> json) {
    final rango = json['rangoFechas'];

    if (rango is! Map<String, dynamic>) {
      throw CampoInvalido('rangoFechas', 'se esperaba un objeto', rango);
    }

    final estado = json['estado'];

    if (estado is! Map<String, dynamic>) {
      throw CampoInvalido('estado', 'se esperaba un objeto', estado);
    }

    return Reserva(
      id: leerTexto(json, 'id'),
      casaId: leerTexto(json, 'casaId'),
      clienteNombre: leerTexto(json, 'clienteNombre'),
      rangoFechas: RangoFechas.fromJson(rango),
      estado: EstadoReserva.fromJson(estado),
    );
  }

  final String id;
  final String casaId;
  final String clienteNombre;
  final RangoFechas rangoFechas;
  final EstadoReserva estado;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'casaId': casaId,
      'clienteNombre': clienteNombre,
      'rangoFechas': rangoFechas.toJson(),
      'estado': estado.toJson(),
    };
  }

  Reserva copiarCon({EstadoReserva? estado}) {
    return Reserva(
      id: id,
      casaId: casaId,
      clienteNombre: clienteNombre,
      rangoFechas: rangoFechas,
      estado: estado ?? this.estado,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Reserva &&
            other.id == id &&
            other.casaId == casaId &&
            other.clienteNombre == clienteNombre &&
            other.rangoFechas == rangoFechas &&
            other.estado == estado;
  }

  @override
  int get hashCode {
    return Object.hash(id, casaId, clienteNombre, rangoFechas, estado);
  }
}
