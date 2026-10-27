/// Repositorio genérico que persiste una colección de entidades como JSON.
///
/// La primera vez que se consulta, carga los datos iniciales desde un archivo
/// de assets (semilla) y los guarda en el [Almacenamiento]. A partir de ahí
/// todas las lecturas y escrituras se hacen sobre el almacenamiento.
library;

import 'dart:convert';

import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/core/json.dart';
import 'package:flutter/services.dart' show rootBundle;

typedef LectorDeAssets = Future<String> Function(String ruta);

abstract class RepositorioJsonLocal<T> {
  RepositorioJsonLocal({
    required this.clave,
    required this.rutaSemilla,
    required this.prefijoId,
    LectorDeAssets? lector,
    Almacenamiento? almacenamiento,
  }) : _lector = lector ?? rootBundle.loadString,
       _almacenamiento = almacenamiento ?? AlmacenamientoEnMemoria();

  final String clave;
  final String rutaSemilla;
  final String prefijoId;
  final LectorDeAssets _lector;
  final Almacenamiento _almacenamiento;

  List<T>? _cache;

  T desdeJson(Map<String, dynamic> json);

  Map<String, dynamic> aJson(T entidad);

  String idDe(T entidad);

  Future<List<T>> todos() async {
    final guardado = _cache;

    if (guardado != null) {
      return List.unmodifiable(guardado);
    }

    final persistido = await _almacenamiento.leer(clave);
    final crudo = persistido ?? await _lector(rutaSemilla);
    final entidades = _decodificar(crudo);

    _cache = entidades;

    if (persistido == null) {
      await _persistir();
    }

    return List.unmodifiable(entidades);
  }

  Future<T?> porId(String id) async {
    for (final entidad in await todos()) {
      if (idDe(entidad) == id) {
        return entidad;
      }
    }

    return null;
  }

  /// Inserta la entidad o la reemplaza si ya existe una con el mismo id.
  Future<void> guardar(T entidad) async {
    await todos();

    final lista = _cache!;
    final indice = lista.indexWhere((e) => idDe(e) == idDe(entidad));

    if (indice >= 0) {
      lista[indice] = entidad;
    } else {
      lista.add(entidad);
    }

    await _persistir();
  }

  Future<void> eliminar(String id) async {
    await todos();
    _cache!.removeWhere((e) => idDe(e) == id);
    await _persistir();
  }

  /// Genera el siguiente identificador con el formato prefijo-NNN.
  Future<String> siguienteId() async {
    var mayor = 0;

    for (final entidad in await todos()) {
      final partes = idDe(entidad).split('-');
      final numero = int.tryParse(partes.last) ?? 0;

      if (numero > mayor) {
        mayor = numero;
      }
    }

    return '$prefijoId-${(mayor + 1).toString().padLeft(3, '0')}';
  }

  List<T> _decodificar(String crudo) {
    final decodificado = jsonDecode(crudo);

    if (decodificado is! List) {
      throw const CampoInvalido(
        '(raíz)',
        'el archivo debe contener una lista',
        null,
      );
    }

    return decodificado.map((elemento) {
      if (elemento is! Map<String, dynamic>) {
        throw CampoInvalido('(raíz)', 'se esperaba un objeto', elemento);
      }

      return desdeJson(elemento);
    }).toList();
  }

  Future<void> _persistir() async {
    final lista = _cache ?? const [];
    await _almacenamiento.escribir(
      clave,
      jsonEncode(lista.map(aJson).toList()),
    );
  }
}
