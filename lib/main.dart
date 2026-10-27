import 'package:casa_campo/app/app.dart';
import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/core/almacenamiento.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (kIsWeb) {
    // Expone el árbol de accesibilidad en el DOM: mejora la accesibilidad y
    // permite automatizar las pruebas de aceptación con Selenium.
    SemanticsBinding.instance.ensureSemantics();
  }

  final almacenamiento = await AlmacenamientoPreferencias.crear();

  runApp(
    CasaCampoApp(
      dependencias: Dependencias.locales(almacenamiento: almacenamiento),
    ),
  );
}
