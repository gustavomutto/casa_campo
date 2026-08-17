import 'package:casa_campo/features/reservas/data/reservas_locales.dart';
import 'package:casa_campo/features/reservas/domain/estado_reserva.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('carga reservas desde JSON local', () async {
    final repositorio = ReservasLocales(
      lector: (_) async => '''
[
  {
    "id": "r1",
    "casaId": "casa1",
    "clienteNombre": "Gustavo",
    "rangoFechas": {
      "fechaEntrada": "2026-09-01T00:00:00.000Z",
      "fechaSalida": "2026-09-03T00:00:00.000Z"
    },
    "estado": {
      "tipo": "pendiente"
    }
  }
]
''',
    );

    final reservas = await repositorio.obtenerTodos();

    expect(reservas, hasLength(1));
    expect(reservas.first.id, 'r1');
    expect(reservas.first.clienteNombre, 'Gustavo');
    expect(reservas.first.estado, const Pendiente());
  });

  test('obtiene solamente reservas pendientes', () async {
    final repositorio = ReservasLocales(
      lector: (_) async => '''
[
  {
    "id": "r1",
    "casaId": "casa1",
    "clienteNombre": "Cliente 1",
    "rangoFechas": {
      "fechaEntrada": "2026-09-01T00:00:00.000Z",
      "fechaSalida": "2026-09-03T00:00:00.000Z"
    },
    "estado": {
      "tipo": "pendiente"
    }
  },
  {
    "id": "r2",
    "casaId": "casa2",
    "clienteNombre": "Cliente 2",
    "rangoFechas": {
      "fechaEntrada": "2026-10-01T00:00:00.000Z",
      "fechaSalida": "2026-10-03T00:00:00.000Z"
    },
    "estado": {
      "tipo": "confirmada",
      "confirmadaPor": "administrador"
    }
  }
]
''',
    );

    final pendientes = await repositorio.obtenerPendientes();

    expect(pendientes, hasLength(1));
    expect(pendientes.first.id, 'r1');
  });
}
