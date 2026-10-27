// PRUEBAS DE INTEGRACIÓN INCREMENTAL DESCENDENTE (top-down).
//
// Se parte del módulo de control (CasaCampoApp + InicioPage) usando
// stubs para los repositorios y se van sustituyendo por los componentes
// reales.
import 'package:casa_campo/app/app.dart';
import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/features/autenticacion/data/usuarios_locales.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/clientes/domain/clientes_repository.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/entorno.dart';

/// Stubs: devuelven datos fijos (vacíos) o fallan a propósito.
class CasasStub implements CasasRepository {
  @override
  Future<List<Casa>> obtenerTodas() async => const [];
  @override
  Future<Casa?> obtenerPorId(String id) async => null;
  @override
  Future<void> guardar(Casa casa) async {}
  @override
  Future<String> siguienteId() async => 'casa-001';
}

class ClientesStub implements ClientesRepository {
  @override
  Future<List<Cliente>> obtenerTodos() async => const [];
  @override
  Future<Cliente?> obtenerPorId(String id) async => null;
  @override
  Future<void> guardar(Cliente cliente) async {}
  @override
  Future<String> siguienteId() async => 'cli-001';
}

class ReservasStub implements ReservasRepository {
  ReservasStub({this.falla = false});

  final bool falla;

  @override
  Future<List<Reserva>> obtenerTodos() async {
    if (falla) {
      throw StateError('Almacenamiento no disponible');
    }
    return const [];
  }

  @override
  Future<Reserva?> obtenerPorId(String id) async => null;
  @override
  Future<List<Reserva>> obtenerPendientes() async => const [];
  @override
  Future<List<Reserva>> obtenerPorCasa(String casaId) async => const [];
  @override
  Future<void> guardar(Reserva reserva) async {}
  @override
  Future<String> siguienteId() async => 'res-001';
}

Future<void> _ingresar(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('campo-usuario')), 'admin');
  await tester.enterText(find.byKey(const Key('campo-clave')), 'Admin2026*');
  await tester.tap(find.byKey(const Key('boton-ingresar')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'CPI-D1 Nivel 1: App + autenticación real con repositorios stub',
    (tester) async {
      configurarPantalla(tester);
      final dependencias = Dependencias(
        casas: CasasStub(),
        clientes: ClientesStub(),
        reservas: ReservasStub(),
        usuarios: UsuariosLocales(),
        reloj: relojPruebas,
      );

      await tester.pumpWidget(CasaCampoApp(dependencias: dependencias));
      expect(find.text('Ingresar'), findsOneWidget);

      await _ingresar(tester);

      expect(dependencias.sesion.autenticado, isTrue);
      expect(find.text('No hay reservas para mostrar.'), findsOneWidget);
    },
  );

  testWidgets('CPI-D2 Nivel 2: navegación entre secciones con stubs', (
    tester,
  ) async {
    configurarPantalla(tester);
    await tester.pumpWidget(
      CasaCampoApp(
        dependencias: Dependencias(
          casas: CasasStub(),
          clientes: ClientesStub(),
          reservas: ReservasStub(),
          usuarios: UsuariosLocales(),
          reloj: relojPruebas,
        ),
      ),
    );
    await _ingresar(tester);

    await tester.tap(find.text('Clientes'));
    await tester.pumpAndSettle();
    expect(find.text('No se encontraron clientes.'), findsOneWidget);

    await tester.tap(find.text('Casas'));
    await tester.pumpAndSettle();
    expect(find.text('No hay casas registradas.'), findsOneWidget);

    await tester.tap(find.text('Reportes'));
    await tester.pumpAndSettle();
    expect(find.text('Reservas registradas'), findsOneWidget);
  });

  testWidgets(
    'CPI-D3 Nivel 2: un fallo del repositorio se muestra al usuario',
    (tester) async {
      configurarPantalla(tester);
      await tester.pumpWidget(
        CasaCampoApp(
          dependencias: Dependencias(
            casas: CasasStub(),
            clientes: ClientesStub(),
            reservas: ReservasStub(falla: true),
            usuarios: UsuariosLocales(),
            reloj: relojPruebas,
          ),
        ),
      );
      await _ingresar(tester);

      expect(find.text('No se pudieron cargar los datos.'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);
    },
  );

  testWidgets('CPI-D4 Nivel 3: stubs sustituidos por repositorios reales', (
    tester,
  ) async {
    configurarPantalla(tester);
    await tester.pumpWidget(CasaCampoApp(dependencias: crearDependencias()));
    await _ingresar(tester);

    expect(find.textContaining('Finca El Remanso'), findsWidgets);
    expect(find.textContaining('res-005'), findsOneWidget);

    await tester.tap(find.text('Casas'));
    await tester.pumpAndSettle();
    expect(find.text('Villa Manaure'), findsOneWidget);

    await tester.tap(find.byKey(const Key('boton-cerrar-sesion')));
    await tester.pumpAndSettle();
    expect(find.text('Ingresar'), findsOneWidget);
  });
}
