import 'package:flutter/material.dart';

import 'features/reservas/data/reservas_locales.dart';

import 'features/reservas/domain/reserva.dart';

void main() {
  runApp(const CasaCampoApp());
}

class CasaCampoApp extends StatelessWidget {
  const CasaCampoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Casa Campo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const ReservasPage(),
    );
  }
}

class ReservasPage extends StatefulWidget {
  const ReservasPage({super.key});

  @override
  State<ReservasPage> createState() => _ReservasPageState();
}

class _ReservasPageState extends State<ReservasPage> {
  late final ReservasLocales _repositorio;

  Future<List<Reserva>>? _reservasFuture;

  @override
  void initState() {
    super.initState();

    _repositorio = ReservasLocales();
    _reservasFuture = _repositorio.obtenerTodos();
  }

  Future<void> _recargar() async {
    setState(() {
      _reservasFuture = _repositorio.obtenerTodos();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Casa Campo'), centerTitle: true),
      body: FutureBuilder<List<Reserva>>(
        future: _reservasFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48),
                    const SizedBox(height: 16),
                    Text(
                      'No se pudieron cargar las reservas.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text('${snapshot.error}', textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _recargar,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final reservas = snapshot.data ?? [];

          if (reservas.isEmpty) {
            return const Center(child: Text('No hay reservas registradas.'));
          }

          return RefreshIndicator(
            onRefresh: _recargar,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: reservas.length,
              itemBuilder: (context, index) {
                final reserva = reservas[index];

                return ReservaCard(reserva: reserva);
              },
            ),
          );
        },
      ),
    );
  }
}

class ReservaCard extends StatelessWidget {
  const ReservaCard({required this.reserva, super.key});

  final Reserva reserva;

  @override
  Widget build(BuildContext context) {
    final rango = reserva.rangoFechas;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
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
                    reserva.casaId,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Chip(label: Text(reserva.estado.etiqueta)),
              ],
            ),
            const SizedBox(height: 12),
            Text('Cliente: ${reserva.clienteNombre}'),
            const SizedBox(height: 6),
            Text('Entrada: ${_formatearFecha(rango.fechaEntrada)}'),
            Text('Salida: ${_formatearFecha(rango.fechaSalida)}'),
            const SizedBox(height: 6),
            Text('Noches: ${rango.cantidadNoches}'),
          ],
        ),
      ),
    );
  }

  String _formatearFecha(DateTime fecha) {
    final dia = fecha.day.toString().padLeft(2, '0');
    final mes = fecha.month.toString().padLeft(2, '0');

    return '$dia/$mes/${fecha.year}';
  }
}
