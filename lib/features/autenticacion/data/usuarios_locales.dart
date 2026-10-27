import 'package:casa_campo/features/autenticacion/domain/cifrado.dart';
import 'package:casa_campo/features/autenticacion/domain/usuario.dart';
import 'package:casa_campo/features/autenticacion/domain/usuarios_repository.dart';

/// Usuarios del sistema. Solo se almacenan los hashes de las contraseñas.
class UsuariosLocales implements UsuariosRepository {
  UsuariosLocales({List<Usuario>? usuarios})
    : _usuarios = usuarios ?? _usuariosIniciales;

  final List<Usuario> _usuarios;

  static final List<Usuario> _usuariosIniciales = [
    Usuario(
      id: 'usr-001',
      nombreUsuario: 'admin',
      nombreCompleto: 'Administrador Casa Campo',
      rol: Rol.administrador,
      hashClave: calcularHashClave('admin', 'Admin2026*'),
    ),
    Usuario(
      id: 'usr-002',
      nombreUsuario: 'recepcion',
      nombreCompleto: 'Recepción Casa Campo',
      rol: Rol.recepcionista,
      hashClave: calcularHashClave('recepcion', 'Recep2026*'),
    ),
  ];

  @override
  Future<Usuario?> obtenerPorNombreUsuario(String nombreUsuario) async {
    final buscado = nombreUsuario.trim().toLowerCase();

    for (final usuario in _usuarios) {
      if (usuario.nombreUsuario == buscado) {
        return usuario;
      }
    }

    return null;
  }
}
