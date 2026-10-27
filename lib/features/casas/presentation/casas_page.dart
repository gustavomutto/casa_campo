import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/presentation/casa_form_page.dart';
import 'package:flutter/material.dart';

class CasasPage extends StatefulWidget {
  const CasasPage({super.key});

  @override
  State<CasasPage> createState() => _CasasPageState();
}

class _CasasPageState extends State<CasasPage> {
  Future<List<Casa>>? _casas;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _casas ??= _cargar();
  }

  Future<List<Casa>> _cargar() {
    return ProveedorDependencias.of(context).servicioCasas.listar();
  }

  void _recargar() {
    setState(() {
      _casas = _cargar();
    });
  }

  Future<void> _abrirFormulario([Casa? casa]) async {
    final guardada = await Navigator.of(
      context,
    ).push<Casa>(MaterialPageRoute(builder: (_) => CasaFormPage(casa: casa)));

    if (guardada != null && mounted) {
      mostrarMensaje(context, 'Casa ${guardada.nombre} guardada.');
      _recargar();
    }
  }

  Future<void> _cambiarEstado(Casa casa, bool activa) async {
    final servicio = ProveedorDependencias.of(context).servicioCasas;

    try {
      await servicio.cambiarEstado(casa.id, activa: activa);

      if (mounted) {
        mostrarMensaje(
          context,
          activa ? 'Casa activada.' : 'Casa desactivada.',
        );
        _recargar();
      }
    } on ErrorDeNegocio catch (e) {
      if (mounted) {
        mostrarMensaje(context, e.mensaje, error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('boton-nueva-casa'),
        onPressed: _abrirFormulario,
        icon: const Icon(Icons.add_home_outlined),
        label: const Text('Nueva casa'),
      ),
      body: ContenidoCentrado(
        child: FutureBuilder<List<Casa>>(
          future: _casas,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return MensajeError(
                error: snapshot.error,
                alReintentar: _recargar,
              );
            }

            final casas = snapshot.data!;

            if (casas.isEmpty) {
              return const MensajeVacio(
                icono: Icons.cottage_outlined,
                texto: 'No hay casas registradas.',
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: casas.length,
              itemBuilder: (context, index) {
                final casa = casas[index];

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    leading: Icon(
                      Icons.cottage,
                      color: casa.activa
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.outline,
                    ),
                    title: Text(casa.nombre),
                    subtitle: Text(
                      '${casa.municipio} · Capacidad ${casa.capacidadMaxima} · '
                      '${formatearPesos(casa.precioNoche)} por noche'
                      '${casa.activa ? '' : ' · Inactiva'}',
                    ),
                    onTap: () => _abrirFormulario(casa),
                    trailing: Switch(
                      value: casa.activa,
                      onChanged: (valor) => _cambiarEstado(casa, valor),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
