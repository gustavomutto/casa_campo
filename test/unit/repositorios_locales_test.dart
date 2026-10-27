import 'dart:convert';

import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/casas/data/casas_locales.dart';
import 'package:casa_campo/features/reservas/data/reservas_locales.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

const _jsonUnaPendiente = '''
[
  {
    "id": "r1",
    "casaId": "casa1",
    "clienteNombre": "Gustavo",
    "rangoFechas": {
      "fechaEntrada": "2026-09-01T00:00:00.000Z",
      "fechaSalida": "2026-09-03T00:00:00.000Z"
    },
    "estado": {"tipo": "pendiente"}
  },
  {
    "id": "r2",
    "casaId": "casa2",
    "clienteNombre": "Cliente 2",
    "rangoFechas": {
      "fechaEntrada": "2026-10-01T00:00:00.000Z",
      "fechaSalida": "2026-10-03T00:00:00.000Z"
    },
    "estado": {"tipo": "confirmada", "confirmadaPor": "administrador"}
  }
]
''';

void main() {
  test('carga reservas desde JSON local', () async {
    final repositorio = ReservasLocales(lector: (_) async => _jsonUnaPendiente);
    final reservas = await repositorio.obtenerTodos();

    expect(reservas, hasLength(2));
    expect(reservas.first.clienteNombre, 'Gustavo');
    expect(reservas.first.estado, const Pendiente());
  });

  test('obtiene solamente reservas pendientes y por casa', () async {
    final repositorio = ReservasLocales(lector: (_) async => _jsonUnaPendiente);

    expect((await repositorio.obtenerPendientes()).single.id, 'r1');
    expect((await repositorio.obtenerPorCasa('casa2')).single.id, 'r2');
    expect(await repositorio.obtenerPorId('nada'), isNull);
  });

  test('lee la semilla una sola vez y luego usa el almacenamiento', () async {
    var lecturas = 0;
    final almacenamiento = AlmacenamientoEnMemoria();
    Future<String> lector(String ruta) async {
      lecturas++;
      return _jsonUnaPendiente;
    }

    final primero = ReservasLocales(
      lector: lector,
      almacenamiento: almacenamiento,
    );
    await primero.obtenerTodos();
    await primero.obtenerTodos();
    expect(lecturas, 1);

    final segundo = ReservasLocales(
      lector: lector,
      almacenamiento: almacenamiento,
    );
    expect(await segundo.obtenerTodos(), hasLength(2));
    expect(lecturas, 1);
  });

  test('guarda, reemplaza, elimina y persiste cambios', () async {
    final almacenamiento = AlmacenamientoEnMemoria();
    final repo = CasasLocales(
      lector: lectorSemillas,
      almacenamiento: almacenamiento,
    );
    final casa = (await repo.obtenerPorId('casa-001'))!;

    await repo.guardar(casa.copiarCon(precioNoche: 999999));
    await repo.eliminar('casa-005');

    final recargado = CasasLocales(
      lector: lectorSemillas,
      almacenamiento: almacenamiento,
    );
    expect((await recargado.obtenerPorId('casa-001'))!.precioNoche, 999999);
    expect(await recargado.obtenerTodas(), hasLength(4));

    final crudo = jsonDecode(
      (await almacenamiento.leer('casa_campo.casas.v1'))!,
    );
    expect(crudo, hasLength(4));
  });

  test('genera identificadores consecutivos', () async {
    final repo = CasasLocales(lector: lectorSemillas);
    expect(await repo.siguienteId(), 'casa-006');
  });

  test('rechaza un archivo que no contiene una lista', () {
    final repositorio = ReservasLocales(lector: (_) async => '{"id": 1}');
    expect(repositorio.obtenerTodos(), throwsA(isA<CampoInvalido>()));
  });

  test('rechaza elementos que no son objetos', () {
    final repositorio = ReservasLocales(lector: (_) async => '[1, 2]');
    expect(repositorio.obtenerTodos(), throwsA(isA<CampoInvalido>()));
  });

  test('rechaza JSON mal formado', () {
    final repositorio = ReservasLocales(lector: (_) async => '[{');
    expect(repositorio.obtenerTodos(), throwsA(isA<FormatException>()));
  });

  test('AlmacenamientoEnMemoria elimina claves', () async {
    final almacenamiento = AlmacenamientoEnMemoria({'a': '1'});
    await almacenamiento.eliminar('a');
    expect(await almacenamiento.leer('a'), isNull);
  });
}
