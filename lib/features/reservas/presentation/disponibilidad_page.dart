import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/app/widgets.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/reservas/domain/rango_fechas.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/presentation/reserva_form_page.dart';
import 'package:flutter/material.dart';

class _Resultado {
  const _Resultado(this.casa, this.valor);

  final Casa casa;
  final int valor;
}

/// Consulta de casas libres para un rango de fechas y número de huéspedes.
class DisponibilidadPage extends StatefulWidget {
  const DisponibilidadPage({super.key});

  @override
  State<DisponibilidadPage> createState() => _DisponibilidadPageState();
}

class _DisponibilidadPageState extends State<DisponibilidadPage> {
  final _formulario = GlobalKey<FormState>();
  final _entrada = TextEditingController();
  final _salida = TextEditingController();
  final _huespedes = TextEditingController(text: '2');

  List<_Resultado>? _resultados;
  RangoFechas? _rango;
  bool _buscando = false;

  @override
  void dispose() {
    _entrada.dispose();
    _salida.dispose();
    _huespedes.dispose();
    super.dispose();
  }

  Future<void> _buscar() async {
    if (!_formulario.currentState!.validate()) {
      return;
    }

    final entrada = leerFechaTexto(_entrada.text)!;
    final salida = leerFechaTexto(_salida.text)!;

    if (!salida.isAfter(entrada)) {
      mostrarMensaje(
        context,
        'La fecha de salida debe ser posterior a la de entrada.',
        error: true,
      );
      return;
    }

    final dependencias = ProveedorDependencias.of(context);
    final rango = RangoFechas(fechaEntrada: entrada, fechaSalida: salida);
    setState(() => _buscando = true);

    final casas = await dependencias.disponibilidad.casasDisponibles(
      rango,
      huespedes: int.parse(_huespedes.text.trim()),
    );
    final resultados = <_Resultado>[];

    for (final casa in casas) {
      resultados.add(
        _Resultado(
          casa,
          await dependencias.servicioReservas.cotizar(casa.id, rango),
        ),
      );
    }

    if (mounted) {
      setState(() {
        _rango = rango;
        _resultados = resultados;
        _buscando = false;
      });
    }
  }

  Future<void> _reservar(Casa casa) async {
    final rango = _rango!;
    final creada = await Navigator.of(context).push<Reserva>(
      MaterialPageRoute(
        builder: (_) => ReservaFormPage(
          casaId: casa.id,
          fechaEntrada: rango.fechaEntrada,
          fechaSalida: rango.fechaSalida,
          huespedes: int.tryParse(_huespedes.text.trim()),
        ),
      ),
    );

    if (creada != null && mounted) {
      mostrarMensaje(context, 'Reserva ${creada.id} registrada.');
      await _buscar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final resultados = _resultados;

    return ContenidoCentrado(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Form(
            key: _formulario,
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 210,
                  child: CampoFecha(
                    key: const Key('disp-fecha-entrada'),
                    controller: _entrada,
                    etiqueta: 'Fecha de entrada',
                  ),
                ),
                SizedBox(
                  width: 210,
                  child: CampoFecha(
                    key: const Key('disp-fecha-salida'),
                    controller: _salida,
                    etiqueta: 'Fecha de salida',
                  ),
                ),
                SizedBox(
                  width: 120,
                  child: TextFormField(
                    key: const Key('disp-huespedes'),
                    controller: _huespedes,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Huéspedes'),
                    validator: (v) => validarEnteroEnRango(
                      v,
                      'huéspedes',
                      minimo: 1,
                      maximo: 30,
                    ),
                  ),
                ),
                FilledButton.icon(
                  key: const Key('boton-buscar-disponibilidad'),
                  onPressed: _buscando ? null : _buscar,
                  icon: const Icon(Icons.search),
                  label: const Text('Buscar'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_buscando)
            const Center(child: CircularProgressIndicator())
          else if (resultados == null)
            const MensajeVacio(
              icono: Icons.date_range,
              texto: 'Indique las fechas y la cantidad de huéspedes.',
            )
          else if (resultados.isEmpty)
            const MensajeVacio(
              icono: Icons.event_busy,
              texto: 'No hay casas disponibles para esas fechas.',
            )
          else ...[
            Text(
              '${resultados.length} casa(s) disponible(s) · '
              '${_rango!.cantidadNoches} noche(s)',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            for (final resultado in resultados)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.cottage_outlined),
                  title: Text(resultado.casa.nombre),
                  subtitle: Text(
                    '${resultado.casa.municipio} · '
                    'Capacidad ${resultado.casa.capacidadMaxima} · '
                    '${formatearPesos(resultado.casa.precioNoche)} por noche\n'
                    'Valor de la estadía: ${formatearPesos(resultado.valor)}',
                  ),
                  isThreeLine: true,
                  trailing: TextButton(
                    onPressed: () => _reservar(resultado.casa),
                    child: const Text('Reservar'),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
