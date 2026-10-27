import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/features/autenticacion/domain/usuario.dart';
import 'package:casa_campo/features/casas/presentation/casas_page.dart';
import 'package:casa_campo/features/clientes/presentation/clientes_page.dart';
import 'package:casa_campo/features/reportes/presentation/reportes_page.dart';
import 'package:casa_campo/features/reservas/presentation/disponibilidad_page.dart';
import 'package:casa_campo/features/reservas/presentation/reservas_page.dart';
import 'package:flutter/material.dart';

class _Seccion {
  const _Seccion(this.titulo, this.icono, this.iconoSeleccionado, this.pagina);

  final String titulo;
  final IconData icono;
  final IconData iconoSeleccionado;
  final Widget pagina;
}

/// Pantalla principal con navegación por secciones según el rol.
class InicioPage extends StatefulWidget {
  const InicioPage({required this.usuario, super.key});

  final Usuario usuario;

  @override
  State<InicioPage> createState() => _InicioPageState();
}

class _InicioPageState extends State<InicioPage> {
  int _indice = 0;

  List<_Seccion> get _secciones {
    return [
      const _Seccion(
        'Reservas',
        Icons.event_note_outlined,
        Icons.event_note,
        ReservasPage(),
      ),
      const _Seccion(
        'Disponibilidad',
        Icons.search_outlined,
        Icons.search,
        DisponibilidadPage(),
      ),
      const _Seccion(
        'Clientes',
        Icons.people_outline,
        Icons.people,
        ClientesPage(),
      ),
      if (widget.usuario.esAdministrador) ...[
        const _Seccion(
          'Casas',
          Icons.cottage_outlined,
          Icons.cottage,
          CasasPage(),
        ),
        const _Seccion(
          'Reportes',
          Icons.bar_chart_outlined,
          Icons.bar_chart,
          ReportesPage(),
        ),
      ],
    ];
  }

  @override
  Widget build(BuildContext context) {
    final secciones = _secciones;
    final seccion = secciones[_indice];

    return Scaffold(
      appBar: AppBar(
        title: Text(seccion.titulo),
        actions: [
          if (MediaQuery.sizeOf(context).width >= 600)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 280),
                  child: Text(
                    '${widget.usuario.nombreCompleto} · '
                    '${widget.usuario.rol.etiqueta}',
                    style: Theme.of(context).textTheme.labelMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          IconButton(
            key: const Key('boton-cerrar-sesion'),
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: () => ProveedorDependencias.of(context).sesion.cerrar(),
          ),
        ],
      ),
      body: KeyedSubtree(key: ValueKey(_indice), child: seccion.pagina),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _indice,
        onDestinationSelected: (indice) => setState(() => _indice = indice),
        destinations: [
          for (final s in secciones)
            NavigationDestination(
              icon: Icon(s.icono),
              selectedIcon: Icon(s.iconoSeleccionado),
              label: s.titulo,
            ),
        ],
      ),
    );
  }
}
