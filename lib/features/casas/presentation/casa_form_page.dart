import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/servicio_casas.dart';
import 'package:flutter/material.dart';

class CasaFormPage extends StatefulWidget {
  const CasaFormPage({this.casa, super.key});

  final Casa? casa;

  @override
  State<CasaFormPage> createState() => _CasaFormPageState();
}

class _CasaFormPageState extends State<CasaFormPage> {
  final _formulario = GlobalKey<FormState>();
  late final TextEditingController _nombre;
  late final TextEditingController _municipio;
  late final TextEditingController _capacidad;
  late final TextEditingController _precio;
  late final TextEditingController _descripcion;

  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final casa = widget.casa;
    _nombre = TextEditingController(text: casa?.nombre);
    _municipio = TextEditingController(text: casa?.municipio);
    _capacidad = TextEditingController(text: casa?.capacidadMaxima.toString());
    _precio = TextEditingController(text: casa?.precioNoche.toString());
    _descripcion = TextEditingController(text: casa?.descripcion);
  }

  @override
  void dispose() {
    _nombre.dispose();
    _municipio.dispose();
    _capacidad.dispose();
    _precio.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    setState(() => _error = null);

    if (!_formulario.currentState!.validate()) {
      return;
    }

    final servicio = ProveedorDependencias.of(context).servicioCasas;
    final datos = DatosCasa(
      nombre: _nombre.text,
      municipio: _municipio.text,
      capacidadMaxima: _capacidad.text,
      precioNoche: _precio.text,
      descripcion: _descripcion.text,
    );

    setState(() => _guardando = true);

    try {
      final actual = widget.casa;
      final casa = actual == null
          ? await servicio.crear(datos)
          : await servicio.actualizar(actual.id, datos);

      if (mounted) {
        Navigator.of(context).pop(casa);
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
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.casa == null ? 'Nueva casa' : 'Editar casa'),
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
                  key: const Key('campo-nombre-casa'),
                  controller: _nombre,
                  decoration: const InputDecoration(labelText: 'Nombre'),
                  validator: validarNombreCasa,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-municipio'),
                  controller: _municipio,
                  decoration: const InputDecoration(labelText: 'Municipio'),
                  validator: (v) => validarRequerido(v, 'municipio'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-capacidad'),
                  controller: _capacidad,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Capacidad máxima (personas)',
                  ),
                  validator: (v) => validarEnteroEnRango(
                    v,
                    'capacidad',
                    minimo: ServicioCasas.capacidadMinima,
                    maximo: ServicioCasas.capacidadMaxima,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-precio'),
                  controller: _precio,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Precio por noche (COP)',
                  ),
                  validator: (v) => validarEnteroEnRango(
                    v,
                    'precio por noche',
                    minimo: ServicioCasas.precioMinimo,
                    maximo: ServicioCasas.precioMaximo,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('campo-descripcion'),
                  controller: _descripcion,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Descripción'),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(
                      _error!,
                      key: const Key('mensaje-error-casa'),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  key: const Key('boton-guardar-casa'),
                  onPressed: _guardando ? null : _guardar,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Guardar casa'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
