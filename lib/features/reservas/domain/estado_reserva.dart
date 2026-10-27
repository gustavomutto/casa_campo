import 'package:casa_campo/core/json.dart';

/// Estados por los que pasa una reserva:
///
/// Pendiente -> Confirmada -> En curso -> Finalizada
/// Pendiente / Confirmada -> Cancelada
sealed class EstadoReserva {
  const EstadoReserva();

  factory EstadoReserva.fromJson(Map<String, dynamic> json) {
    final tipo = leerTexto(json, 'tipo');

    switch (tipo) {
      case 'pendiente':
        return const Pendiente();

      case 'confirmada':
        return Confirmada(leerTexto(json, 'confirmadaPor'));

      case 'en_curso':
        return const EnCurso();

      case 'finalizada':
        return const Finalizada();

      case 'cancelada':
        return Cancelada(leerTexto(json, 'motivo'));

      default:
        throw CampoInvalido('tipo', 'estado de reserva desconocido', tipo);
    }
  }

  Map<String, dynamic> toJson();

  String get etiqueta;

  /// Identificador corto del estado, usado en filtros y reportes.
  String get tipo;

  /// Una reserva activa ocupa la casa en sus fechas.
  bool get esActiva;

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is EstadoReserva &&
            other.runtimeType == runtimeType &&
            _mapasIguales(other.toJson(), toJson());
  }

  @override
  int get hashCode => Object.hashAll(toJson().values);
}

bool _mapasIguales(Map<String, dynamic> a, Map<String, dynamic> b) {
  if (a.length != b.length) {
    return false;
  }

  for (final entrada in a.entries) {
    if (b[entrada.key] != entrada.value) {
      return false;
    }
  }

  return true;
}

final class Pendiente extends EstadoReserva {
  const Pendiente();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'pendiente'};
  }

  @override
  String get etiqueta => 'Pendiente';

  @override
  String get tipo => 'pendiente';

  @override
  bool get esActiva => true;
}

final class Confirmada extends EstadoReserva {
  const Confirmada(this.confirmadaPor);

  final String confirmadaPor;

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'confirmada', 'confirmadaPor': confirmadaPor};
  }

  @override
  String get etiqueta => 'Confirmada';

  @override
  String get tipo => 'confirmada';

  @override
  bool get esActiva => true;
}

final class EnCurso extends EstadoReserva {
  const EnCurso();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'en_curso'};
  }

  @override
  String get etiqueta => 'En curso';

  @override
  String get tipo => 'en_curso';

  @override
  bool get esActiva => true;
}

final class Finalizada extends EstadoReserva {
  const Finalizada();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'finalizada'};
  }

  @override
  String get etiqueta => 'Finalizada';

  @override
  String get tipo => 'finalizada';

  @override
  bool get esActiva => false;
}

final class Cancelada extends EstadoReserva {
  const Cancelada(this.motivo);

  final String motivo;

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'cancelada', 'motivo': motivo};
  }

  @override
  String get etiqueta => 'Cancelada';

  @override
  String get tipo => 'cancelada';

  @override
  bool get esActiva => false;
}
