// PRUEBAS DE INTEGRACIÓN BASADAS EN HILOS.
//
// Cada prueba recorre el hilo completo de un caso de uso a través de todas
// las capas: Interfaz -> Servicio -> Repositorio -> Almacenamiento.
import 'package:casa_campo/app/app.dart';
import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

Future<void> _ingresarComoAdmin(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('campo-usuario')), 'admin');
  await tester.enterText(find.byKey(const Key('campo-clave')), 'Admin2026*');
  await tester.tap(find.byKey(const Key('boton-ingresar')));
  await tester.pumpAndSettle();
}

Future<void> _seleccionar(WidgetTester tester, Key campo, String opcion) async {
  await tester.tap(find.byKey(campo));
  await tester.pumpAndSettle();
  await tester.tap(find.text(opcion).last);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('CPI-H1 Hilo "Registrar reserva" (CU-05)', (tester) async {
    configurarPantalla(tester);
    final almacenamiento = AlmacenamientoEnMemoria();
    final dependencias = crearDependencias(almacenamiento);

    await tester.pumpWidget(CasaCampoApp(dependencias: dependencias));
    await _ingresarComoAdmin(tester);

    await tester.tap(find.byKey(const Key('boton-nueva-reserva')));
    await tester.pumpAndSettle();

    await _seleccionar(
      tester,
      const Key('campo-casa'),
      'Cabaña Sierra Nevada (máx. 4)',
    );
    await _seleccionar(
      tester,
      const Key('campo-cliente'),
      'Andrés Gómez · 77182934',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const Key('campo-fecha-entrada')),
        matching: find.byType(EditableText),
      ),
      '01/02/2027',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const Key('campo-fecha-salida')),
        matching: find.byType(EditableText),
      ),
      '04/02/2027',
    );
    await tester.enterText(find.byKey(const Key('campo-huespedes')), '3');
    await tester.pumpAndSettle();

    expect(find.text(r'Valor de la estadía: $ 660.000'), findsOneWidget);

    await tester.tap(find.byKey(const Key('boton-guardar-reserva')));
    await tester.pumpAndSettle();

    // Interfaz: la reserva aparece en el listado y se informa al usuario.
    expect(find.text('Reserva res-007 registrada.'), findsOneWidget);
    expect(find.textContaining('res-007'), findsWidgets);

    // Servicio / repositorio / almacenamiento: quedó persistida.
    final guardada = await crearRepositorios(almacenamiento).reservas
        .obtenerPorId('res-007');
    expect(guardada!.estado, const Pendiente());
    expect(guardada.montoTotal, 660000);
  });

  testWidgets(
    'CPI-H2 Hilo "Registrar reserva" con casa ocupada (flujo alterno)',
    (tester) async {
      configurarPantalla(tester);
      await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));
      await _ingresarComoAdmin(tester);

      await tester.tap(find.byKey(const Key('boton-nueva-reserva')));
      await tester.pumpAndSettle();
      await _seleccionar(
        tester,
        const Key('campo-casa'),
        'Finca El Remanso (máx. 8)',
      );
      await _seleccionar(
        tester,
        const Key('campo-cliente'),
        'Laura Torres · 1065987654',
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('campo-fecha-entrada')),
          matching: find.byType(EditableText),
        ),
        '14/11/2026',
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('campo-fecha-salida')),
          matching: find.byType(EditableText),
        ),
        '17/11/2026',
      );
      await tester.enterText(find.byKey(const Key('campo-huespedes')), '4');
      await tester.tap(find.byKey(const Key('boton-guardar-reserva')));
      await tester.pumpAndSettle();

      expect(
        find.text('La casa no está disponible en las fechas seleccionadas.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('CPI-H3 Hilo "Registrar pago y confirmar" (CU-07 y CU-08)', (
    tester,
  ) async {
    configurarPantalla(tester);
    final almacenamiento = AlmacenamientoEnMemoria();
    await tester.pumpWidget(
      CasaCampoApp(dependencias: crearDependencias(almacenamiento)),
    );
    await _ingresarComoAdmin(tester);

    await tester.tap(find.textContaining('res-006'));
    await tester.pumpAndSettle();

    // Sin anticipo suficiente no se puede confirmar.
    await tester.tap(find.byKey(const Key('boton-confirmar')));
    await tester.pumpAndSettle();
    expect(find.textContaining('anticipo mínimo del 30 %'), findsOneWidget);

    await tester.tap(find.byKey(const Key('boton-registrar-pago')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('campo-monto')), '232000');
    await tester.tap(find.byKey(const Key('boton-guardar-pago')));
    await tester.pumpAndSettle();
    expect(find.text(r'Pago de $ 232.000 registrado.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('boton-confirmar')));
    await tester.pumpAndSettle();
    expect(find.text('Reserva confirmada.'), findsOneWidget);
    expect(find.byKey(const Key('boton-iniciar')), findsOneWidget);

    final guardada = await crearRepositorios(almacenamiento).reservas
        .obtenerPorId('res-006');
    expect(guardada!.estado, const Confirmada('admin'));
    expect(guardada.totalPagado, 432000);
  });

  testWidgets('CPI-H4 Hilo "Registrar cliente" (CU-03)', (tester) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));
    await _ingresarComoAdmin(tester);

    await tester.tap(find.text('Clientes'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('boton-nuevo-cliente')));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('campo-documento')),
      '1067555444',
    );
    await tester.enterText(
      find.byKey(const Key('campo-nombre')),
      'Valentina Ospino',
    );
    await tester.enterText(
      find.byKey(const Key('campo-telefono')),
      '3014445566',
    );
    await tester.enterText(
      find.byKey(const Key('campo-correo')),
      'vospino@correo.com',
    );
    await tester.tap(find.byKey(const Key('boton-guardar-cliente')));
    await tester.pumpAndSettle();

    expect(find.text('Cliente Valentina Ospino registrado.'), findsOneWidget);
    expect(find.text('Valentina Ospino'), findsOneWidget);
  });

  testWidgets('CPI-H5 Hilo "Consultar disponibilidad" (CU-06)', (tester) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));
    await _ingresarComoAdmin(tester);

    await tester.tap(find.text('Disponibilidad'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.descendant(
        of: find.byKey(const Key('disp-fecha-entrada')),
        matching: find.byType(EditableText),
      ),
      '14/11/2026',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const Key('disp-fecha-salida')),
        matching: find.byType(EditableText),
      ),
      '15/11/2026',
    );
    await tester.enterText(find.byKey(const Key('disp-huespedes')), '10');
    await tester.tap(find.byKey(const Key('boton-buscar-disponibilidad')));
    await tester.pumpAndSettle();

    expect(find.text('2 casa(s) disponible(s) · 1 noche(s)'), findsOneWidget);
    expect(find.text('Casa Los Mangos'), findsOneWidget);
    expect(find.text('Villa Manaure'), findsOneWidget);
    expect(find.text('Finca El Remanso'), findsNothing);
  });
}
