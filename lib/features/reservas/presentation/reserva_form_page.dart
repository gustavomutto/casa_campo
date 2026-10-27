import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/servicio_reservas.dart';
import 'package:flutter/material.dart';

class ReservaFormPage extends StatefulWidget {
  const ReservaFormPage({
    this.casaId,
    this.fechaEntrada,
    this.fechaSalida,
    this.huespedes,
    super.key,
  });

  final String? casaId;
  final DateTime? fechaEntrada;
  final DateTime? fechaSalida;
  final int? huespedes;

  @override
  State<ReservaFormPage> createState() => _ReservaFormPageState();
}

class _ReservaFormPageState extends State<ReservaFormPage> {
  final _formulario = GlobalKey<FormState>();
  late final TextEditingController _entrada;
  late final TextEditingController _salida;
  late final TextEditingController _huespedes;

  late Dependencias _dependencias;
  Future<(List<Casa>, List<Cliente>)>? _opciones;
  String? _casaId;
  String? _clienteId;
  int? _cotizacion;
  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _casaId = widget.casaId;
    _entrada = TextEditingController(
      text: widget.fechaEntrada == null
          ? ''
          : formatearFecha(widget.fechaEntrada!),
    );
    _salida = TextEditingController(
      text: widget.fechaSalida == null
          ? ''
          : formatearFecha(widget.fechaSalida!),
    );
    _huespedes = TextEditingController(
      text: widget.huespedes?.toString() ?? '',
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_opciones == null) {
      final dependencias = ProveedorDependencias.of(context);
      _dependencias = dependencias;
      _opciones = () async {
        final casas = await dependencias.servicioCasas.listar(
          soloActivas: true,
        );
        final clientes = await dependencias.servicioClientes.listar();

        return (casas, clientes);
      }();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _actualizarCotizacion();
        }
      });
    }
  }

  @override
  void dispose() {
    _entrada.dispose();
    _salida.dispose();
    _huespedes.dispose();
    super.dispose();
  }

  Future<void> _actualizarCotizacion() async {
    final entrada = leerFechaTexto(_entrada.text);
    final salida = leerFechaTexto(_salida.text);
    final casaId = _casaId;

    if (casaId == null ||
        entrada == null ||
        salida == null ||
        !salida.isAfter(entrada)) {
      setState(() => _cotizacion = null);
      return;
    }

    try {
      final valor = await _dependencias.servicioReservas.cotizar(
        casaId,
        RangoFechas(fechaEntrada: entrada, fechaSalida: salida),
      );

      if (mounted) {
        setState(() => _cotizacion = valor);
      }
    } on ErrorDeNegocio {
      if (mounted) {
        setState(() => _cotizacion = null);
      }
    }
  }

  Future<void> _guardar() async {
    setState(() => _error = null);

    if (!_formulario.currentState!.validate()) {
      return;
    }

    setState(() => _guardando = true);

    try {
      final reserva = await _dependencias.servicioReservas.crearReserva(
        SolicitudReserva(
          casaId: _casaId!,
          clienteId: _clienteId!,
          fechaEntrada: leerFechaTexto(_entrada.text)!,
          fechaSalida: leerFechaTexto(_salida.text)!,
          cantidadHuespedes: int.parse(_huespedes.text.trim()),
        ),
      );

      if (mounted) {
        Navigator.of(context).pop(reserva);
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
      appBar: AppBar(title: const Text('Nueva reserva')),
      body: FutureBuilder<(List<Casa>, List<Cliente>)>(
        future: _opciones,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return MensajeError(
              error: snapshot.error,
              alReintentar: () => Navigator.of(context).pop(),
            );
          }

          final (casas, clientes) = snapshot.data!;

          return ContenidoCentrado(
            child: Form(
              key: _formulario,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  DropdownButtonFormField<String>(
                    key: const Key('campo-casa'),
                    initialValue: _casaId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Casa'),
                    items: [
                      for (final casa in casas)
                        DropdownMenuItem(
                          value: casa.id,
                          child: Text(
                            '${casa.nombre} (máx. ${casa.capacidadMaxima})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    validator: (v) => v == null ? 'Seleccione una casa.' : null,
                    onChanged: (valor) {
                      _casaId = valor;
                      _actualizarCotizacion();
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    key: const Key('campo-cliente'),
                    initialValue: _clienteId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Cliente'),
                    items: [
                      for (final cliente in clientes)
                        DropdownMenuItem(
                          value: cliente.id,
                          child: Text(
                            '${cliente.nombreCompleto} · ${cliente.documento}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    validator: (v) =>
                        v == null ? 'Seleccione un cliente.' : null,
                    onChanged: (valor) => _clienteId = valor,
                  ),
                  const SizedBox(height: 16),
                  CampoFecha(
                    key: const Key('campo-fecha-entrada'),
                    controller: _entrada,
                    etiqueta: 'Fecha de entrada',
                    alCambiar: _actualizarCotizacion,
                  ),
                  const SizedBox(height: 16),
                  CampoFecha(
                    key: const Key('campo-fecha-salida'),
                    controller: _salida,
                    etiqueta: 'Fecha de salida',
                    alCambiar: _actualizarCotizacion,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    key: const Key('campo-huespedes'),
                    controller: _huespedes,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Cantidad de huéspedes',
                    ),
                    validator: (valor) {
                      if (valor == null || int.tryParse(valor.trim()) == null) {
                        return 'Ingrese un número entero.';
                      }

                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  if (_cotizacion != null)
                    Card(
                      color: Theme.of(context).colorScheme.secondaryContainer,
                      child: ListTile(
                        leading: const Icon(Icons.payments_outlined),
                        title: Text(
                          'Valor de la estadía: ${formatearPesos(_cotizacion!)}',
                        ),
                        subtitle: const Text(
                          'Incluye recargo de temporada alta y descuento por '
                          'estadías de 7 noches o más, si aplican.',
                        ),
                      ),
                    ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _error!,
                        key: const Key('mensaje-error-reserva'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    key: const Key('boton-guardar-reserva'),
                    onPressed: _guardando ? null : _guardar,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Guardar reserva'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
