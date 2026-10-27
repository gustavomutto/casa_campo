import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';

class Reserva {
  Reserva({
    required this.id,
    required this.casaId,
    required this.clienteNombre,
    required this.rangoFechas,
    required this.estado,
    this.clienteId = '',
    this.cantidadHuespedes = 1,
    this.montoTotal = 0,
    List<Pago> pagos = const [],
  }) : pagos = List.unmodifiable(pagos);

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
      clienteId: leerTextoOpcional(json, 'clienteId') ?? '',
      clienteNombre: leerTexto(json, 'clienteNombre'),
      rangoFechas: RangoFechas.fromJson(rango),
      cantidadHuespedes: leerEntero(json, 'cantidadHuespedes', porDefecto: 1),
      montoTotal: leerEntero(json, 'montoTotal', porDefecto: 0),
      estado: EstadoReserva.fromJson(estado),
      pagos: leerListaDeObjetos(
        json,
        'pagos',
      ).map(Pago.fromJson).toList(growable: false),
    );
  }

  final String id;
  final String casaId;
  final String clienteId;
  final String clienteNombre;
  final RangoFechas rangoFechas;
  final int cantidadHuespedes;
  final int montoTotal;
  final EstadoReserva estado;
  final List<Pago> pagos;

  int get totalPagado {
    return pagos.fold(0, (suma, pago) => suma + pago.monto);
  }

  int get saldoPendiente {
    final saldo = montoTotal - totalPagado;

    return saldo < 0 ? 0 : saldo;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'casaId': casaId,
      'clienteId': clienteId,
      'clienteNombre': clienteNombre,
      'rangoFechas': rangoFechas.toJson(),
      'cantidadHuespedes': cantidadHuespedes,
      'montoTotal': montoTotal,
      'estado': estado.toJson(),
      'pagos': pagos.map((pago) => pago.toJson()).toList(),
    };
  }

  Reserva copiarCon({EstadoReserva? estado, List<Pago>? pagos}) {
    return Reserva(
      id: id,
      casaId: casaId,
      clienteId: clienteId,
      clienteNombre: clienteNombre,
      rangoFechas: rangoFechas,
      cantidadHuespedes: cantidadHuespedes,
      montoTotal: montoTotal,
      estado: estado ?? this.estado,
      pagos: pagos ?? this.pagos,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Reserva &&
            other.id == id &&
            other.casaId == casaId &&
            other.clienteId == clienteId &&
            other.clienteNombre == clienteNombre &&
            other.rangoFechas == rangoFechas &&
            other.cantidadHuespedes == cantidadHuespedes &&
            other.montoTotal == montoTotal &&
            other.estado == estado &&
            _listasIguales(other.pagos, pagos);
  }

  @override
  int get hashCode {
    return Object.hash(
      id,
      casaId,
      clienteId,
      clienteNombre,
      rangoFechas,
      cantidadHuespedes,
      montoTotal,
      estado,
      Object.hashAll(pagos),
    );
  }
}

bool _listasIguales(List<Pago> a, List<Pago> b) {
  if (a.length != b.length) {
    return false;
  }

  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }

  return true;
}
