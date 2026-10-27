import 'package:casa_campo/features/autenticacion/domain/usuario.dart';

abstract interface class UsuariosRepository {
  Future<Usuario?> obtenerPorNombreUsuario(String nombreUsuario);
}
