import 'package:casa_campo/features/reservas/domain/reserva.dart';

abstract interface class ReservasRepository {
  Future<List<Reserva>> obtenerTodos();

  Future<Reserva?> obtenerPorId(String id);

  Future<List<Reserva>> obtenerPendientes();

  Future<List<Reserva>> obtenerPorCasa(String casaId);

  Future<void> guardar(Reserva reserva);

  Future<String> siguienteId();
}
