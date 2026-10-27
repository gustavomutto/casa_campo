// Módulo de casas: pruebas unitarias de registro, edición y activación.
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/features/casas/domain/servicio_casas.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

DatosCasa _datos({
  String nombre = 'Finca Las Palmas',
  String municipio = 'San Diego',
  String capacidad = '10',
  String precio = '400000',
}) {
  return DatosCasa(
    nombre: nombre,
    municipio: municipio,
    capacidadMaxima: capacidad,
    precioNoche: precio,
    descripcion: 'Piscina y kiosco',
  );
}

void main() {
  late ServicioCasas servicio;

  setUp(() {
    final repos = crearRepositorios();
    servicio = ServicioCasas(repos.casas, repos.reservas, reloj: relojPruebas);
  });

  Matcher errorEn(String campo) =>
      throwsA(isA<ErrorDeValidacion>().having((e) => e.campo, 'campo', campo));

  test('CP-CAS-01 registra una casa válida', () async {
    final casa = await servicio.crear(_datos());

    expect(casa.id, 'casa-006');
    expect(casa.activa, isTrue);
    expect(casa.precioNoche, 400000);
  });

  test('CP-CAS-02 nombre vacío', () {
    expect(servicio.crear(_datos(nombre: '')), errorEn('nombre'));
  });

  test('CP-CAS-03 nombre de 51 caracteres', () {
    expect(servicio.crear(_datos(nombre: 'a' * 51)), errorEn('nombre'));
  });

  test('CP-CAS-04 municipio vacío', () {
    expect(servicio.crear(_datos(municipio: ' ')), errorEn('municipio'));
  });

  test('CP-CAS-05 capacidad 0 y 31 (fuera de rango)', () {
    expect(servicio.crear(_datos(capacidad: '0')), errorEn('capacidadMaxima'));
    expect(servicio.crear(_datos(capacidad: '31')), errorEn('capacidadMaxima'));
  });

  test('CP-CAS-06 capacidad no numérica', () {
    expect(
      servicio.crear(_datos(capacidad: 'diez')),
      errorEn('capacidadMaxima'),
    );
  });

  test('CP-CAS-07 precio 49.999 y 5.000.001 (fuera de rango)', () {
    expect(servicio.crear(_datos(precio: '49999')), errorEn('precioNoche'));
    expect(servicio.crear(_datos(precio: '5000001')), errorEn('precioNoche'));
  });

  test('CP-CAS-08 valores límite válidos', () async {
    final minima = await servicio.crear(
      _datos(nombre: 'Casa Mínima', capacidad: '1', precio: '50000'),
    );
    final maxima = await servicio.crear(
      _datos(nombre: 'Casa Máxima', capacidad: '30', precio: '5000000'),
    );

    expect(minima.capacidadMaxima, 1);
    expect(maxima.precioNoche, 5000000);
  });

  test('CP-CAS-09 nombre duplicado (sin distinguir mayúsculas)', () {
    expect(
      servicio.crear(_datos(nombre: 'finca el remanso')),
      errorEn('nombre'),
    );
  });

  test('CP-CAS-10 actualiza una casa existente', () async {
    final casa = await servicio.actualizar(
      'casa-003',
      _datos(nombre: 'Cabaña Sierra Nevada', capacidad: '5', precio: '240000'),
    );

    expect(casa.capacidadMaxima, 5);
    expect((await servicio.obtener('casa-003'))!.precioNoche, 240000);
  });

  test('CP-CAS-11 actualizar una casa inexistente', () {
    expect(
      servicio.actualizar('casa-999', _datos()),
      throwsA(isA<ErrorDeNegocio>()),
    );
  });

  test('CP-CAS-12 no permite desactivar una casa con reservas activas', () {
    expect(
      servicio.cambiarEstado('casa-001', activa: false),
      throwsA(isA<ErrorDeNegocio>()),
    );
  });

  test(
    'CP-CAS-13 desactiva y reactiva una casa sin reservas activas',
    () async {
      final inactiva = await servicio.cambiarEstado('casa-003', activa: false);
      expect(inactiva.activa, isFalse);
      expect(await servicio.listar(soloActivas: true), hasLength(3));

      final activa = await servicio.cambiarEstado('casa-005', activa: true);
      expect(activa.activa, isTrue);
    },
  );

  test('CP-CAS-14 cambiar el estado de una casa inexistente', () {
    expect(
      servicio.cambiarEstado('casa-999', activa: true),
      throwsA(isA<ErrorDeNegocio>()),
    );
  });
}
