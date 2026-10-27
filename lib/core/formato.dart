/// Funciones de formato y lectura de fechas y valores monetarios.
library;

/// Devuelve la fecha en formato dd/mm/aaaa.
String formatearFecha(DateTime fecha) {
  final dia = fecha.day.toString().padLeft(2, '0');
  final mes = fecha.month.toString().padLeft(2, '0');

  return '$dia/$mes/${fecha.year}';
}

/// Convierte un texto dd/mm/aaaa en una fecha (UTC, sin hora).
/// Devuelve null si el texto no es una fecha válida.
DateTime? leerFechaTexto(String texto) {
  final partes = texto.trim().split('/');

  if (partes.length != 3) {
    return null;
  }

  final dia = int.tryParse(partes[0]);
  final mes = int.tryParse(partes[1]);
  final anio = int.tryParse(partes[2]);

  if (dia == null || mes == null || anio == null || partes[2].length != 4) {
    return null;
  }

  final fecha = DateTime.utc(anio, mes, dia);

  // DateTime normaliza fechas como 31/02; se rechazan esos casos.
  if (fecha.day != dia || fecha.month != mes || fecha.year != anio) {
    return null;
  }

  return fecha;
}

/// Formatea un valor entero en pesos colombianos: $ 1.250.000
String formatearPesos(int valor) {
  final negativo = valor < 0;
  final digitos = valor.abs().toString();
  final buffer = StringBuffer();

  for (var i = 0; i < digitos.length; i++) {
    final restantes = digitos.length - i;
    buffer.write(digitos[i]);

    if (restantes > 1 && restantes % 3 == 1) {
      buffer.write('.');
    }
  }

  return '${negativo ? '-' : ''}\$ $buffer';
}

/// Elimina la hora de una fecha y la deja en UTC.
DateTime soloFecha(DateTime fecha) {
  return DateTime.utc(fecha.year, fecha.month, fecha.day);
}
