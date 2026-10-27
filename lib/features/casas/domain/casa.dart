import 'package:casa_campo/core/json.dart';

/// Casa de campo (finca) disponible para alquiler.
class Casa {
  const Casa({
    required this.id,
    required this.nombre,
    required this.municipio,
    required this.capacidadMaxima,
    required this.precioNoche,
    this.descripcion = '',
    this.activa = true,
  });

  factory Casa.fromJson(Map<String, dynamic> json) {
    return Casa(
      id: leerTexto(json, 'id'),
      nombre: leerTexto(json, 'nombre'),
      municipio: leerTexto(json, 'municipio'),
      capacidadMaxima: leerEntero(json, 'capacidadMaxima'),
      precioNoche: leerEntero(json, 'precioNoche'),
      descripcion: leerTextoOpcional(json, 'descripcion') ?? '',
      activa: leerBooleano(json, 'activa', porDefecto: true),
    );
  }

  final String id;
  final String nombre;
  final String municipio;
  final int capacidadMaxima;
  final int precioNoche;
  final String descripcion;
  final bool activa;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'municipio': municipio,
      'capacidadMaxima': capacidadMaxima,
      'precioNoche': precioNoche,
      'descripcion': descripcion,
      'activa': activa,
    };
  }

  Casa copiarCon({
    String? nombre,
    String? municipio,
    int? capacidadMaxima,
    int? precioNoche,
    String? descripcion,
    bool? activa,
  }) {
    return Casa(
      id: id,
      nombre: nombre ?? this.nombre,
      municipio: municipio ?? this.municipio,
      capacidadMaxima: capacidadMaxima ?? this.capacidadMaxima,
      precioNoche: precioNoche ?? this.precioNoche,
      descripcion: descripcion ?? this.descripcion,
      activa: activa ?? this.activa,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Casa &&
            other.id == id &&
            other.nombre == nombre &&
            other.municipio == municipio &&
            other.capacidadMaxima == capacidadMaxima &&
            other.precioNoche == precioNoche &&
            other.descripcion == descripcion &&
            other.activa == activa;
  }

  @override
  int get hashCode => Object.hash(
    id,
    nombre,
    municipio,
    capacidadMaxima,
    precioNoche,
    descripcion,
    activa,
  );
}
