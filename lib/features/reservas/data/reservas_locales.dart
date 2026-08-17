import 'dart:convert';

import 'package:casa_campo/core/json.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:casa_campo/features/reservas/domain/reserva.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';
import 'package:flutter/services.dart' show rootBundle;

typedef LectorDeAssets = Future<String> Function(String ruta);

class ReservasLocales implements ReservasRepository {
  ReservasLocales({
    LectorDeAssets? lector,
    this.ruta = 'assets/data/reservas.json',
  }) : _lector = lector ?? rootBundle.loadString;

  final LectorDeAssets _lector;
  final String ruta;

  List<Reserva>? _cache;

  @override
  Future<List<Reserva>> obtenerTodos() async {
    final guardado = _cache;

    if (guardado != null) {
      return guardado;
    }

    final crudo = await _lector(ruta);
    final decodificado = jsonDecode(crudo);

    if (decodificado is! List) {
      throw const CampoInvalido(
        '(raíz)',
        'el archivo debe contener una lista',
        null,
      );
    }

    final reservas = decodificado
        .map((elemento) => Reserva.fromJson(elemento as Map<String, dynamic>))
        .toList(growable: false);

    _cache = reservas;

    return reservas;
  }

  @override
  Future<Reserva?> obtenerPorId(String id) async {
    for (final reserva in await obtenerTodos()) {
      if (reserva.id == id) {
        return reserva;
      }
    }

    return null;
  }

  @override
  Future<List<Reserva>> obtenerPendientes() async {
    final reservas = await obtenerTodos();

    return reservas
        .where((reserva) => reserva.estado is Pendiente)
        .toList(growable: false);
  }
}
