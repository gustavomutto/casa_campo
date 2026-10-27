import 'package:casa_campo/core/repositorio_json_local.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/clientes/domain/clientes_repository.dart';

class ClientesLocales extends RepositorioJsonLocal<Cliente>
    implements ClientesRepository {
  ClientesLocales({
    super.lector,
    super.almacenamiento,
    String ruta = 'assets/data/clientes.json',
  }) : super(
         clave: 'casa_campo.clientes.v1',
         rutaSemilla: ruta,
         prefijoId: 'cli',
       );

  @override
  Cliente desdeJson(Map<String, dynamic> json) => Cliente.fromJson(json);

  @override
  Map<String, dynamic> aJson(Cliente entidad) => entidad.toJson();

  @override
  String idDe(Cliente entidad) => entidad.id;

  @override
  Future<List<Cliente>> obtenerTodos() => todos();

  @override
  Future<Cliente?> obtenerPorId(String id) => porId(id);
}
