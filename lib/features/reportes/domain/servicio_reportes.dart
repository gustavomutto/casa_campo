import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';

class OcupacionCasa {
  const OcupacionCasa({
    required this.casa,
    required this.nochesOcupadas,
    required this.diasDelMes,
  });

  final Casa casa;
  final int nochesOcupadas;
  final int diasDelMes;

  double get porcentaje =>
      diasDelMes == 0 ? 0 : nochesOcupadas * 100 / diasDelMes;
}

class ResumenReportes {
  const ResumenReportes({
    required this.totalReservas,
    required this.reservasPorEstado,
    required this.ingresosRecaudados,
    required this.ingresosProyectados,
    required this.saldoPorCobrar,
    required this.ocupacion,
  });

  final int totalReservas;
  final Map<String, int> reservasPorEstado;
  final int ingresosRecaudados;
  final int ingresosProyectados;
  final int saldoPorCobrar;
  final List<OcupacionCasa> ocupacion;
}

class ServicioReportes {
  ServicioReportes(this._casas, this._reservas);

  final CasasRepository _casas;
  final ReservasRepository _reservas;

  /// Resumen general y ocupación de cada casa en el mes indicado.
  Future<ResumenReportes> generar({required int anio, required int mes}) async {
    final reservas = await _reservas.obtenerTodos();
    final casas = await _casas.obtenerTodas();
    final porEstado = <String, int>{};
    var recaudado = 0;
    var proyectado = 0;
    var saldo = 0;

    for (final reserva in reservas) {
      final etiqueta = reserva.estado.etiqueta;
      porEstado[etiqueta] = (porEstado[etiqueta] ?? 0) + 1;
      recaudado += reserva.totalPagado;

      if (reserva.estado.esActiva || reserva.estado.tipo == 'finalizada') {
        proyectado += reserva.montoTotal;
        saldo += reserva.saldoPendiente;
      }
    }

    final diasDelMes = DateTime.utc(anio, mes + 1, 0).day;
    final ocupacion = <OcupacionCasa>[];

    for (final casa in casas) {
      var noches = 0;

      for (final reserva in reservas) {
        if (reserva.casaId != casa.id || reserva.estado.tipo == 'cancelada') {
          continue;
        }

        noches += reserva.rangoFechas.noches
            .where((n) => n.year == anio && n.month == mes)
            .length;
      }

      ocupacion.add(
        OcupacionCasa(
          casa: casa,
          nochesOcupadas: noches,
          diasDelMes: diasDelMes,
        ),
      );
    }

    return ResumenReportes(
      totalReservas: reservas.length,
      reservasPorEstado: porEstado,
      ingresosRecaudados: recaudado,
      ingresosProyectados: proyectado,
      saldoPorCobrar: saldo,
      ocupacion: ocupacion,
    );
  }
}
