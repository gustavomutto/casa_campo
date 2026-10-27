import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/inicio_page.dart';
import 'package:casa_campo/features/autenticacion/presentation/login_page.dart';
import 'package:flutter/material.dart';

class CasaCampoApp extends StatelessWidget {
  const CasaCampoApp({required this.dependencias, super.key});

  final Dependencias dependencias;

  @override
  Widget build(BuildContext context) {
    return ProveedorDependencias(
      dependencias: dependencias,
      child: MaterialApp(
        title: 'Casa Campo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D32)),
          fontFamily: 'Roboto',
          useMaterial3: true,
          inputDecorationTheme: const InputDecorationTheme(
            border: OutlineInputBorder(),
          ),
        ),
        home: ListenableBuilder(
          listenable: dependencias.sesion,
          builder: (context, _) {
            final usuario = dependencias.sesion.usuario;

            if (usuario == null) {
              return const LoginPage();
            }

            return InicioPage(key: ValueKey(usuario.id), usuario: usuario);
          },
        ),
      ),
    );
  }
}
