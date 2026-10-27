// Pruebas de widgets: validaciones visibles en los formularios.
import 'package:casa_campo/app/app.dart';
import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/features/clientes/presentation/cliente_form_page.dart';
import 'package:casa_campo/features/casas/presentation/casa_form_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

Widget _envolver(Widget pagina, Dependencias dependencias) {
  return ProveedorDependencias(
    dependencias: dependencias,
    child: MaterialApp(home: pagina),
  );
}

void main() {
  testWidgets('Login: muestra errores de campos obligatorios', (tester) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));

    await tester.tap(find.byKey(const Key('boton-ingresar')));
    await tester.pump();

    expect(find.text('El campo usuario es obligatorio.'), findsOneWidget);
    expect(find.text('El campo contraseña es obligatorio.'), findsOneWidget);
  });

  testWidgets('Login: credenciales incorrectas muestran mensaje genérico', (
    tester,
  ) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));

    await tester.enterText(find.byKey(const Key('campo-usuario')), 'admin');
    await tester.enterText(find.byKey(const Key('campo-clave')), 'Incorrecta1');
    await tester.tap(find.byKey(const Key('boton-ingresar')));
    await tester.pumpAndSettle();

    expect(find.text('Usuario o contraseña incorrectos.'), findsOneWidget);
  });

  testWidgets('Login: el recepcionista no ve Casas ni Reportes', (
    tester,
  ) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));

    await tester.enterText(find.byKey(const Key('campo-usuario')), 'recepcion');
    await tester.enterText(find.byKey(const Key('campo-clave')), 'Recep2026*');
    await tester.tap(find.byKey(const Key('boton-ingresar')));
    await tester.pumpAndSettle();

    expect(find.text('Disponibilidad'), findsOneWidget);
    expect(find.text('Casas'), findsNothing);
    expect(find.text('Reportes'), findsNothing);
  });

  testWidgets('Cliente: valida los cuatro campos', (tester) async {
    configurarPantalla(tester);
    await tester.pumpWidget(
      _envolver(const ClienteFormPage(), crearDependencias()),
    );

    await tester.enterText(find.byKey(const Key('campo-documento')), '12AB');
    await tester.enterText(find.byKey(const Key('campo-nombre')), 'J');
    await tester.enterText(
      find.byKey(const Key('campo-telefono')),
      '6051234567',
    );
    await tester.enterText(find.byKey(const Key('campo-correo')), 'correo@');
    await tester.tap(find.byKey(const Key('boton-guardar-cliente')));
    await tester.pump();

    expect(
      find.text('El documento solo debe contener números.'),
      findsOneWidget,
    );
    expect(
      find.text('El nombre debe tener entre 3 y 60 caracteres.'),
      findsOneWidget,
    );
    expect(
      find.text('El teléfono celular debe empezar por 3.'),
      findsOneWidget,
    );
    expect(find.text('El correo electrónico no es válido.'), findsOneWidget);
  });

  testWidgets('Cliente: documento duplicado se informa al guardar', (
    tester,
  ) async {
    configurarPantalla(tester);
    await tester.pumpWidget(
      _envolver(const ClienteFormPage(), crearDependencias()),
    );

    await tester.enterText(
      find.byKey(const Key('campo-documento')),
      '1065123456',
    );
    await tester.enterText(
      find.byKey(const Key('campo-nombre')),
      'Otro Cliente',
    );
    await tester.enterText(
      find.byKey(const Key('campo-telefono')),
      '3001112233',
    );
    await tester.enterText(
      find.byKey(const Key('campo-correo')),
      'otro@correo.com',
    );
    await tester.tap(find.byKey(const Key('boton-guardar-cliente')));
    await tester.pumpAndSettle();

    expect(
      find.text('Ya existe un cliente con ese documento.'),
      findsOneWidget,
    );
  });

  testWidgets('Casa: valida capacidad y precio', (tester) async {
    configurarPantalla(tester);
    await tester.pumpWidget(
      _envolver(const CasaFormPage(), crearDependencias()),
    );

    await tester.enterText(
      find.byKey(const Key('campo-nombre-casa')),
      'Finca X',
    );
    await tester.enterText(
      find.byKey(const Key('campo-municipio')),
      'Valledupar',
    );
    await tester.enterText(find.byKey(const Key('campo-capacidad')), '31');
    await tester.enterText(find.byKey(const Key('campo-precio')), '49999');
    await tester.tap(find.byKey(const Key('boton-guardar-casa')));
    await tester.pump();

    expect(
      find.text('El campo capacidad debe estar entre 1 y 30.'),
      findsOneWidget,
    );
    expect(
      find.text('El campo precio por noche debe estar entre 50000 y 5000000.'),
      findsOneWidget,
    );
  });
}
