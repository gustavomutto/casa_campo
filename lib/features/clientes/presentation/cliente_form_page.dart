import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/clientes/domain/servicio_clientes.dart';
import 'package:flutter/material.dart';

class ClienteFormPage extends StatefulWidget {
  const ClienteFormPage({this.cliente, super.key});

  final Cliente? cliente;

  @override
  State<ClienteFormPage> createState() => _ClienteFormPageState();
}

class _ClienteFormPageState extends State<ClienteFormPage> {
  final _formulario = GlobalKey<FormState>();
  late final TextEditingController _documento;
  late final TextEditingController _nombre;
  late final TextEditingController _telefono;
  late final TextEditingController _correo;

  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final cliente = widget.cliente;
    _documento = TextEditingController(text: cliente?.documento);
    _nombre = TextEditingController(text: cliente?.nombreCompleto);
    _telefono = TextEditingController(text: cliente?.telefono);
    _correo = TextEditingController(text: cliente?.correo);
  }

  @override
  void dispose() {
    _documento.dispose();
    _nombre.dispose();
    _telefono.dispose();
    _correo.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    setState(() => _error = null);

    if (!_formulario.currentState!.validate()) {
      return;
    }

    final servicio = ProveedorDependencias.of(context).servicioClientes;
    final datos = DatosCliente(
      documento: _documento.text,
      nombreCompleto: _nombre.text,
      telefono: _telefono.text,
      correo: _correo.text,
    );

    setState(() => _guardando = true);

    try {
      final actual = widget.cliente;
      final cliente = actual == null
          ? await servicio.registrar(datos)
          : await servicio.actualizar(actual.id, datos);

      if (mounted) {
        Navigator.of(context).pop(cliente);
      }
    } on ErrorDeValidacion catch (e) {
      setState(() => _error = e.mensaje);
    } on ErrorDeNegocio catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) {
        setState(() => _guardando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final editando = widget.cliente != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(editando ? 'Editar cliente' : 'Nuevo cliente'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Form(
            key: _formulario,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextFormField(
                  key: const Key('campo-documento'),
                  controller: _documento,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Documento de identidad',
                  ),
                  validator: validarDocumento,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-nombre'),
                  controller: _nombre,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Nombre completo',
                  ),
                  validator: validarNombrePersona,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-telefono'),
                  controller: _telefono,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Teléfono'),
                  validator: validarTelefono,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-correo'),
                  controller: _correo,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico',
                  ),
                  validator: validarCorreo,
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(
                      _error!,
                      key: const Key('mensaje-error-cliente'),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  key: const Key('boton-guardar-cliente'),
                  onPressed: _guardando ? null : _guardar,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Guardar cliente'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
