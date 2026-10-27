import 'package:casa_campo/core/repositorio_json_local.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';

export 'package:casa_campo/core/repositorio_json_local.dart'
    show LectorDeAssets;

class ReservasLocales extends RepositorioJsonLocal<Reserva>
    implements ReservasRepository {
  ReservasLocales({
    super.lector,
    super.almacenamiento,
    String ruta = 'assets/data/reservas.json',
  }) : super(
         clave: 'casa_campo.reservas.v1',
         rutaSemilla: ruta,
         prefijoId: 'res',
       );

  @override
  Reserva desdeJson(Map<String, dynamic> json) => Reserva.fromJson(json);

  @override
  Map<String, dynamic> aJson(Reserva entidad) => entidad.toJson();

  @override
  String idDe(Reserva entidad) => entidad.id;

  @override
  Future<List<Reserva>> obtenerTodos() => todos();

  @override
  Future<Reserva?> obtenerPorId(String id) => porId(id);

  @override
  Future<List<Reserva>> obtenerPendientes() async {
    final reservas = await todos();

    return reservas
        .where((reserva) => reserva.estado is Pendiente)
        .toList(growable: false);
  }

  @override
  Future<List<Reserva>> obtenerPorCasa(String casaId) async {
    final reservas = await todos();

    return reservas
        .where((reserva) => reserva.casaId == casaId)
        .toList(growable: false);
  }
}
