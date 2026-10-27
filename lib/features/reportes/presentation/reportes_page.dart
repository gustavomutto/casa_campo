import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/reportes/domain/servicio_reportes.dart';
import 'package:flutter/material.dart';

const _meses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

class ReportesPage extends StatefulWidget {
  const ReportesPage({super.key});

  @override
  State<ReportesPage> createState() => _ReportesPageState();
}

class _ReportesPageState extends State<ReportesPage> {
  late int _anio;
  late int _mes;
  Future<ResumenReportes>? _resumen;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_resumen == null) {
      final hoy = ProveedorDependencias.of(context).reloj();
      _anio = hoy.year;
      _mes = hoy.month;
      _resumen = _cargar();
    }
  }

  Future<ResumenReportes> _cargar() {
    return ProveedorDependencias.of(context).reportes
        .generar(anio: _anio, mes: _mes);
  }

  void _moverMes(int delta) {
    setState(() {
      final fecha = DateTime(_anio, _mes + delta);
      _anio = fecha.year;
      _mes = fecha.month;
      _resumen = _cargar();
    });
  }

  @override
  Widget build(BuildContext context) {
    return ContenidoCentrado(
      child: FutureBuilder<ResumenReportes>(
        future: _resumen,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return MensajeError(
              error: snapshot.error,
              alReintentar: () => _moverMes(0),
            );
          }

          final resumen = snapshot.data!;
          final tema = Theme.of(context);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _Indicador(
                    titulo: 'Reservas registradas',
                    valor: '${resumen.totalReservas}',
                    icono: Icons.event_note,
                  ),
                  _Indicador(
                    titulo: 'Ingresos recaudados',
                    valor: formatearPesos(resumen.ingresosRecaudados),
                    icono: Icons.savings_outlined,
                  ),
                  _Indicador(
                    titulo: 'Ingresos proyectados',
                    valor: formatearPesos(resumen.ingresosProyectados),
                    icono: Icons.trending_up,
                  ),
                  _Indicador(
                    titulo: 'Saldo por cobrar',
                    valor: formatearPesos(resumen.saldoPorCobrar),
                    icono: Icons.account_balance_wallet_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text('Reservas por estado', style: tema.textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final entrada in resumen.reservasPorEstado.entries)
                    Chip(label: Text('${entrada.key}: ${entrada.value}')),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Ocupación · ${_meses[_mes - 1]} $_anio',
                      style: tema.textTheme.titleMedium,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Mes anterior',
                    icon: const Icon(Icons.chevron_left),
                    onPressed: () => _moverMes(-1),
                  ),
                  IconButton(
                    tooltip: 'Mes siguiente',
                    icon: const Icon(Icons.chevron_right),
                    onPressed: () => _moverMes(1),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              for (final ocupacion in resumen.ocupacion)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${ocupacion.casa.nombre} · '
                        '${ocupacion.nochesOcupadas}/${ocupacion.diasDelMes} '
                        'noches (${ocupacion.porcentaje.toStringAsFixed(1)} %)',
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: ocupacion.porcentaje / 100,
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Indicador extends StatelessWidget {
  const _Indicador({
    required this.titulo,
    required this.valor,
    required this.icono,
  });

  final String titulo;
  final String valor;
  final IconData icono;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);

    return SizedBox(
      width: 200,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icono, color: tema.colorScheme.primary),
              const SizedBox(height: 8),
              Text(titulo, style: tema.textTheme.bodySmall),
              Text(valor, style: tema.textTheme.titleLarge),
            ],
          ),
        ),
      ),
    );
  }
}
