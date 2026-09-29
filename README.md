# 🌿 Casas Campestres — plataforma de reservas

Sitio de reservas tipo Airbnb para casas campestres propias: los huéspedes ven fotos, videos, reseñas y disponibilidad real, y **reservan y pagan en línea** (tarjeta, PSE, Nequi con Wompi). El propietario administra todo desde un panel: casas, fotos, calendario, reservas, limpiezas y la **sincronización con Airbnb y Booking** para evitar dobles reservas.

---

## Qué incluye

| Para el huésped | Para el propietario (panel `/admin`) |
|---|---|
| Listado de casas con buscador por fechas y número de huéspedes | Crear casas **ilimitadas** y editarlas (precios, capacidad, reglas, comodidades) |
| Galería de fotos y videos (MP4 o YouTube) con visor a pantalla completa | Subir fotos y videos arrastrando; ordenar, elegir portada (las fotos se optimizan y se les borra el GPS) |
| Calendario de disponibilidad real (web + Airbnb + Booking + bloqueos) | Calendario de todas las casas en una sola vista; bloquear fechas con un clic |
| Precio calculado al instante (fin de semana, temporadas, limpieza) | Precios de fin de semana y **temporadas/festivos** (Semana Santa, diciembre…) |
| Pago seguro en Wompi; confirmación inmediata por correo | Reservas con filtros, detalle, pagos, notas internas, cancelar |
| Página privada de su reserva, pagar saldo, "agregar a mi calendario" | **Limpiezas automáticas** en cada salida, con encargado y calendario para su celular |
| Reseñas **verificadas** (solo quien se hospedó puede opinar) | Responder u ocultar reseñas |
| "Mis reservas" con código + correo | Alertas: dobles reservas, calendarios caídos, pagos en modo demo |

---

## 1. Probarlo en tu computador

Necesitas [Node.js 20 o superior](https://nodejs.org).

```bash
npm install
cp .env.example .env      # edita el archivo: pon PAYMENTS_MODE=demo y borra NODE_ENV=production para pruebas
npm start
```

Abre `http://localhost:3000`. El panel está en `http://localhost:3000/admin/`.
Si no pusiste `ADMIN_PASSWORD`, la consola muestra una contraseña generada la primera vez.

En **modo demo** los pagos se simulan con un botón (el sitio muestra un aviso amarillo). Nunca publiques en modo demo: el servidor se niega a arrancar así con `NODE_ENV=production`.

Pruebas automáticas (reservas, doble reserva, firmas de Wompi, iCal, seguridad): `npm test`

---

## 2. Configurar los pagos con Wompi

Wompi es la pasarela de Bancolombia: acepta tarjetas, PSE, Nequi, botón Bancolombia y más. El dinero llega a tu cuenta; esta web **nunca ve ni guarda datos de tarjetas**.

1. Crea tu cuenta de comercio en **comercios.wompi.co** (necesitas RUT/cédula y cuenta bancaria).
2. En **Desarrolladores** copia: *llave pública*, *secreto de integridad* y *secreto de eventos*. Ponlos en `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`.
3. En la misma sección, en **URL de eventos**, pega: `https://TU-DOMINIO/api/webhooks/wompi` (la ves también en el panel → Ajustes).
4. Empieza con `WOMPI_ENV=sandbox` y las llaves de prueba (`pub_test_…`), haz una reserva con las tarjetas de prueba de Wompi y verifica que quede **Confirmada**.
5. Cambia a `WOMPI_ENV=production` con las llaves `pub_prod_…`.

**Cómo se protege el pago**
- El monto lo calcula el servidor; el navegador no puede cambiarlo (va firmado con el secreto de integridad).
- La reserva solo se confirma cuando **Wompi** avisa que el pago fue aprobado (evento firmado, se verifica la firma) o cuando el servidor consulta la transacción directamente a Wompi.
- Si el monto recibido no coincide, el pago se rechaza. Si Wompi avisa dos veces, no se cuenta doble.
- Mientras el huésped paga, las fechas quedan apartadas 30 min (45 min más si el banco deja el pago "en proceso", típico de PSE).

**Reembolsos:** cuando canceles una reserva pagada, haz el reembolso desde el panel de Wompi según tu política de cancelación.

---

## 3. Sincronizar con Airbnb y Booking (evitar dobles reservas)

Se usa **iCal**, el mismo sistema que usan Airbnb, Booking y VRBO entre sí. Se conecta en dos direcciones, por cada casa:

**A. Airbnb → esta web** (para que lo reservado en Airbnb aparezca ocupado aquí)
1. En Airbnb: *Calendario* → elige el anuncio → *Disponibilidad* → *Conectar calendarios* → **Exportar calendario** → copia el enlace `.ics`.
2. En el panel: **Airbnb / Booking** → en la casa correspondiente elige "Airbnb", pega el enlace y pulsa **Conectar**. Debe decir "Conectado: N eventos leídos".

**B. Esta web → Airbnb** (para que lo reservado aquí aparezca ocupado en Airbnb)
1. En el panel, copia el **"Enlace para pegar en Airbnb"** de esa casa.
2. En Airbnb: *Conectar calendarios* → **Importar calendario** → pega el enlace y ponle un nombre (p. ej. "Web propia").

Repite lo mismo con Booking (*Tarifas y disponibilidad → Sincronizar calendarios*).

**Cómo se evita el cruce**
- Esta web lee Airbnb/Booking cada 15 minutos **y otra vez justo antes de apartar las fechas** de un huésped.
- Los bloqueos manuales y los días de limpieza también se envían a Airbnb/Booking.
- A cada plataforma se le envía un enlace que no incluye sus propias reservas (evita duplicados).

**Límite importante (no depende de nosotros):** Airbnb y Booking leen los calendarios importados cada 1–3 horas aprox. Si alguien reserva aquí y, dentro de ese lapso, otra persona reserva las mismas fechas en Airbnb, el sistema lo detecta, marca la reserva como **Conflicto**, te avisa por correo y lo muestra en el Resumen. Para cerrar esa ventana puedes:
- Tras cada reserva web, entrar a Airbnb y actualizar el calendario importado (o bloquear las fechas a mano).
- Si el volumen crece, usar un *channel manager* con conexión directa por API (Hospitable, Lodgify, Hostaway, etc.), que sincroniza en segundos.

---

## 4. Publicar en internet

Necesitas un servidor que ejecute Node.js y un **disco persistente** (ahí viven la base de datos y las fotos). Opción recomendada: **Railway** (tiene plan económico y HTTPS automático):

1. Sube esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye `node_modules`, `data` y `.env`).
2. En Railway: *New Project → Deploy from GitHub repo*.
3. En el servicio: **Volumes → New Volume** montado en `/data`.
4. En **Variables** pon todo lo de `.env.example` (con `DATA_DIR=/data`, `NODE_ENV=production`, tus llaves de Wompi y `BASE_URL` con tu dominio).
5. En **Settings → Networking** genera un dominio o conecta el tuyo (p. ej. `www.casascampestres.co`).
6. Actualiza la URL de eventos en Wompi y los enlaces iCal en Airbnb/Booking si cambió el dominio.

También funciona en cualquier VPS o con Docker (`Dockerfile` incluido; monta un volumen en `/data`).

**Copias de seguridad:** todo está en la carpeta `DATA_DIR` (`casas.db` + `uploads/`). Descárgala periódicamente.

---

## 5. Correos automáticos

Se configuran en el panel: **Ajustes → Correo** (viene con `mutto546@gmail.com`). Ahí puedes cambiar el correo que envía, el nombre que ven los huéspedes y el correo que recibe los avisos, y probarlo con **Enviar correo de prueba**.

Con Gmail necesitas una **contraseña de aplicación** (no tu contraseña normal): myaccount.google.com → Seguridad → activa la verificación en dos pasos → "Contraseñas de aplicaciones" → crea una y pégala en el panel. Se guarda cifrada.

Se envían: confirmación al huésped, aviso de nueva reserva al propietario, pedido de reseña el día de salida y alertas de doble reserva. Si el correo no está configurado, todo funciona igual, pero los correos solo quedan escritos en la consola del servidor.

Para enviar muchos correos (más de ~400 al día) conviene un servicio como Brevo o Zoho; se configura en la misma pantalla, en "Otro proveedor".

## 6. Seguridad incluida

- Contraseñas del panel cifradas (bcrypt), sesión en cookie `HttpOnly` + `SameSite=Strict`, cierre tras 12 h.
- Bloqueo tras varios intentos fallidos de inicio de sesión; límites de intentos en reservas y búsquedas de reservas.
- Protección CSRF en todo el panel y política de seguridad de contenido (CSP) estricta: el sitio solo carga scripts propios.
- Los enlaces privados de reservas y reseñas usan tokens aleatorios imposibles de adivinar.
- Fotos re-procesadas (se eliminan metadatos y contenido malicioso); videos validados por su firma binaria.
- Los calendarios iCal no contienen nombres ni datos de huéspedes.
- Íconos y tipografía servidos desde el propio servidor (sin rastreadores de terceros).

Para cambiar o recuperar la contraseña del panel desde el servidor: `npm run crear-admin -- admin NuevaClaveLarga123`

---

## 7. Antes de lanzar (checklist)

- [ ] Llaves de Wompi de **producción** y URL de eventos configurada; una reserva real de prueba por un valor bajo.
- [ ] `BASE_URL` con tu dominio definitivo y HTTPS.
- [ ] Volumen persistente montado en `/data`.
- [ ] Airbnb/Booking conectados en **las dos direcciones** para cada casa.
- [ ] Revisar textos: descripción de cada casa (la de "Casa campo Lety es Lety" y su ubicación son provisionales), reglas, **política de cancelación** (panel → Ajustes).
- [ ] Correo SMTP funcionando.
- [ ] Aspectos legales en Colombia a verificar con tu contador/abogado: **Registro Nacional de Turismo (RNT)** para vivienda turística, facturación electrónica, y la política de tratamiento de datos (Ley 1581 de 2012).

---

## Estructura

```
server/            API y lógica (Express + SQLite)
  routes/public.js   casas, disponibilidad, reservas, pagos, reseñas, iCal
  routes/admin.js    panel del propietario
  availability.js    reglas de disponibilidad y precios
  payments.js        Wompi: firma de integridad, verificación de eventos
  ical.js            exportar/importar calendarios, detección de conflictos
  cleaning.js        tareas de limpieza automáticas
public/            sitio web (HTML, CSS y JS sin frameworks)
  admin/             panel
seed/              fotos iniciales de las 2 casas
test/              pruebas automáticas
```
