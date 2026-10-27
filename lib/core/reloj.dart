/// Fuente de la fecha y hora actual. Se inyecta para poder probar
/// reglas que dependen del tiempo.
typedef Reloj = DateTime Function();

DateTime relojDelSistema() => DateTime.now();
