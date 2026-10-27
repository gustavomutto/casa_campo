/// Reglas de validación de los formularios del sistema.
///
/// Cada función devuelve null cuando el valor es válido o el mensaje de error
/// que se muestra al usuario.
library;

final _soloDigitos = RegExp(r'^\d+$');
final _soloLetras = RegExp(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$");
final _alfanumerico = RegExp(r'^[A-Za-z0-9_]+$');
final _correo = RegExp(r'^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[A-Za-z]{2,}$');

String? validarRequerido(String? valor, String nombreCampo) {
  if (valor == null || valor.trim().isEmpty) {
    return 'El campo $nombreCampo es obligatorio.';
  }

  return null;
}

/// Usuario: obligatorio, 4 a 20 caracteres alfanuméricos.
String? validarNombreUsuario(String? valor) {
  final requerido = validarRequerido(valor, 'usuario');

  if (requerido != null) {
    return requerido;
  }

  final texto = valor!.trim();

  if (texto.length < 4 || texto.length > 20) {
    return 'El usuario debe tener entre 4 y 20 caracteres.';
  }

  if (!_alfanumerico.hasMatch(texto)) {
    return 'El usuario solo admite letras, números y guion bajo.';
  }

  return null;
}

/// Contraseña: obligatoria, 8 a 20 caracteres.
String? validarClave(String? valor) {
  if (valor == null || valor.isEmpty) {
    return 'El campo contraseña es obligatorio.';
  }

  if (valor.length < 8 || valor.length > 20) {
    return 'La contraseña debe tener entre 8 y 20 caracteres.';
  }

  return null;
}

/// Documento: obligatorio, solo dígitos, entre 6 y 10 dígitos.
String? validarDocumento(String? valor) {
  final requerido = validarRequerido(valor, 'documento');

  if (requerido != null) {
    return requerido;
  }

  final texto = valor!.trim();

  if (!_soloDigitos.hasMatch(texto)) {
    return 'El documento solo debe contener números.';
  }

  if (texto.length < 6 || texto.length > 10) {
    return 'El documento debe tener entre 6 y 10 dígitos.';
  }

  return null;
}

/// Nombre de persona: obligatorio, 3 a 60 caracteres, solo letras y espacios.
String? validarNombrePersona(String? valor) {
  final requerido = validarRequerido(valor, 'nombre');

  if (requerido != null) {
    return requerido;
  }

  final texto = valor!.trim();

  if (texto.length < 3 || texto.length > 60) {
    return 'El nombre debe tener entre 3 y 60 caracteres.';
  }

  if (!_soloLetras.hasMatch(texto)) {
    return 'El nombre solo debe contener letras y espacios.';
  }

  return null;
}

/// Teléfono celular colombiano: 10 dígitos que empiezan por 3.
String? validarTelefono(String? valor) {
  final requerido = validarRequerido(valor, 'teléfono');

  if (requerido != null) {
    return requerido;
  }

  final texto = valor!.trim();

  if (!_soloDigitos.hasMatch(texto)) {
    return 'El teléfono solo debe contener números.';
  }

  if (texto.length != 10) {
    return 'El teléfono debe tener 10 dígitos.';
  }

  if (!texto.startsWith('3')) {
    return 'El teléfono celular debe empezar por 3.';
  }

  return null;
}

/// Correo electrónico: obligatorio y con formato válido.
String? validarCorreo(String? valor) {
  final requerido = validarRequerido(valor, 'correo');

  if (requerido != null) {
    return requerido;
  }

  final texto = valor!.trim();

  if (texto.length > 80 || !_correo.hasMatch(texto)) {
    return 'El correo electrónico no es válido.';
  }

  return null;
}

/// Nombre de casa: obligatorio, 3 a 50 caracteres.
String? validarNombreCasa(String? valor) {
  final requerido = validarRequerido(valor, 'nombre');

  if (requerido != null) {
    return requerido;
  }

  final longitud = valor!.trim().length;

  if (longitud < 3 || longitud > 50) {
    return 'El nombre debe tener entre 3 y 50 caracteres.';
  }

  return null;
}

/// Entero dentro de un rango cerrado [minimo, maximo].
String? validarEnteroEnRango(
  String? valor,
  String nombreCampo, {
  required int minimo,
  required int maximo,
}) {
  final requerido = validarRequerido(valor, nombreCampo);

  if (requerido != null) {
    return requerido;
  }

  final numero = int.tryParse(valor!.trim());

  if (numero == null) {
    return 'El campo $nombreCampo debe ser un número entero.';
  }

  if (numero < minimo || numero > maximo) {
    return 'El campo $nombreCampo debe estar entre $minimo y $maximo.';
  }

  return null;
}
