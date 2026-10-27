import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/reloj.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/autenticacion/domain/cifrado.dart';
import 'package:casa_campo/features/autenticacion/domain/usuario.dart';
import 'package:casa_campo/features/autenticacion/domain/usuarios_repository.dart';

/// Inicio de sesión con bloqueo temporal tras varios intentos fallidos.
class ServicioAutenticacion {
  ServicioAutenticacion(
    this._usuarios, {
    Reloj reloj = relojDelSistema,
    this.maximoIntentos = 3,
    this.duracionBloqueo = const Duration(minutes: 5),
  }) : _reloj = reloj;

  final UsuariosRepository _usuarios;
  final Reloj _reloj;
  final int maximoIntentos;
  final Duration duracionBloqueo;

  final Map<String, int> _intentosFallidos = {};
  final Map<String, DateTime> _bloqueadoHasta = {};

  static const mensajeCredenciales = 'Usuario o contraseña incorrectos.';

  Future<Usuario> iniciarSesion(String nombreUsuario, String clave) async {
    final errorUsuario = validarNombreUsuario(nombreUsuario);

    if (errorUsuario != null) {
      throw ErrorDeValidacion('usuario', errorUsuario);
    }

    final errorClave = validarClave(clave);

    if (errorClave != null) {
      throw ErrorDeValidacion('clave', errorClave);
    }

    final normalizado = nombreUsuario.trim().toLowerCase();
    final bloqueo = _bloqueadoHasta[normalizado];
    final ahora = _reloj();

    if (bloqueo != null && ahora.isBefore(bloqueo)) {
      final minutos = bloqueo.difference(ahora).inMinutes + 1;
      throw ErrorDeNegocio(
        'Cuenta bloqueada por intentos fallidos. '
        'Intente de nuevo en $minutos minuto(s).',
      );
    }

    final usuario = await _usuarios.obtenerPorNombreUsuario(normalizado);

    if (usuario == null ||
        usuario.hashClave != calcularHashClave(normalizado, clave)) {
      _registrarFallo(normalizado, ahora);
      throw const ErrorDeNegocio(mensajeCredenciales);
    }

    _intentosFallidos.remove(normalizado);
    _bloqueadoHasta.remove(normalizado);

    return usuario;
  }

  int intentosFallidos(String nombreUsuario) {
    return _intentosFallidos[nombreUsuario.trim().toLowerCase()] ?? 0;
  }

  void _registrarFallo(String nombreUsuario, DateTime ahora) {
    final intentos = (_intentosFallidos[nombreUsuario] ?? 0) + 1;

    if (intentos >= maximoIntentos) {
      _bloqueadoHasta[nombreUsuario] = ahora.add(duracionBloqueo);
      _intentosFallidos.remove(nombreUsuario);
    } else {
      _intentosFallidos[nombreUsuario] = intentos;
    }
  }
}
