import 'package:casa_campo/core/repositorio_json_local.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';

class CasasLocales extends RepositorioJsonLocal<Casa>
    implements CasasRepository {
  CasasLocales({
    super.lector,
    super.almacenamiento,
    String ruta = 'assets/data/casas.json',
  }) : super(
         clave: 'casa_campo.casas.v1',
         rutaSemilla: ruta,
         prefijoId: 'casa',
       );

  @override
  Casa desdeJson(Map<String, dynamic> json) => Casa.fromJson(json);

  @override
  Map<String, dynamic> aJson(Casa entidad) => entidad.toJson();

  @override
  String idDe(Casa entidad) => entidad.id;

  @override
  Future<List<Casa>> obtenerTodas() => todos();

  @override
  Future<Casa?> obtenerPorId(String id) => porId(id);
}
