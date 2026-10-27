import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/core/reloj.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/clientes/domain/clientes_repository.dart';
import 'package:casa_campo/features/reservas/domain/calculadora_tarifa.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';
import 'package:casa_campo/features/reservas/domain/servicio_disponibilidad.dart';

/// Datos capturados en el formulario de nueva reserva.
class SolicitudReserva {
  const SolicitudReserva({
    required this.casaId,
    required this.clienteId,
    required this.fechaEntrada,
    required this.fechaSalida,
    required this.cantidadHuespedes,
  });

  final String casaId;
  final String clienteId;
  final DateTime fechaEntrada;
  final DateTime fechaSalida;
  final int cantidadHuespedes;
}

/// Reglas de negocio del ciclo de vida de una reserva.
class ServicioReservas {
  ServicioReservas({
    required CasasRepository casas,
    required ClientesRepository clientes,
    required ReservasRepository reservas,
    required ServicioDisponibilidad disponibilidad,
    CalculadoraTarifa tarifa = const CalculadoraTarifa(),
    Reloj reloj = relojDelSistema,
  }) : _casas = casas,
       _clientes = clientes,
       _reservas = reservas,
       _disponibilidad = disponibilidad,
       _tarifa = tarifa,
       _reloj = reloj;

  static const maximoNoches = 30;
  static const porcentajeAnticipo = 30;
  static const longitudMinimaMotivo = 5;

  final CasasRepository _casas;
  final ClientesRepository _clientes;
  final ReservasRepository _reservas;
  final ServicioDisponibilidad _disponibilidad;
  final CalculadoraTarifa _tarifa;
  final Reloj _reloj;

  Future<List<Reserva>> listar({String? tipoEstado}) async {
    final reservas = await _reservas.obtenerTodos();
    final filtradas = reservas
        .where((r) => tipoEstado == null || r.estado.tipo == tipoEstado)
        .toList();

    filtradas.sort(
      (a, b) =>
          a.rangoFechas.fechaEntrada.compareTo(b.rangoFechas.fechaEntrada),
    );

    return filtradas;
  }

  Future<Reserva?> obtener(String id) => _reservas.obtenerPorId(id);

  /// Valor que tendría la estadía (se usa para mostrar una cotización).
  Future<int> cotizar(String casaId, RangoFechas rango) async {
    final casa = await _casas.obtenerPorId(casaId);

    if (casa == null) {
      throw const ErrorDeNegocio('La casa seleccionada no existe.');
    }

    return _tarifa.calcular(precioNoche: casa.precioNoche, rango: rango);
  }

  /// Registra una nueva reserva en estado Pendiente.
  Future<Reserva> crearReserva(SolicitudReserva solicitud) async {
    final casa = await _casas.obtenerPorId(solicitud.casaId);

    if (casa == null || !casa.activa) {
      throw const ErrorDeNegocio(
        'La casa seleccionada no existe o no está activa.',
      );
    }

    final cliente = await _clientes.obtenerPorId(solicitud.clienteId);

    if (cliente == null) {
      throw const ErrorDeNegocio('El cliente seleccionado no existe.');
    }

    final hoy = soloFecha(_reloj());
    final entrada = soloFecha(solicitud.fechaEntrada);
    final salida = soloFecha(solicitud.fechaSalida);

    if (entrada.isBefore(hoy)) {
      throw const ErrorDeValidacion(
        'fechaEntrada',
        'La fecha de entrada no puede ser anterior a hoy.',
      );
    }

    if (!salida.isAfter(entrada)) {
      throw const ErrorDeValidacion(
        'fechaSalida',
        'La fecha de salida debe ser posterior a la fecha de entrada.',
      );
    }

    final rango = RangoFechas(fechaEntrada: entrada, fechaSalida: salida);

    if (rango.cantidadNoches > maximoNoches) {
      throw const ErrorDeValidacion(
        'fechaSalida',
        'La estadía no puede superar $maximoNoches noches.',
      );
    }

    if (solicitud.cantidadHuespedes < 1 ||
        solicitud.cantidadHuespedes > casa.capacidadMaxima) {
      throw ErrorDeValidacion(
        'cantidadHuespedes',
        'La cantidad de huéspedes debe estar entre 1 y '
            '${casa.capacidadMaxima}.',
      );
    }

    final disponible = await _disponibilidad.estaDisponible(casa.id, rango);

    if (!disponible) {
      throw const ErrorDeNegocio(
        'La casa no está disponible en las fechas seleccionadas.',
      );
    }

    final reserva = Reserva(
      id: await _reservas.siguienteId(),
      casaId: casa.id,
      clienteId: cliente.id,
      clienteNombre: cliente.nombreCompleto,
      rangoFechas: rango,
      cantidadHuespedes: solicitud.cantidadHuespedes,
      montoTotal: _tarifa.calcular(precioNoche: casa.precioNoche, rango: rango),
      estado: const Pendiente(),
    );

    await _reservas.guardar(reserva);

    return reserva;
  }

  /// Registra un abono. El monto debe ser positivo y no superar el saldo.
  Future<Reserva> registrarPago(
    String reservaId, {
    required int monto,
    required MetodoPago metodo,
  }) async {
    final reserva = await _obtenerExistente(reservaId);

    if (!reserva.estado.esActiva) {
      throw const ErrorDeNegocio(
        'No se pueden registrar pagos en una reserva cancelada o finalizada.',
      );
    }

    if (monto <= 0) {
      throw const ErrorDeValidacion('monto', 'El monto debe ser mayor que 0.');
    }

    if (monto > reserva.saldoPendiente) {
      throw ErrorDeValidacion(
        'monto',
        'El monto no puede superar el saldo pendiente '
            '(${formatearPesos(reserva.saldoPendiente)}).',
      );
    }

    final pago = Pago(
      id: '${reserva.id}-pago-${reserva.pagos.length + 1}',
      monto: monto,
      fecha: _reloj().toUtc(),
      metodo: metodo,
    );

    final actualizada = reserva.copiarCon(pagos: [...reserva.pagos, pago]);
    await _reservas.guardar(actualizada);

    return actualizada;
  }

  /// Pendiente -> Confirmada. Exige un anticipo mínimo del 30 %.
  Future<Reserva> confirmar(String reservaId, {required String usuario}) async {
    final reserva = await _obtenerExistente(reservaId);

    if (reserva.estado is! Pendiente) {
      throw ErrorDeNegocio(
        'Solo se pueden confirmar reservas pendientes '
        '(estado actual: ${reserva.estado.etiqueta}).',
      );
    }

    final anticipoMinimo = reserva.montoTotal * porcentajeAnticipo ~/ 100;

    if (reserva.totalPagado < anticipoMinimo) {
      throw ErrorDeNegocio(
        'Para confirmar se requiere un anticipo mínimo del '
        '$porcentajeAnticipo % (${formatearPesos(anticipoMinimo)}).',
      );
    }

    return _cambiarEstado(reserva, Confirmada(usuario));
  }

  /// Confirmada -> En curso (llegada del cliente).
  Future<Reserva> iniciarEstadia(String reservaId) async {
    final reserva = await _obtenerExistente(reservaId);

    if (reserva.estado is! Confirmada) {
      throw const ErrorDeNegocio(
        'Solo se puede iniciar la estadía de una reserva confirmada.',
      );
    }

    return _cambiarEstado(reserva, const EnCurso());
  }

  /// En curso -> Finalizada. Exige que el saldo esté pagado.
  Future<Reserva> finalizar(String reservaId) async {
    final reserva = await _obtenerExistente(reservaId);

    if (reserva.estado is! EnCurso) {
      throw const ErrorDeNegocio(
        'Solo se puede finalizar una reserva en curso.',
      );
    }

    if (reserva.saldoPendiente > 0) {
      throw ErrorDeNegocio(
        'No se puede finalizar: hay un saldo pendiente de '
        '${formatearPesos(reserva.saldoPendiente)}.',
      );
    }

    return _cambiarEstado(reserva, const Finalizada());
  }

  /// Pendiente / Confirmada -> Cancelada.
  Future<Reserva> cancelar(String reservaId, {required String motivo}) async {
    final reserva = await _obtenerExistente(reservaId);

    if (reserva.estado is! Pendiente && reserva.estado is! Confirmada) {
      throw ErrorDeNegocio(
        'No se puede cancelar una reserva en estado '
        '${reserva.estado.etiqueta}.',
      );
    }

    if (motivo.trim().length < longitudMinimaMotivo) {
      throw const ErrorDeValidacion(
        'motivo',
        'Indique el motivo de la cancelación (mínimo 5 caracteres).',
      );
    }

    return _cambiarEstado(reserva, Cancelada(motivo.trim()));
  }

  Future<Reserva> _obtenerExistente(String id) async {
    final reserva = await _reservas.obtenerPorId(id);

    if (reserva == null) {
      throw const ErrorDeNegocio('La reserva no existe.');
    }

    return reserva;
  }

  Future<Reserva> _cambiarEstado(Reserva reserva, EstadoReserva estado) async {
    final actualizada = reserva.copiarCon(estado: estado);
    await _reservas.guardar(actualizada);

    return actualizada;
  }
}
