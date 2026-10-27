// Pruebas de caja negra (clases de equivalencia y valores límite) de las
// reglas de validación de los formularios.
import 'package:casa_campo/core/validadores.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Usuario (4 a 20 caracteres alfanuméricos)', () {
    test('CE válida: usuario alfanumérico', () {
      expect(validarNombreUsuario('admin'), isNull);
    });
    test('CE inválida: vacío', () {
      expect(validarNombreUsuario(''), contains('obligatorio'));
      expect(validarNombreUsuario('   '), contains('obligatorio'));
      expect(validarNombreUsuario(null), contains('obligatorio'));
    });
    test('VL: 3 caracteres (inválido) / 4 caracteres (válido)', () {
      expect(validarNombreUsuario('abc'), contains('entre 4 y 20'));
      expect(validarNombreUsuario('abcd'), isNull);
    });
    test('VL: 20 caracteres (válido) / 21 caracteres (inválido)', () {
      expect(validarNombreUsuario('a' * 20), isNull);
      expect(validarNombreUsuario('a' * 21), contains('entre 4 y 20'));
    });
    test('CE inválida: caracteres especiales', () {
      expect(validarNombreUsuario('adm!n'), contains('solo admite'));
    });
  });

  group('Contraseña (8 a 20 caracteres)', () {
    test('CE válida', () => expect(validarClave('Admin2026*'), isNull));
    test('CE inválida: vacía', () {
      expect(validarClave(''), contains('obligatorio'));
      expect(validarClave(null), contains('obligatorio'));
    });
    test('VL: 7 / 8 caracteres', () {
      expect(validarClave('1234567'), contains('entre 8 y 20'));
      expect(validarClave('12345678'), isNull);
    });
    test('VL: 20 / 21 caracteres', () {
      expect(validarClave('x' * 20), isNull);
      expect(validarClave('x' * 21), contains('entre 8 y 20'));
    });
  });

  group('Documento (6 a 10 dígitos)', () {
    test('CE válida', () => expect(validarDocumento('1065123456'), isNull));
    test('CE inválida: vacío', () {
      expect(validarDocumento(''), contains('obligatorio'));
    });
    test('CE inválida: contiene letras', () {
      expect(validarDocumento('10651A3456'), contains('solo debe contener'));
    });
    test('VL: 5 / 6 dígitos', () {
      expect(validarDocumento('12345'), contains('entre 6 y 10'));
      expect(validarDocumento('123456'), isNull);
    });
    test('VL: 10 / 11 dígitos', () {
      expect(validarDocumento('1234567890'), isNull);
      expect(validarDocumento('12345678901'), contains('entre 6 y 10'));
    });
  });

  group('Nombre de persona (3 a 60 letras)', () {
    test('CE válida con tildes y ñ', () {
      expect(validarNombrePersona('María Fernanda Ñáñez'), isNull);
    });
    test('CE inválida: vacío', () {
      expect(validarNombrePersona(''), contains('obligatorio'));
    });
    test('CE inválida: contiene números', () {
      expect(validarNombrePersona('Juan 23'), contains('solo debe contener'));
    });
    test('VL: 2 / 3 caracteres', () {
      expect(validarNombrePersona('Al'), contains('entre 3 y 60'));
      expect(validarNombrePersona('Ana'), isNull);
    });
    test('VL: 60 / 61 caracteres', () {
      expect(validarNombrePersona('a' * 60), isNull);
      expect(validarNombrePersona('a' * 61), contains('entre 3 y 60'));
    });
  });

  group('Teléfono (10 dígitos, inicia en 3)', () {
    test('CE válida', () => expect(validarTelefono('3004567890'), isNull));
    test('CE inválida: vacío', () {
      expect(validarTelefono(''), contains('obligatorio'));
    });
    test('CE inválida: no numérico', () {
      expect(validarTelefono('300-456789'), contains('solo debe contener'));
    });
    test('VL: 9 / 11 dígitos', () {
      expect(validarTelefono('300456789'), contains('10 dígitos'));
      expect(validarTelefono('30045678901'), contains('10 dígitos'));
    });
    test('CE inválida: no inicia en 3', () {
      expect(validarTelefono('6055712345'), contains('empezar por 3'));
    });
  });

  group('Correo electrónico', () {
    test('CE válida', () {
      expect(validarCorreo('laura.torres@correo.com'), isNull);
      expect(validarCorreo('a+b@unicesar.edu.co'), isNull);
    });
    test('CE inválida: vacío', () {
      expect(validarCorreo(''), contains('obligatorio'));
    });
    test('CE inválida: sin arroba / sin dominio', () {
      expect(validarCorreo('lauracorreo.com'), contains('no es válido'));
      expect(validarCorreo('laura@'), contains('no es válido'));
      expect(validarCorreo('laura@correo'), contains('no es válido'));
    });
  });

  group('Nombre de casa (3 a 50 caracteres)', () {
    test('CE válida', () => expect(validarNombreCasa('Finca Nueva'), isNull));
    test('VL: 2 / 3 / 50 / 51 caracteres', () {
      expect(validarNombreCasa('ab'), contains('entre 3 y 50'));
      expect(validarNombreCasa('abc'), isNull);
      expect(validarNombreCasa('a' * 50), isNull);
      expect(validarNombreCasa('a' * 51), contains('entre 3 y 50'));
    });
  });

  group('Entero en rango', () {
    String? capacidad(String? v) =>
        validarEnteroEnRango(v, 'capacidad', minimo: 1, maximo: 30);

    test('CE válida', () => expect(capacidad('10'), isNull));
    test('CE inválida: vacío / no numérico / decimal', () {
      expect(capacidad(''), contains('obligatorio'));
      expect(capacidad('diez'), contains('número entero'));
      expect(capacidad('2.5'), contains('número entero'));
    });
    test('VL: 0 / 1 / 30 / 31', () {
      expect(capacidad('0'), contains('entre 1 y 30'));
      expect(capacidad('1'), isNull);
      expect(capacidad('30'), isNull);
      expect(capacidad('31'), contains('entre 1 y 30'));
    });
  });
}
