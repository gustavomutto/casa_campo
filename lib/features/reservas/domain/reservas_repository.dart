import 'package:casa_campo/features/reservas/domain/reserva.dart';

abstract interface class ReservasRepository {
  Future<List<Reserva>> obtenerTodos();

  Future<Reserva?> obtenerPorId(String id);

  Future<List<Reserva>> obtenerPendientes();
}
