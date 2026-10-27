import 'package:casa_campo/core/almacenamiento.dart';
import 'package:casa_campo/core/reloj.dart';
import 'package:casa_campo/core/repositorio_json_local.dart';
import 'package:casa_campo/features/autenticacion/data/usuarios_locales.dart';
import 'package:casa_campo/features/autenticacion/domain/servicio_autenticacion.dart';
import 'package:casa_campo/features/autenticacion/domain/usuario.dart';
import 'package:casa_campo/features/autenticacion/domain/usuarios_repository.dart';
import 'package:casa_campo/features/casas/data/casas_locales.dart';
import 'package:casa_campo/features/casas/domain/casas_repository.dart';
import 'package:casa_campo/features/casas/domain/servicio_casas.dart';
import 'package:casa_campo/features/clientes/data/clientes_locales.dart';
import 'package:casa_campo/features/clientes/domain/clientes_repository.dart';
import 'package:casa_campo/features/clientes/domain/servicio_clientes.dart';
import 'package:casa_campo/features/reportes/domain/servicio_reportes.dart';
import 'package:casa_campo/features/reservas/data/reservas_locales.dart';
import 'package:casa_campo/features/reservas/domain/reservas_repository.dart';
import 'package:casa_campo/features/reservas/domain/servicio_disponibilidad.dart';
import 'package:casa_campo/features/reservas/domain/servicio_reservas.dart';
import 'package:flutter/widgets.dart';

/// Sesión del usuario autenticado.
class SesionController extends ChangeNotifier {
  Usuario? _usuario;

  Usuario? get usuario => _usuario;

  bool get autenticado => _usuario != null;

  void iniciar(Usuario usuario) {
    _usuario = usuario;
    notifyListeners();
  }

  void cerrar() {
    _usuario = null;
    notifyListeners();
  }
}

/// Contenedor de servicios de la aplicación (inyección de dependencias).
class Dependencias {
  Dependencias({
    required CasasRepository casas,
    required ClientesRepository clientes,
    required ReservasRepository reservas,
    required UsuariosRepository usuarios,
    Reloj reloj = relojDelSistema,
  }) : reloj = reloj,
       sesion = SesionController(),
       autenticacion = ServicioAutenticacion(usuarios, reloj: reloj),
       servicioCasas = ServicioCasas(casas, reservas, reloj: reloj),
       servicioClientes = ServicioClientes(clientes),
       disponibilidad = ServicioDisponibilidad(casas, reservas),
       reportes = ServicioReportes(casas, reservas) {
    servicioReservas = ServicioReservas(
      casas: casas,
      clientes: clientes,
      reservas: reservas,
      disponibilidad: disponibilidad,
      reloj: reloj,
    );
  }

  /// Crea las dependencias con repositorios locales sobre [almacenamiento].
  factory Dependencias.locales({
    required Almacenamiento almacenamiento,
    LectorDeAssets? lector,
    Reloj reloj = relojDelSistema,
  }) {
    return Dependencias(
      casas: CasasLocales(lector: lector, almacenamiento: almacenamiento),
      clientes: ClientesLocales(lector: lector, almacenamiento: almacenamiento),
      reservas: ReservasLocales(lector: lector, almacenamiento: almacenamiento),
      usuarios: UsuariosLocales(),
      reloj: reloj,
    );
  }

  final Reloj reloj;
  final SesionController sesion;
  final ServicioAutenticacion autenticacion;
  final ServicioCasas servicioCasas;
  final ServicioClientes servicioClientes;
  final ServicioDisponibilidad disponibilidad;
  final ServicioReportes reportes;
  late final ServicioReservas servicioReservas;
}

class ProveedorDependencias extends InheritedWidget {
  const ProveedorDependencias({
    required this.dependencias,
    required super.child,
    super.key,
  });

  final Dependencias dependencias;

  static Dependencias of(BuildContext context) {
    final proveedor = context
        .dependOnInheritedWidgetOfExactType<ProveedorDependencias>();
    assert(proveedor != null, 'No hay ProveedorDependencias en el árbol.');

    return proveedor!.dependencias;
  }

  @override
  bool updateShouldNotify(ProveedorDependencias oldWidget) {
    return dependencias != oldWidget.dependencias;
  }
}
