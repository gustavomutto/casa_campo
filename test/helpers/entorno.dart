import 'dart:io';

import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/features/casas/data/casas_locales.dart';
import 'package:casa_campo/features/clientes/data/clientes_locales.dart';
import 'package:casa_campo/features/reservas/data/reservas_locales.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Fecha "actual" fija para que las pruebas sean repetibles.
final hoyPruebas = DateTime(2026, 10, 27, 10);

DateTime relojPruebas() => hoyPruebas;

/// Contenido real de los archivos semilla de assets/data.
final Map<String, String> semillas = {
  for (final nombre in ['casas', 'clientes', 'reservas'])
    'assets/data/$nombre.json': File('assets/data/$nombre.json')
        .readAsStringSync(),
};

/// Lector de assets que no usa E/S real (compatible con testWidgets).
Future<String> lectorSemillas(String ruta) {
  final contenido = semillas[ruta];

  if (contenido == null) {
    return Future.error(StateError('Asset no encontrado: $ruta'));
  }

  return Future.value(contenido);
}

class Repositorios {
  Repositorios(this.almacenamiento)
    : casas = CasasLocales(
        lector: lectorSemillas,
        almacenamiento: almacenamiento,
      ),
      clientes = ClientesLocales(
        lector: lectorSemillas,
        almacenamiento: almacenamiento,
      ),
      reservas = ReservasLocales(
        lector: lectorSemillas,
        almacenamiento: almacenamiento,
      );

  final Almacenamiento almacenamiento;
  final CasasLocales casas;
  final ClientesLocales clientes;
  final ReservasLocales reservas;
}

Repositorios crearRepositorios([Almacenamiento? almacenamiento]) {
  return Repositorios(almacenamiento ?? AlmacenamientoEnMemoria());
}

Dependencias crearDependencias([Almacenamiento? almacenamiento]) {
  return Dependencias.locales(
    almacenamiento: almacenamiento ?? AlmacenamientoEnMemoria(),
    lector: lectorSemillas,
    reloj: relojPruebas,
  );
}

/// Pantalla grande para que todos los controles queden visibles.
void configurarPantalla(
  WidgetTester tester, {
  Size tamano = const Size(1280, 1600),
}) {
  tester.view.physicalSize = tamano;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}
