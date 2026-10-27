/// Componentes visuales reutilizados por varias pantallas.
library;

import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:flutter/material.dart';

void mostrarMensaje(BuildContext context, String texto, {bool error = false}) {
  final esquema = Theme.of(context).colorScheme;

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(texto),
        backgroundColor: error ? esquema.error : null,
        behavior: SnackBarBehavior.floating,
      ),
    );
}

/// Limita el ancho del contenido en pantallas grandes.
class ContenidoCentrado extends StatelessWidget {
  const ContenidoCentrado({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: child,
      ),
    );
  }
}

class MensajeVacio extends StatelessWidget {
  const MensajeVacio({required this.icono, required this.texto, super.key});

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono, size: 48, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 12),
            Text(texto, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class MensajeError extends StatelessWidget {
  const MensajeError({
    required this.error,
    required this.alReintentar,
    super.key,
  });

  final Object? error;
  final VoidCallback alReintentar;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 16),
            Text(
              'No se pudieron cargar los datos.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text('$error', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: alReintentar,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

class EstadoChip extends StatelessWidget {
  const EstadoChip({required this.estado, super.key});

  final EstadoReserva estado;

  @override
  Widget build(BuildContext context) {
    final color = switch (estado) {
      Pendiente() => Colors.orange.shade800,
      Confirmada() => Colors.green.shade800,
      EnCurso() => Colors.blue.shade800,
      Finalizada() => Colors.grey.shade700,
      Cancelada() => Colors.red.shade800,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color),
      ),
      child: Text(
        estado.etiqueta,
        style: TextStyle(color: color, fontWeight: FontWeight.w500),
      ),
    );
  }
}

/// Campo de texto para fechas dd/mm/aaaa con selector de calendario.
class CampoFecha extends StatelessWidget {
  const CampoFecha({
    required this.controller,
    required this.etiqueta,
    this.validator,
    this.alCambiar,
    super.key,
  });

  final TextEditingController controller;
  final String etiqueta;
  final FormFieldValidator<String>? validator;
  final VoidCallback? alCambiar;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.datetime,
      decoration: InputDecoration(
        labelText: etiqueta,
        hintText: 'dd/mm/aaaa',
        suffixIcon: IconButton(
          tooltip: 'Abrir calendario',
          icon: const Icon(Icons.calendar_month),
          onPressed: () => _seleccionar(context),
        ),
      ),
      validator: validator ?? validarFechaObligatoria,
      onChanged: (_) => alCambiar?.call(),
    );
  }

  Future<void> _seleccionar(BuildContext context) async {
    final hoy = DateTime.now();
    final actual = leerFechaTexto(controller.text);
    final seleccionada = await showDatePicker(
      context: context,
      initialDate: actual ?? hoy,
      firstDate: DateTime(hoy.year - 1),
      lastDate: DateTime(hoy.year + 2, 12, 31),
    );

    if (seleccionada != null) {
      controller.text = formatearFecha(seleccionada);
      alCambiar?.call();
    }
  }
}

String? validarFechaObligatoria(String? valor) {
  if (valor == null || valor.trim().isEmpty) {
    return 'La fecha es obligatoria.';
  }

  if (leerFechaTexto(valor) == null) {
    return 'Use el formato dd/mm/aaaa con una fecha válida.';
  }

  return null;
}
