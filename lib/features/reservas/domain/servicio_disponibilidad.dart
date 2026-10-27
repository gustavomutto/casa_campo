import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';

class ServicioDisponibilidad {
  ServicioDisponibilidad(this._casas, this._reservas);

  final CasasRepository _casas;
  final ReservasRepository _reservas;

  /// Indica si la casa no tiene reservas activas que se crucen con el rango.
  Future<bool> estaDisponible(
    String casaId,
    RangoFechas rango, {
    String? excluirReservaId,
  }) async {
    final reservas = await _reservas.obtenerPorCasa(casaId);

    for (final reserva in reservas) {
      if (reserva.id == excluirReservaId || !reserva.estado.esActiva) {
        continue;
      }

      if (reserva.rangoFechas.seSolapaCon(rango)) {
        return false;
      }
    }

    return true;
  }

  /// Casas activas, con capacidad suficiente y libres en el rango.
  Future<List<Casa>> casasDisponibles(
    RangoFechas rango, {
    int huespedes = 1,
  }) async {
    final disponibles = <Casa>[];

    for (final casa in await _casas.obtenerTodas()) {
      if (!casa.activa || casa.capacidadMaxima < huespedes) {
        continue;
      }

      if (await estaDisponible(casa.id, rango)) {
        disponibles.add(casa);
      }
    }

    return disponibles;
  }
}
