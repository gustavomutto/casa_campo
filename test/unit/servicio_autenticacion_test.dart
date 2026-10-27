// Módulo de autenticación: pruebas unitarias (caja negra y caja blanca).
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/features/autenticacion/data/usuarios_locales.dart';
import 'package:casa_campo/features/autenticacion/domain/cifrado.dart';
import 'package:casa_campo/features/autenticacion/domain/servicio_autenticacion.dart';
import 'package:casa_campo/features/autenticacion/domain/usuario.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late DateTime ahora;
  late ServicioAutenticacion servicio;

  setUp(() {
    ahora = DateTime(2026, 10, 27, 10);
    servicio = ServicioAutenticacion(UsuariosLocales(), reloj: () => ahora);
  });

  Matcher errorValidacion(String campo) =>
      throwsA(isA<ErrorDeValidacion>().having((e) => e.campo, 'campo', campo));

  Matcher errorNegocio(String texto) => throwsA(
    isA<ErrorDeNegocio>().having((e) => e.mensaje, 'mensaje', contains(texto)),
  );

  test('CP-AUT-01 credenciales válidas de administrador', () async {
    final usuario = await servicio.iniciarSesion('admin', 'Admin2026*');

    expect(usuario.rol, Rol.administrador);
    expect(usuario.esAdministrador, isTrue);
  });

  test('CP-AUT-02 credenciales válidas de recepcionista (sin distinguir '
      'mayúsculas en el usuario)', () async {
    final usuario = await servicio.iniciarSesion('RECEPCION', 'Recep2026*');

    expect(usuario.rol, Rol.recepcionista);
    expect(usuario.esAdministrador, isFalse);
  });

  test('CP-AUT-03 usuario vacío', () {
    expect(
      servicio.iniciarSesion('', 'Admin2026*'),
      errorValidacion('usuario'),
    );
  });

  test('CP-AUT-04 usuario de 3 caracteres', () {
    expect(
      servicio.iniciarSesion('adm', 'Admin2026*'),
      errorValidacion('usuario'),
    );
  });

  test('CP-AUT-05 usuario de 21 caracteres', () {
    expect(
      servicio.iniciarSesion('a' * 21, 'Admin2026*'),
      errorValidacion('usuario'),
    );
  });

  test('CP-AUT-06 usuario con caracteres especiales', () {
    expect(
      servicio.iniciarSesion("admin'--", 'Admin2026*'),
      errorValidacion('usuario'),
    );
  });

  test('CP-AUT-07 contraseña vacía', () {
    expect(servicio.iniciarSesion('admin', ''), errorValidacion('clave'));
  });

  test('CP-AUT-08 contraseña de 7 caracteres', () {
    expect(
      servicio.iniciarSesion('admin', 'Admin20'),
      errorValidacion('clave'),
    );
  });

  test('CP-AUT-09 contraseña de 21 caracteres', () {
    expect(servicio.iniciarSesion('admin', 'x' * 21), errorValidacion('clave'));
  });

  test('CP-AUT-10 contraseña incorrecta', () {
    expect(
      servicio.iniciarSesion('admin', 'Incorrecta1'),
      errorNegocio('Usuario o contraseña incorrectos'),
    );
  });

  test('CP-AUT-11 usuario inexistente (mismo mensaje genérico)', () {
    expect(
      servicio.iniciarSesion('noexiste', 'Admin2026*'),
      errorNegocio('Usuario o contraseña incorrectos'),
    );
  });

  test('CP-AUT-12 bloqueo después de 3 intentos fallidos', () async {
    for (var i = 1; i <= 2; i++) {
      await expectLater(
        servicio.iniciarSesion('admin', 'Incorrecta1'),
        throwsA(isA<ErrorDeNegocio>()),
      );
      expect(servicio.intentosFallidos('admin'), i);
    }

    await expectLater(
      servicio.iniciarSesion('admin', 'Incorrecta1'),
      throwsA(isA<ErrorDeNegocio>()),
    );

    // Aun con la contraseña correcta, la cuenta queda bloqueada.
    await expectLater(
      servicio.iniciarSesion('admin', 'Admin2026*'),
      errorNegocio('bloqueada'),
    );
  });

  test('CP-AUT-13 el bloqueo expira a los 5 minutos', () async {
    for (var i = 0; i < 3; i++) {
      await expectLater(
        servicio.iniciarSesion('admin', 'Incorrecta1'),
        throwsA(isA<ErrorDeNegocio>()),
      );
    }

    ahora = ahora.add(const Duration(minutes: 4, seconds: 59));
    await expectLater(
      servicio.iniciarSesion('admin', 'Admin2026*'),
      errorNegocio('bloqueada'),
    );

    ahora = ahora.add(const Duration(seconds: 1));
    final usuario = await servicio.iniciarSesion('admin', 'Admin2026*');
    expect(usuario.nombreUsuario, 'admin');
  });

  test('CP-AUT-14 un ingreso exitoso reinicia el contador de fallos', () async {
    await expectLater(
      servicio.iniciarSesion('admin', 'Incorrecta1'),
      throwsA(isA<ErrorDeNegocio>()),
    );
    await servicio.iniciarSesion('admin', 'Admin2026*');

    expect(servicio.intentosFallidos('admin'), 0);
  });

  test('CP-AUT-15 las contraseñas se guardan como hash SHA-256', () {
    final hash = calcularHashClave('admin', 'Admin2026*');

    expect(hash, hasLength(64));
    expect(hash, isNot(contains('Admin2026*')));
    expect(hash, isNot(calcularHashClave('recepcion', 'Admin2026*')));
  });
}
