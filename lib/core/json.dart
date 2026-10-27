/// Utilidades para leer y validar campos de documentos JSON.
library;

/// Excepción lanzada cuando un campo de un documento JSON no es válido.
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

String? leerTextoOpcional(Map<String, dynamic> json, String campo) {
  final valor = json[campo];

  if (valor == null) {
    return null;
  }

  if (valor is String) {
    return valor;
  }

  throw CampoInvalido(campo, 'se esperaba un texto', valor);
}

int leerEntero(Map<String, dynamic> json, String campo, {int? porDefecto}) {
  final valor = json[campo];

  if (valor == null && porDefecto != null) {
    return porDefecto;
  }

  if (valor is int) {
    return valor;
  }

  if (valor is double && valor == valor.roundToDouble()) {
    return valor.toInt();
  }

  throw CampoInvalido(campo, 'se esperaba un número entero', valor);
}

bool leerBooleano(Map<String, dynamic> json, String campo, {bool? porDefecto}) {
  final valor = json[campo];

  if (valor == null && porDefecto != null) {
    return porDefecto;
  }

  if (valor is bool) {
    return valor;
  }

  throw CampoInvalido(campo, 'se esperaba un valor lógico', valor);
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

List<Map<String, dynamic>> leerListaDeObjetos(
  Map<String, dynamic> json,
  String campo,
) {
  final valor = json[campo];

  if (valor == null) {
    return const [];
  }

  if (valor is! List) {
    throw CampoInvalido(campo, 'se esperaba una lista', valor);
  }

  return valor
      .map((elemento) {
        if (elemento is! Map<String, dynamic>) {
          throw CampoInvalido(
            campo,
            'se esperaba una lista de objetos',
            elemento,
          );
        }

        return elemento;
      })
      .toList(growable: false);
}
