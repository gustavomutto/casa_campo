import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Calcula el hash SHA-256 de la contraseña usando el nombre de usuario
/// como sal, para no guardar contraseñas en texto plano.
String calcularHashClave(String nombreUsuario, String clave) {
  final bytes = utf8.encode('${nombreUsuario.toLowerCase()}:$clave');

  return sha256.convert(bytes).toString();
}
