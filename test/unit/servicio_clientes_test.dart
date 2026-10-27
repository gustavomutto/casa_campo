// Módulo de clientes: pruebas unitarias del registro de clientes.
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/features/clientes/domain/servicio_clientes.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

DatosCliente _datos({
  String documento = '1067111222',
  String nombre = 'Gustavo Mutto',
  String telefono = '3001234567',
  String correo = 'gmutto@unicesar.edu.co',
}) {
  return DatosCliente(
    documento: documento,
    nombreCompleto: nombre,
    telefono: telefono,
    correo: correo,
  );
}

void main() {
  late ServicioClientes servicio;

  setUp(() {
    servicio = ServicioClientes(crearRepositorios().clientes);
  });

  Matcher errorEn(String campo) =>
      throwsA(isA<ErrorDeValidacion>().having((e) => e.campo, 'campo', campo));

  test('CP-CLI-01 registra un cliente válido', () async {
    final cliente = await servicio.registrar(
      _datos(correo: 'GMutto@Unicesar.edu.co '),
    );

    expect(cliente.id, 'cli-006');
    expect(cliente.correo, 'gmutto@unicesar.edu.co');
    expect(await servicio.obtener('cli-006'), cliente);
  });

  test('CP-CLI-02 documento vacío', () {
    expect(servicio.registrar(_datos(documento: '')), errorEn('documento'));
  });

  test('CP-CLI-03 documento con letras', () {
    expect(
      servicio.registrar(_datos(documento: '10671A1222')),
      errorEn('documento'),
    );
  });

  test('CP-CLI-04 documento de 5 dígitos', () {
    expect(
      servicio.registrar(_datos(documento: '12345')),
      errorEn('documento'),
    );
  });

  test('CP-CLI-05 documento de 11 dígitos', () {
    expect(
      servicio.registrar(_datos(documento: '12345678901')),
      errorEn('documento'),
    );
  });

  test('CP-CLI-06 nombre con números', () {
    expect(
      servicio.registrar(_datos(nombre: 'Gustavo 2')),
      errorEn('nombreCompleto'),
    );
  });

  test('CP-CLI-07 nombre de 2 caracteres', () {
    expect(servicio.registrar(_datos(nombre: 'Gu')), errorEn('nombreCompleto'));
  });

  test('CP-CLI-08 teléfono de 9 dígitos', () {
    expect(
      servicio.registrar(_datos(telefono: '300123456')),
      errorEn('telefono'),
    );
  });

  test('CP-CLI-09 teléfono que no inicia en 3', () {
    expect(
      servicio.registrar(_datos(telefono: '6055712345')),
      errorEn('telefono'),
    );
  });

  test('CP-CLI-10 correo sin dominio', () {
    expect(servicio.registrar(_datos(correo: 'gmutto@')), errorEn('correo'));
  });

  test('CP-CLI-11 documento duplicado', () {
    expect(
      servicio.registrar(_datos(documento: '1065123456')),
      throwsA(
        isA<ErrorDeValidacion>().having(
          (e) => e.mensaje,
          'mensaje',
          contains('Ya existe'),
        ),
      ),
    );
  });

  test(
    'CP-CLI-12 valores límite válidos (6 y 10 dígitos, nombre de 3)',
    () async {
      final a = await servicio.registrar(
        _datos(documento: '123456', nombre: 'Ana'),
      );
      final b = await servicio.registrar(_datos(documento: '1234567890'));

      expect(a.documento, '123456');
      expect(b.documento, '1234567890');
    },
  );

  test('CP-CLI-13 actualiza un cliente y conserva su id', () async {
    final actualizado = await servicio.actualizar(
      'cli-001',
      _datos(documento: '1065123456', nombre: 'Carlos Andrés Mendoza'),
    );

    expect(actualizado.id, 'cli-001');
    expect(
      (await servicio.obtener('cli-001'))!.nombreCompleto,
      'Carlos Andrés Mendoza',
    );
  });

  test('CP-CLI-14 actualizar un cliente inexistente', () {
    expect(
      servicio.actualizar('cli-999', _datos()),
      throwsA(isA<ErrorDeNegocio>()),
    );
  });

  test('CP-CLI-15 busca por nombre o documento y ordena', () async {
    expect(await servicio.listar(filtro: 'torres'), hasLength(1));
    expect(await servicio.listar(filtro: '7718'), hasLength(1));

    final todos = await servicio.listar();
    expect(todos.first.nombreCompleto, 'Andrés Gómez');
    expect(todos, hasLength(5));
  });
}
