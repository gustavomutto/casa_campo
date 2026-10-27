/// Abstracción del almacenamiento clave-valor usado por los repositorios.
library;

import 'package:shared_preferences/shared_preferences.dart';

abstract interface class Almacenamiento {
  Future<String?> leer(String clave);

  Future<void> escribir(String clave, String valor);

  Future<void> eliminar(String clave);
}

/// Implementación en memoria, usada en pruebas.
class AlmacenamientoEnMemoria implements Almacenamiento {
  AlmacenamientoEnMemoria([Map<String, String>? inicial])
    : _datos = {...?inicial};

  final Map<String, String> _datos;

  @override
  Future<String?> leer(String clave) async => _datos[clave];

  @override
  Future<void> escribir(String clave, String valor) async {
    _datos[clave] = valor;
  }

  @override
  Future<void> eliminar(String clave) async {
    _datos.remove(clave);
  }
}

/// Implementación persistente basada en shared_preferences
/// (localStorage en la web, SharedPreferences en Android, etc.).
class AlmacenamientoPreferencias implements Almacenamiento {
  AlmacenamientoPreferencias(this._preferencias);

  final SharedPreferences _preferencias;

  static Future<AlmacenamientoPreferencias> crear() async {
    return AlmacenamientoPreferencias(await SharedPreferences.getInstance());
  }

  @override
  Future<String?> leer(String clave) async => _preferencias.getString(clave);

  @override
  Future<void> escribir(String clave, String valor) async {
    await _preferencias.setString(clave, valor);
  }

  @override
  Future<void> eliminar(String clave) async {
    await _preferencias.remove(clave);
  }
}
