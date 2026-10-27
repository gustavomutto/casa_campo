import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/presentation/reserva_detalle_page.dart';
import 'package:casa_campo/features/reservas/presentation/reserva_form_page.dart';
import 'package:flutter/material.dart';

class _DatosReservas {
  const _DatosReservas(this.reservas, this.casas);

  final List<Reserva> reservas;
  final Map<String, Casa> casas;
}

class ReservasPage extends StatefulWidget {
  const ReservasPage({super.key});

  @override
  State<ReservasPage> createState() => _ReservasPageState();
}

class _ReservasPageState extends State<ReservasPage> {
  static const _filtros = <String?, String>{
    null: 'Todas',
    'pendiente': 'Pendientes',
    'confirmada': 'Confirmadas',
    'en_curso': 'En curso',
    'finalizada': 'Finalizadas',
    'cancelada': 'Canceladas',
  };

  Future<_DatosReservas>? _datos;
  String? _filtro;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _datos ??= _cargar();
  }

  Future<_DatosReservas> _cargar() async {
    final dependencias = ProveedorDependencias.of(context);
    final reservas = await dependencias.servicioReservas.listar(
      tipoEstado: _filtro,
    );
    final casas = await dependencias.servicioCasas.listar();

    return _DatosReservas(reservas, {for (final c in casas) c.id: c});
  }

  void _recargar() {
    setState(() => _datos = _cargar());
  }

  Future<void> _nuevaReserva() async {
    final creada = await Navigator.of(
      context,
    ).push<Reserva>(MaterialPageRoute(builder: (_) => const ReservaFormPage()));

    if (creada != null && mounted) {
      mostrarMensaje(context, 'Reserva ${creada.id} registrada.');
      _recargar();
    }
  }

  Future<void> _abrirDetalle(Reserva reserva) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => ReservaDetallePage(reservaId: reserva.id),
      ),
    );

    if (mounted) {
      _recargar();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('boton-nueva-reserva'),
        onPressed: _nuevaReserva,
        icon: const Icon(Icons.add),
        label: const Text('Nueva reserva'),
      ),
      body: ContenidoCentrado(
        child: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                children: [
                  for (final filtro in _filtros.entries)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(filtro.value),
                        selected: _filtro == filtro.key,
                        onSelected: (_) {
                          _filtro = filtro.key;
                          _recargar();
                        },
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<_DatosReservas>(
                future: _datos,
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

                  final datos = snapshot.data!;

                  if (datos.reservas.isEmpty) {
                    return const MensajeVacio(
                      icono: Icons.event_busy,
                      texto: 'No hay reservas para mostrar.',
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async => _recargar(),
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                      itemCount: datos.reservas.length,
                      itemBuilder: (context, index) {
                        final reserva = datos.reservas[index];

                        return ReservaCard(
                          reserva: reserva,
                          nombreCasa:
                              datos.casas[reserva.casaId]?.nombre ??
                              reserva.casaId,
                          alTocar: () => _abrirDetalle(reserva),
                        );
                      },
                    ),
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

class ReservaCard extends StatelessWidget {
  const ReservaCard({
    required this.reserva,
    required this.nombreCasa,
    this.alTocar,
    super.key,
  });

  final Reserva reserva;
  final String nombreCasa;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) {
    final rango = reserva.rangoFechas;
    final tema = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.home_outlined),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$nombreCasa · ${reserva.id}',
                      style: tema.textTheme.titleMedium,
                    ),
                  ),
                  EstadoChip(estado: reserva.estado),
                ],
              ),
              const SizedBox(height: 12),
              Text('Cliente: ${reserva.clienteNombre}'),
              const SizedBox(height: 4),
              Text(
                'Del ${formatearFecha(rango.fechaEntrada)} al '
                '${formatearFecha(rango.fechaSalida)} · '
                '${rango.cantidadNoches} noche(s) · '
                '${reserva.cantidadHuespedes} huésped(es)',
              ),
              const SizedBox(height: 4),
              Text(
                'Total: ${formatearPesos(reserva.montoTotal)} · '
                'Saldo: ${formatearPesos(reserva.saldoPendiente)}',
                style: tema.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
