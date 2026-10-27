import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/clientes/presentation/cliente_form_page.dart';
import 'package:flutter/material.dart';

class ClientesPage extends StatefulWidget {
  const ClientesPage({super.key});

  @override
  State<ClientesPage> createState() => _ClientesPageState();
}

class _ClientesPageState extends State<ClientesPage> {
  final _busqueda = TextEditingController();
  Future<List<Cliente>>? _clientes;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _clientes ??= _cargar();
  }

  @override
  void dispose() {
    _busqueda.dispose();
    super.dispose();
  }

  Future<List<Cliente>> _cargar() {
    return ProveedorDependencias.of(context).servicioClientes
        .listar(filtro: _busqueda.text);
  }

  void _recargar() {
    setState(() {
      _clientes = _cargar();
    });
  }

  Future<void> _abrirFormulario([Cliente? cliente]) async {
    final guardado = await Navigator.of(context).push<Cliente>(
      MaterialPageRoute(builder: (_) => ClienteFormPage(cliente: cliente)),
    );

    if (guardado != null && mounted) {
      mostrarMensaje(
        context,
        cliente == null
            ? 'Cliente ${guardado.nombreCompleto} registrado.'
            : 'Cliente actualizado.',
      );
      _recargar();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('boton-nuevo-cliente'),
        onPressed: _abrirFormulario,
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Nuevo cliente'),
      ),
      body: ContenidoCentrado(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                key: const Key('campo-buscar-cliente'),
                controller: _busqueda,
                decoration: const InputDecoration(
                  labelText: 'Buscar por nombre o documento',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) => _recargar(),
              ),
            ),
            Expanded(
              child: FutureBuilder<List<Cliente>>(
                future: _clientes,
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

                  final clientes = snapshot.data!;

                  if (clientes.isEmpty) {
                    return const MensajeVacio(
                      icono: Icons.person_search,
                      texto: 'No se encontraron clientes.',
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                    itemCount: clientes.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final cliente = clientes[index];

                      return ListTile(
                        leading: CircleAvatar(
                          child: Text(cliente.nombreCompleto[0].toUpperCase()),
                        ),
                        title: Text(cliente.nombreCompleto),
                        subtitle: Text(
                          'CC ${cliente.documento} · ${cliente.telefono} · '
                          '${cliente.correo}',
                        ),
                        trailing: const Icon(Icons.edit_outlined),
                        onTap: () => _abrirFormulario(cliente),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
