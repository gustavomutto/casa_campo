import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:casa_campo/features/clientes/domain/cliente.dart';
import 'package:casa_campo/features/clientes/domain/clientes_repository.dart';

/// Datos capturados en el formulario de clientes.
class DatosCliente {
  const DatosCliente({
    required this.documento,
    required this.nombreCompleto,
    required this.telefono,
    required this.correo,
  });

  final String documento;
  final String nombreCompleto;
  final String telefono;
  final String correo;
}

class ServicioClientes {
  ServicioClientes(this._clientes);

  final ClientesRepository _clientes;

  Future<List<Cliente>> listar({String filtro = ''}) async {
    final clientes = await _clientes.obtenerTodos();
    final texto = filtro.trim().toLowerCase();

    final filtrados = clientes.where((cliente) {
      return texto.isEmpty ||
          cliente.nombreCompleto.toLowerCase().contains(texto) ||
          cliente.documento.contains(texto);
    }).toList();

    filtrados.sort((a, b) => a.nombreCompleto.compareTo(b.nombreCompleto));

    return filtrados;
  }

  Future<Cliente?> obtener(String id) => _clientes.obtenerPorId(id);

  /// Valida los datos del formulario y lanza [ErrorDeValidacion] con el
  /// primer campo inválido.
  void validar(DatosCliente datos) {
    final errores = <String, String?>{
      'documento': validarDocumento(datos.documento),
      'nombreCompleto': validarNombrePersona(datos.nombreCompleto),
      'telefono': validarTelefono(datos.telefono),
      'correo': validarCorreo(datos.correo),
    };

    for (final error in errores.entries) {
      if (error.value != null) {
        throw ErrorDeValidacion(error.key, error.value!);
      }
    }
  }

  Future<Cliente> registrar(DatosCliente datos) async {
    validar(datos);
    await _verificarDocumentoUnico(datos.documento.trim());

    final cliente = Cliente(
      id: await _clientes.siguienteId(),
      documento: datos.documento.trim(),
      nombreCompleto: datos.nombreCompleto.trim(),
      telefono: datos.telefono.trim(),
      correo: datos.correo.trim().toLowerCase(),
    );

    await _clientes.guardar(cliente);

    return cliente;
  }

  Future<Cliente> actualizar(String id, DatosCliente datos) async {
    validar(datos);

    final actual = await _clientes.obtenerPorId(id);

    if (actual == null) {
      throw const ErrorDeNegocio('El cliente no existe.');
    }

    await _verificarDocumentoUnico(datos.documento.trim(), excluirId: id);

    final cliente = Cliente(
      id: id,
      documento: datos.documento.trim(),
      nombreCompleto: datos.nombreCompleto.trim(),
      telefono: datos.telefono.trim(),
      correo: datos.correo.trim().toLowerCase(),
    );

    await _clientes.guardar(cliente);

    return cliente;
  }

  Future<void> _verificarDocumentoUnico(
    String documento, {
    String? excluirId,
  }) async {
    for (final cliente in await _clientes.obtenerTodos()) {
      if (cliente.id != excluirId && cliente.documento == documento) {
        throw const ErrorDeValidacion(
          'documento',
          'Ya existe un cliente con ese documento.',
        );
      }
    }
  }
}
