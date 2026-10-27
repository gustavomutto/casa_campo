/// Errores de negocio que la interfaz muestra al usuario.
library;

/// Se lanza cuando un dato ingresado por el usuario no cumple una regla.
class ErrorDeValidacion implements Exception {
  const ErrorDeValidacion(this.campo, this.mensaje);

  final String campo;
  final String mensaje;

  @override
  String toString() => mensaje;
}

/// Se lanza cuando una operación no se puede realizar por el estado actual
/// de los datos (por ejemplo, una casa ocupada o una transición inválida).
class ErrorDeNegocio implements Exception {
  const ErrorDeNegocio(this.mensaje);

  final String mensaje;

  @override
  String toString() => mensaje;
}
