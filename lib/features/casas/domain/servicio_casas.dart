import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/formato.dart';
import 'package:casa_campo/core/reloj.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/casas/domain/casa.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';

/// Datos capturados en el formulario de casas.
class DatosCasa {
  const DatosCasa({
    required this.nombre,
    required this.municipio,
    required this.capacidadMaxima,
    required this.precioNoche,
    this.descripcion = '',
  });

  final String nombre;
  final String municipio;
  final String capacidadMaxima;
  final String precioNoche;
  final String descripcion;
}

class ServicioCasas {
  ServicioCasas(this._casas, this._reservas, {Reloj reloj = relojDelSistema})
    : _reloj = reloj;

  static const capacidadMinima = 1;
  static const capacidadMaxima = 30;
  static const precioMinimo = 50000;
  static const precioMaximo = 5000000;

  final CasasRepository _casas;
  final ReservasRepository _reservas;
  final Reloj _reloj;

  Future<List<Casa>> listar({bool soloActivas = false}) async {
    final casas = await _casas.obtenerTodas();

    return casas
        .where((casa) => !soloActivas || casa.activa)
        .toList(growable: false);
  }

  Future<Casa?> obtener(String id) => _casas.obtenerPorId(id);

  /// Valida los datos del formulario. Lanza [ErrorDeValidacion] con el
  /// primer campo inválido.
  void validar(DatosCasa datos) {
    final errores = <String, String?>{
      'nombre': validarNombreCasa(datos.nombre),
      'municipio': validarRequerido(datos.municipio, 'municipio'),
      'capacidadMaxima': validarEnteroEnRango(
        datos.capacidadMaxima,
        'capacidad',
        minimo: capacidadMinima,
        maximo: capacidadMaxima,
      ),
      'precioNoche': validarEnteroEnRango(
        datos.precioNoche,
        'precio por noche',
        minimo: precioMinimo,
        maximo: precioMaximo,
      ),
    };

    for (final error in errores.entries) {
      if (error.value != null) {
        throw ErrorDeValidacion(error.key, error.value!);
      }
    }
  }

  Future<Casa> crear(DatosCasa datos) async {
    validar(datos);
    await _verificarNombreUnico(datos.nombre);

    final casa = Casa(
      id: await _casas.siguienteId(),
      nombre: datos.nombre.trim(),
      municipio: datos.municipio.trim(),
      capacidadMaxima: int.parse(datos.capacidadMaxima.trim()),
      precioNoche: int.parse(datos.precioNoche.trim()),
      descripcion: datos.descripcion.trim(),
    );

    await _casas.guardar(casa);

    return casa;
  }

  Future<Casa> actualizar(String id, DatosCasa datos) async {
    validar(datos);

    final actual = await _casas.obtenerPorId(id);

    if (actual == null) {
      throw const ErrorDeNegocio('La casa no existe.');
    }

    await _verificarNombreUnico(datos.nombre, excluirId: id);

    final casa = actual.copiarCon(
      nombre: datos.nombre.trim(),
      municipio: datos.municipio.trim(),
      capacidadMaxima: int.parse(datos.capacidadMaxima.trim()),
      precioNoche: int.parse(datos.precioNoche.trim()),
      descripcion: datos.descripcion.trim(),
    );

    await _casas.guardar(casa);

    return casa;
  }

  /// Activa o desactiva una casa. No se puede desactivar una casa que tenga
  /// reservas activas desde hoy en adelante.
  Future<Casa> cambiarEstado(String id, {required bool activa}) async {
    final casa = await _casas.obtenerPorId(id);

    if (casa == null) {
      throw const ErrorDeNegocio('La casa no existe.');
    }

    if (!activa) {
      final hoy = soloFecha(_reloj());
      final reservas = await _reservas.obtenerPorCasa(id);
      final tieneFuturas = reservas.any(
        (r) =>
            r.estado.esActiva &&
            !soloFecha(r.rangoFechas.fechaSalida).isBefore(hoy),
      );

      if (tieneFuturas) {
        throw const ErrorDeNegocio(
          'No se puede desactivar: la casa tiene reservas activas.',
        );
      }
    }

    final actualizada = casa.copiarCon(activa: activa);
    await _casas.guardar(actualizada);

    return actualizada;
  }

  Future<void> _verificarNombreUnico(String nombre, {String? excluirId}) async {
    final normalizado = nombre.trim().toLowerCase();

    for (final casa in await _casas.obtenerTodas()) {
      if (casa.id != excluirId && casa.nombre.toLowerCase() == normalizado) {
        throw const ErrorDeValidacion(
          'nombre',
          'Ya existe una casa con ese nombre.',
        );
      }
    }
  }
}
