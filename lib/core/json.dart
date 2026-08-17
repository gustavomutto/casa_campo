class CampoInvalido implements Exception {
  const CampoInvalido(this.campo, this.mensaje, this.valor);

  final String campo;
  final String mensaje;
  final Object? valor;

  @override
  String toString() {
    return 'CampoInvalido(campo: $campo, mensaje: $mensaje, valor: $valor)';
  }
}

String leerTexto(Map<String, dynamic> json, String campo) {
  final valor = json[campo];

  if (valor is String && valor.trim().isNotEmpty) {
    return valor;
  }

  throw CampoInvalido(campo, 'se esperaba un texto no vacío', valor);
}

DateTime leerFecha(Map<String, dynamic> json, String campo) {
  final valor = json[campo];

  if (valor is! String) {
    throw CampoInvalido(campo, 'se esperaba una fecha ISO-8601', valor);
  }

  final fecha = DateTime.tryParse(valor);

  if (fecha == null) {
    throw CampoInvalido(campo, 'fecha inválida', valor);
  }

  return fecha;
}
