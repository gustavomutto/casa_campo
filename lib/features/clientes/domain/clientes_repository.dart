import 'package:casa_campo/features/clientes/domain/cliente.dart';

abstract interface class ClientesRepository {
  Future<List<Cliente>> obtenerTodos();

  Future<Cliente?> obtenerPorId(String id);

  Future<void> guardar(Cliente cliente);

  Future<String> siguienteId();
}
