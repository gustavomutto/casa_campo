import 'package:casa_campo/app/dependencias.dart';
import 'package:casa_campo/core/errores.dart';
import 'package:casa_campo/core/validadores.dart';
import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formulario = GlobalKey<FormState>();
  final _usuario = TextEditingController();
  final _clave = TextEditingController();

  bool _cargando = false;
  bool _ocultarClave = true;
  String? _error;

  @override
  void dispose() {
    _usuario.dispose();
    _clave.dispose();
    super.dispose();
  }

  Future<void> _ingresar() async {
    setState(() => _error = null);

    if (!_formulario.currentState!.validate()) {
      return;
    }

    final dependencias = ProveedorDependencias.of(context);
    setState(() => _cargando = true);

    try {
      final usuario = await dependencias.autenticacion.iniciarSesion(
        _usuario.text,
        _clave.text,
      );
      dependencias.sesion.iniciar(usuario);
    } on ErrorDeValidacion catch (e) {
      setState(() => _error = e.mensaje);
    } on ErrorDeNegocio catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) {
        setState(() => _cargando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);

    return Scaffold(
      backgroundColor: tema.colorScheme.surfaceContainerLow,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formulario,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Icon(
                        Icons.cottage_outlined,
                        size: 64,
                        color: tema.colorScheme.primary,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Casa Campo',
                        textAlign: TextAlign.center,
                        style: tema.textTheme.headlineMedium,
                      ),
                      Text(
                        'Gestión de reservas de casas de campo',
                        textAlign: TextAlign.center,
                        style: tema.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        key: const Key('campo-usuario'),
                        controller: _usuario,
                        decoration: const InputDecoration(
                          labelText: 'Usuario',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        textInputAction: TextInputAction.next,
                        validator: validarNombreUsuario,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const Key('campo-clave'),
                        controller: _clave,
                        obscureText: _ocultarClave,
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            tooltip: _ocultarClave
                                ? 'Mostrar contraseña'
                                : 'Ocultar contraseña',
                            icon: Icon(
                              _ocultarClave
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            onPressed: () {
                              setState(() => _ocultarClave = !_ocultarClave);
                            },
                          ),
                        ),
                        validator: validarClave,
                        onFieldSubmitted: (_) => _ingresar(),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          key: const Key('mensaje-error-login'),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: tema.colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: tema.colorScheme.onErrorContainer,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      FilledButton(
                        key: const Key('boton-ingresar'),
                        onPressed: _cargando ? null : _ingresar,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: _cargando
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Ingresar'),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Usuarios de demostración:\n'
                        'admin / Admin2026*  ·  recepcion / Recep2026*',
                        textAlign: TextAlign.center,
                        style: tema.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
