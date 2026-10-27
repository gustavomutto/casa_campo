import 'package:casa_campo/features/casas/domain/casa.dart';

abstract interface class CasasRepository {
  Future<List<Casa>> obtenerTodas();

  Future<Casa?> obtenerPorId(String id);

  Future<void> guardar(Casa casa);

  Future<String> siguienteId();
}
