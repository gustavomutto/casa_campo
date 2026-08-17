import 'package:casa_campo/core/json.dart';

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
}

final class Pendiente extends EstadoReserva {
  const Pendiente();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'pendiente'};
  }

  @override
  String get etiqueta => 'Pendiente';
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
}

final class EnCurso extends EstadoReserva {
  const EnCurso();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'en_curso'};
  }

  @override
  String get etiqueta => 'En curso';
}

final class Finalizada extends EstadoReserva {
  const Finalizada();

  @override
  Map<String, dynamic> toJson() {
    return {'tipo': 'finalizada'};
  }

  @override
  String get etiqueta => 'Finalizada';
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
}
