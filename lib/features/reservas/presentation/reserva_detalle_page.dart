import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/pago.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:flutter/material.dart';

class ReservaDetallePage extends StatefulWidget {
  const ReservaDetallePage({required this.reservaId, super.key});

  final String reservaId;

  @override
  State<ReservaDetallePage> createState() => _ReservaDetallePageState();
}

class _ReservaDetallePageState extends State<ReservaDetallePage> {
  late Dependencias _dependencias;
  Future<(Reserva?, String)>? _datos;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _dependencias = ProveedorDependencias.of(context);
    _datos ??= _cargar();
  }

  Future<(Reserva?, String)> _cargar() async {
    final reserva = await _dependencias.servicioReservas.obtener(
      widget.reservaId,
    );
    final casa = reserva == null
        ? null
        : await _dependencias.servicioCasas.obtener(reserva.casaId);

    return (reserva, casa?.nombre ?? reserva?.casaId ?? '');
  }

  void _recargar() {
    setState(() => _datos = _cargar());
  }

  Future<void> _ejecutar(
    Future<Reserva> Function() accion,
    String exito,
  ) async {
    try {
      await accion();

      if (mounted) {
        mostrarMensaje(context, exito);
        _recargar();
      }
    } on ErrorDeValidacion catch (e) {
      if (mounted) {
        mostrarMensaje(context, e.mensaje, error: true);
      }
    } on ErrorDeNegocio catch (e) {
      if (mounted) {
        mostrarMensaje(context, e.mensaje, error: true);
      }
    }
  }

  Future<void> _registrarPago(Reserva reserva) async {
    final resultado = await showDialog<(int, MetodoPago)>(
      context: context,
      builder: (_) => _DialogoPago(saldo: reserva.saldoPendiente),
    );

    if (resultado == null) {
      return;
    }

    final (monto, metodo) = resultado;

    await _ejecutar(
      () => _dependencias.servicioReservas.registrarPago(
        reserva.id,
        monto: monto,
        metodo: metodo,
      ),
      'Pago de ${formatearPesos(monto)} registrado.',
    );
  }

  Future<void> _cancelar(Reserva reserva) async {
    final motivo = await showDialog<String>(
      context: context,
      builder: (_) => const _DialogoCancelacion(),
    );

    if (motivo == null) {
      return;
    }

    await _ejecutar(
      () => _dependencias.servicioReservas.cancelar(reserva.id, motivo: motivo),
      'Reserva cancelada.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Reserva ${widget.reservaId}')),
      body: FutureBuilder<(Reserva?, String)>(
        future: _datos,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return MensajeError(error: snapshot.error, alReintentar: _recargar);
          }

          final (reserva, nombreCasa) = snapshot.data!;

          if (reserva == null) {
            return const MensajeVacio(
              icono: Icons.search_off,
              texto: 'La reserva no existe.',
            );
          }

          return ContenidoCentrado(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _InformacionReserva(reserva: reserva, nombreCasa: nombreCasa),
                const SizedBox(height: 16),
                _Acciones(
                  reserva: reserva,
                  alPagar: () => _registrarPago(reserva),
                  alConfirmar: () => _ejecutar(
                    () => _dependencias.servicioReservas.confirmar(
                      reserva.id,
                      usuario:
                          _dependencias.sesion.usuario?.nombreUsuario ??
                          'sistema',
                    ),
                    'Reserva confirmada.',
                  ),
                  alIniciar: () => _ejecutar(
                    () => _dependencias.servicioReservas.iniciarEstadia(
                      reserva.id,
                    ),
                    'Estadía iniciada.',
                  ),
                  alFinalizar: () => _ejecutar(
                    () => _dependencias.servicioReservas.finalizar(reserva.id),
                    'Reserva finalizada.',
                  ),
                  alCancelar: () => _cancelar(reserva),
                ),
                const SizedBox(height: 16),
                _ListaPagos(reserva: reserva),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InformacionReserva extends StatelessWidget {
  const _InformacionReserva({required this.reserva, required this.nombreCasa});

  final Reserva reserva;
  final String nombreCasa;

  @override
  Widget build(BuildContext context) {
    final rango = reserva.rangoFechas;
    final estado = reserva.estado;

    Widget fila(String etiqueta, String valor) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 150,
              child: Text(
                etiqueta,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            Expanded(child: Text(valor)),
          ],
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    nombreCasa,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                EstadoChip(estado: estado),
              ],
            ),
            const Divider(height: 24),
            fila('Cliente', reserva.clienteNombre),
            fila('Entrada', formatearFecha(rango.fechaEntrada)),
            fila('Salida', formatearFecha(rango.fechaSalida)),
            fila('Noches', '${rango.cantidadNoches}'),
            fila('Huéspedes', '${reserva.cantidadHuespedes}'),
            fila('Valor total', formatearPesos(reserva.montoTotal)),
            fila('Pagado', formatearPesos(reserva.totalPagado)),
            fila('Saldo pendiente', formatearPesos(reserva.saldoPendiente)),
            if (estado is Confirmada)
              fila('Confirmada por', estado.confirmadaPor),
            if (estado is Cancelada) fila('Motivo', estado.motivo),
          ],
        ),
      ),
    );
  }
}

class _Acciones extends StatelessWidget {
  const _Acciones({
    required this.reserva,
    required this.alPagar,
    required this.alConfirmar,
    required this.alIniciar,
    required this.alFinalizar,
    required this.alCancelar,
  });

  final Reserva reserva;
  final VoidCallback alPagar;
  final VoidCallback alConfirmar;
  final VoidCallback alIniciar;
  final VoidCallback alFinalizar;
  final VoidCallback alCancelar;

  @override
  Widget build(BuildContext context) {
    final estado = reserva.estado;
    final botones = <Widget>[
      if (estado.esActiva && reserva.saldoPendiente > 0)
        FilledButton.tonalIcon(
          key: const Key('boton-registrar-pago'),
          onPressed: alPagar,
          icon: const Icon(Icons.attach_money),
          label: const Text('Registrar pago'),
        ),
      if (estado is Pendiente)
        FilledButton.icon(
          key: const Key('boton-confirmar'),
          onPressed: alConfirmar,
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('Confirmar'),
        ),
      if (estado is Confirmada)
        FilledButton.icon(
          key: const Key('boton-iniciar'),
          onPressed: alIniciar,
          icon: const Icon(Icons.login),
          label: const Text('Iniciar estadía'),
        ),
      if (estado is EnCurso)
        FilledButton.icon(
          key: const Key('boton-finalizar'),
          onPressed: alFinalizar,
          icon: const Icon(Icons.flag_outlined),
          label: const Text('Finalizar'),
        ),
      if (estado is Pendiente || estado is Confirmada)
        OutlinedButton.icon(
          key: const Key('boton-cancelar-reserva'),
          onPressed: alCancelar,
          icon: const Icon(Icons.cancel_outlined),
          label: const Text('Cancelar reserva'),
        ),
    ];

    if (botones.isEmpty) {
      return const SizedBox.shrink();
    }

    return Wrap(spacing: 8, runSpacing: 8, children: botones);
  }
}

class _ListaPagos extends StatelessWidget {
  const _ListaPagos({required this.reserva});

  final Reserva reserva;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pagos', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (reserva.pagos.isEmpty)
              const Text('Aún no se han registrado pagos.')
            else
              for (final pago in reserva.pagos)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: Text(formatearPesos(pago.monto)),
                  subtitle: Text(
                    '${pago.metodo.etiqueta} · ${formatearFecha(pago.fecha)}',
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _DialogoPago extends StatefulWidget {
  const _DialogoPago({required this.saldo});

  final int saldo;

  @override
  State<_DialogoPago> createState() => _DialogoPagoState();
}

class _DialogoPagoState extends State<_DialogoPago> {
  final _formulario = GlobalKey<FormState>();
  final _monto = TextEditingController();
  MetodoPago _metodo = MetodoPago.transferencia;

  @override
  void dispose() {
    _monto.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Registrar pago'),
      content: Form(
        key: _formulario,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Saldo pendiente: ${formatearPesos(widget.saldo)}'),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('campo-monto'),
              controller: _monto,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Monto'),
              validator: (valor) {
                final monto = int.tryParse(valor?.trim() ?? '');

                if (monto == null) {
                  return 'Ingrese un valor entero.';
                }

                return null;
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<MetodoPago>(
              key: const Key('campo-metodo'),
              initialValue: _metodo,
              decoration: const InputDecoration(labelText: 'Método de pago'),
              items: [
                for (final metodo in MetodoPago.values)
                  DropdownMenuItem(value: metodo, child: Text(metodo.etiqueta)),
              ],
              onChanged: (valor) {
                if (valor != null) {
                  _metodo = valor;
                }
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cerrar'),
        ),
        FilledButton(
          key: const Key('boton-guardar-pago'),
          onPressed: () {
            if (_formulario.currentState!.validate()) {
              Navigator.of(context)
                  .pop((int.parse(_monto.text.trim()), _metodo));
            }
          },
          child: const Text('Guardar pago'),
        ),
      ],
    );
  }
}

class _DialogoCancelacion extends StatefulWidget {
  const _DialogoCancelacion();

  @override
  State<_DialogoCancelacion> createState() => _DialogoCancelacionState();
}

class _DialogoCancelacionState extends State<_DialogoCancelacion> {
  final _motivo = TextEditingController();

  @override
  void dispose() {
    _motivo.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Cancelar reserva'),
      content: TextField(
        key: const Key('campo-motivo'),
        controller: _motivo,
        maxLines: 2,
        decoration: const InputDecoration(labelText: 'Motivo de cancelación'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Volver'),
        ),
        FilledButton(
          key: const Key('boton-confirmar-cancelacion'),
          onPressed: () => Navigator.of(context).pop(_motivo.text),
          child: const Text('Confirmar cancelación'),
        ),
      ],
    );
  }
}
