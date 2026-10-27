import 'package:casa_campo/core/json.dart';

class Cliente {
  const Cliente({
    required this.id,
    required this.documento,
    required this.nombreCompleto,
    required this.telefono,
    required this.correo,
  });

  factory Cliente.fromJson(Map<String, dynamic> json) {
    return Cliente(
      id: leerTexto(json, 'id'),
      documento: leerTexto(json, 'documento'),
      nombreCompleto: leerTexto(json, 'nombreCompleto'),
      telefono: leerTexto(json, 'telefono'),
      correo: leerTexto(json, 'correo'),
    );
  }

  final String id;
  final String documento;
  final String nombreCompleto;
  final String telefono;
  final String correo;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'documento': documento,
      'nombreCompleto': nombreCompleto,
      'telefono': telefono,
      'correo': correo,
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Cliente &&
            other.id == id &&
            other.documento == documento &&
            other.nombreCompleto == nombreCompleto &&
            other.telefono == telefono &&
            other.correo == correo;
  }

  @override
  int get hashCode =>
      Object.hash(id, documento, nombreCompleto, telefono, correo);
}
