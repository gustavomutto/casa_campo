enum Rol {
  administrador('Administrador'),
  recepcionista('Recepcionista');

  const Rol(this.etiqueta);

  final String etiqueta;
}

class Usuario {
  const Usuario({
    required this.id,
    required this.nombreUsuario,
    required this.nombreCompleto,
    required this.rol,
    required this.hashClave,
  });

  final String id;
  final String nombreUsuario;
  final String nombreCompleto;
  final Rol rol;

  /// SHA-256 de la contraseña concatenada con el nombre de usuario (sal).
  final String hashClave;

  bool get esAdministrador => rol == Rol.administrador;
}
