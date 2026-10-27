import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/core/json.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatearFecha / leerFechaTexto', () {
    test('formatea con ceros a la izquierda', () {
      expect(formatearFecha(DateTime(2026, 3, 5)), '05/03/2026');
    });
    test('lee una fecha válida', () {
      expect(leerFechaTexto('15/12/2026'), DateTime.utc(2026, 12, 15));
      expect(leerFechaTexto(' 01/01/2027 '), DateTime.utc(2027, 1, 1));
    });
    test('rechaza fechas inexistentes o mal escritas', () {
      expect(leerFechaTexto('31/02/2026'), isNull);
      expect(leerFechaTexto('29/02/2026'), isNull);
      expect(leerFechaTexto('2026-12-15'), isNull);
      expect(leerFechaTexto('15/12/26'), isNull);
      expect(leerFechaTexto('aa/bb/cccc'), isNull);
      expect(leerFechaTexto(''), isNull);
    });
    test('acepta 29 de febrero en año bisiesto', () {
      expect(leerFechaTexto('29/02/2028'), DateTime.utc(2028, 2, 29));
    });
  });

  group('formatearPesos', () {
    test('agrega separadores de miles', () {
      expect(formatearPesos(0), r'$ 0');
      expect(formatearPesos(999), r'$ 999');
      expect(formatearPesos(1000), r'$ 1.000');
      expect(formatearPesos(1250000), r'$ 1.250.000');
      expect(formatearPesos(-45000), r'-$ 45.000');
    });
  });

  group('lectura de JSON', () {
    test('leerTexto exige texto no vacío', () {
      expect(leerTexto({'a': 'x'}, 'a'), 'x');
      expect(() => leerTexto({'a': ''}, 'a'), throwsA(isA<CampoInvalido>()));
      expect(() => leerTexto({}, 'a'), throwsA(isA<CampoInvalido>()));
    });
    test('leerEntero acepta enteros y valores por defecto', () {
      expect(leerEntero({'n': 5}, 'n'), 5);
      expect(leerEntero({'n': 5.0}, 'n'), 5);
      expect(leerEntero({}, 'n', porDefecto: 1), 1);
      expect(() => leerEntero({'n': 'x'}, 'n'), throwsA(isA<CampoInvalido>()));
      expect(() => leerEntero({'n': 2.5}, 'n'), throwsA(isA<CampoInvalido>()));
    });
    test('leerBooleano y leerTextoOpcional', () {
      expect(leerBooleano({'b': false}, 'b'), isFalse);
      expect(leerBooleano({}, 'b', porDefecto: true), isTrue);
      expect(() => leerBooleano({'b': 1}, 'b'), throwsA(isA<CampoInvalido>()));
      expect(leerTextoOpcional({}, 't'), isNull);
      expect(
        () => leerTextoOpcional({'t': 3}, 't'),
        throwsA(isA<CampoInvalido>()),
      );
    });
    test('leerFecha valida ISO-8601', () {
      expect(
        leerFecha({'f': '2026-09-01T00:00:00.000Z'}, 'f'),
        DateTime.utc(2026, 9, 1),
      );
      expect(
        () => leerFecha({'f': 'ayer'}, 'f'),
        throwsA(isA<CampoInvalido>()),
      );
      expect(() => leerFecha({'f': 3}, 'f'), throwsA(isA<CampoInvalido>()));
    });
    test('leerListaDeObjetos', () {
      expect(leerListaDeObjetos({}, 'l'), isEmpty);
      expect(
        leerListaDeObjetos({
          'l': [
            {'a': 1},
          ],
        }, 'l'),
        hasLength(1),
      );
      expect(
        () => leerListaDeObjetos({'l': 'x'}, 'l'),
        throwsA(isA<CampoInvalido>()),
      );
      expect(
        () => leerListaDeObjetos({
          'l': [1],
        }, 'l'),
        throwsA(isA<CampoInvalido>()),
      );
    });
    test('CampoInvalido describe el error', () {
      expect(
        const CampoInvalido('id', 'vacío', '').toString(),
        contains('campo: id'),
      );
    });
  });
}
