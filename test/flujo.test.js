'use strict';
// Pruebas de punta a punta: reservas, doble reserva, pagos, firma de Wompi, iCal y seguridad del panel.
// Ejecutar: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-test-'));
Object.assign(process.env, { DATA_DIR: tmp, ADMIN_USER: 'admin', ADMIN_PASSWORD: 'prueba-segura-123', PAYMENTS_MODE: 'demo', NODE_ENV: 'test', PORT: '0', BASE_URL: 'http://localhost' });

const { app, start } = require('../server/index');
const U = require('../server/util');
const { db } = require('../server/db');
const config = require('../server/config');
const payments = require('../server/payments');

let base, server, feedServer, feedBody = '';
const day = n => U.addDays(U.today(), n);

async function req(method, url, { body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (body) h['Content-Type'] = 'application/json';
  if (cookie) h.Cookie = cookie;
  const res = await fetch(base + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* texto */ }
  return { status: res.status, json, text, headers: res.headers };
}

test.before(async () => {
  const { seed } = require('../server/seed');
  require('../server/auth').ensureInitialAdmin();
  await seed();
  server = app.listen(0); await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  feedServer = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/calendar'); s.end(feedBody); }).listen(0);
  await new Promise(r => feedServer.once('listening', r));
});
test.after(() => { server.close(); feedServer.close(); });

const guest = (extra = {}) => ({ house: 'casa-pueblo-bello', checkin: day(10), checkout: day(13), guests: 2, name: 'Ana Pérez', email: 'ana@example.com', phone: '300 123 4567', acceptTerms: true, ...extra });

test('lista casas y cotiza con precios del servidor', async () => {
  const r = await req('GET', '/api/houses');
  assert.equal(r.status, 200);
  assert.equal(r.json.houses.length, 2);
  const q = await req('GET', `/api/houses/casa-pueblo-bello/quote?checkin=${day(10)}&checkout=${day(13)}&guests=2`);
  assert.equal(q.json.quote.total, 900000);
  assert.equal(q.json.available, true);
});

test('reserva + pago aprobado confirma y bloquea las fechas (sin doble reserva)', async () => {
  const r = await req('POST', '/api/bookings', { body: guest() });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.checkout.amount, 900000);

  // Mientras paga, otra persona NO puede tomar las mismas noches
  const dup = await req('POST', '/api/bookings', { body: guest({ checkin: day(12), checkout: day(14), email: 'otro@example.com' }) });
  assert.equal(dup.status, 409);

  // Pago aprobado
  const ok = await req('POST', `/api/bookings/${r.json.code}/demo-approve`, { body: { t: r.json.token, reference: r.json.checkout.reference } });
  assert.equal(ok.status, 200, ok.text);
  const b = await req('GET', `/api/bookings/${r.json.code}?t=${r.json.token}`);
  assert.equal(b.json.booking.status, 'confirmed');
  assert.equal(b.json.booking.amountPaid, 900000);

  // Aprobar dos veces no suma dos veces
  await req('POST', `/api/bookings/${r.json.code}/demo-approve`, { body: { t: r.json.token, reference: r.json.checkout.reference } });
  const b2 = await req('GET', `/api/bookings/${r.json.code}?t=${r.json.token}`);
  assert.equal(b2.json.booking.amountPaid, 900000);

  // El día de salida sí se puede usar como llegada de otra reserva
  const next = await req('GET', `/api/houses/casa-pueblo-bello/quote?checkin=${day(13)}&checkout=${day(15)}&guests=2`);
  assert.equal(next.json.available, true);

  // Sin token no se ve la reserva
  const nope = await req('GET', `/api/bookings/${r.json.code}?t=falso`);
  assert.equal(nope.status, 404);

  // Se creó la tarea de limpieza el día de salida
  const task = db.prepare(`SELECT * FROM cleaning_tasks WHERE date = ?`).get(day(13));
  assert.ok(task);
});

test('el monto no se puede manipular desde el navegador', async () => {
  const r = await req('POST', '/api/bookings', { body: guest({ checkin: day(40), checkout: day(41), total: 1000, price: 1 }) });
  assert.equal(r.json.checkout.amount, 300000);
  const bad = await payments.applyTransaction({ id: 'X', reference: r.json.checkout.reference, amount_in_cents: 100, currency: 'COP', status: 'APPROVED' });
  assert.equal(bad.ok, false);
  const b = await req('GET', `/api/bookings/${r.json.code}?t=${r.json.token}`);
  assert.equal(b.json.booking.status, 'pending_payment');
});

test('firma de eventos de Wompi: acepta la válida y rechaza la alterada', () => {
  config.wompi.eventsSecret = 'test_events_secret';
  const body = { event: 'transaction.updated', data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] }, timestamp: 1530291411 };
  const good = crypto.createHash('sha256').update('1234-1610641025-49201APPROVED44900001530291411test_events_secret').digest('hex').toUpperCase();
  assert.equal(payments.verifyEvent(body, good), true);
  body.data.transaction.amount_in_cents = 100;
  assert.equal(payments.verifyEvent(body, good), false);
});

test('iCal: exporta reservas y bloquea fechas importadas de Airbnb', async () => {
  const h = db.prepare(`SELECT * FROM houses WHERE slug = 'casa-campo-lety'`).get();
  // Exportación
  const ex = await req('GET', `/ical/${db.prepare(`SELECT ical_token FROM houses WHERE slug='casa-pueblo-bello'`).get().ical_token}.ics`);
  assert.equal(ex.status, 200);
  assert.match(ex.text, /BEGIN:VCALENDAR/);
  assert.match(ex.text, new RegExp(`DTSTART;VALUE=DATE:${day(10).replace(/-/g, '')}`));
  assert.doesNotMatch(ex.text, /Ana/); // sin datos personales
  // Token inválido
  assert.equal((await req('GET', '/ical/token-que-no-existe-aaaaaaaaa.ics')).status, 404);

  // Importación (simulamos el calendario de Airbnb)
  const s = day(20).replace(/-/g, ''); const e = day(23).replace(/-/g, '');
  feedBody = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${s}\r\nDTEND;VALUE=DATE:${e}\r\nUID:abc123@airbnb.com\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  const login = await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'prueba-segura-123' } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const add = await req('POST', '/api/admin/feeds', { cookie, headers: { 'X-Requested-With': 'fetch' },
    body: { house_id: h.id, name: 'Airbnb', url: `http://127.0.0.1:${feedServer.address().port}/cal.ics` } });
  assert.equal(add.status, 201, add.text);
  assert.equal(add.json.result.count, 1);
  const q = await req('GET', `/api/houses/casa-campo-lety/quote?checkin=${day(21)}&checkout=${day(22)}&guests=2`);
  assert.equal(q.json.available, false);
  const book = await req('POST', '/api/bookings', { body: guest({ house: 'casa-campo-lety', checkin: day(19), checkout: day(21) }) });
  assert.equal(book.status, 409);
  // Limpieza automática para la salida de Airbnb
  assert.ok(db.prepare(`SELECT 1 FROM cleaning_tasks WHERE source_key LIKE 'ext:%' AND date = ?`).get(day(23)));
  // La exportación hacia Airbnb no le devuelve sus propias reservas
  const exp = await req('GET', `/ical/${h.ical_token}.ics?para=${db.prepare('SELECT id FROM ical_feeds').get().id}`);
  assert.doesNotMatch(exp.text, /Airbnb/);
});

test('días de limpieza entre reservas', async () => {
  const h = db.prepare(`SELECT * FROM houses WHERE slug = 'casa-pueblo-bello'`).get();
  db.prepare('UPDATE houses SET cleaning_buffer_days = 1 WHERE id = ?').run(h.id);
  // Hay una reserva confirmada que sale el día 13: el 13 queda para limpieza
  const q = await req('GET', `/api/houses/casa-pueblo-bello/quote?checkin=${day(13)}&checkout=${day(15)}&guests=2`);
  assert.equal(q.json.available, false);
  const q2 = await req('GET', `/api/houses/casa-pueblo-bello/quote?checkin=${day(14)}&checkout=${day(15)}&guests=2`);
  assert.equal(q2.json.available, true);
  db.prepare('UPDATE houses SET cleaning_buffer_days = 0 WHERE id = ?').run(h.id);
});

test('panel: login obligatorio, contraseña incorrecta rechazada y protección CSRF', async () => {
  assert.equal((await req('GET', '/api/admin/dashboard')).status, 401);
  assert.equal((await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'admin123' } })).status, 401);
  const login = await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'prueba-segura-123' } });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await req('GET', '/api/admin/dashboard', { cookie })).status, 200);
  // Sin la cabecera X-Requested-With no se puede modificar nada (evita ataques CSRF)
  assert.equal((await req('POST', '/api/admin/houses', { cookie, body: { name: 'X' } })).status, 403);
  const created = await req('POST', '/api/admin/houses', { cookie, headers: { 'X-Requested-With': 'fetch' },
    body: { name: 'Casa Nueva de Prueba', price_night: 250000, max_guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 } });
  assert.equal(created.status, 201, created.text);
  assert.equal(created.json.house.slug, 'casa-nueva-de-prueba');
  // El panel HTML redirige al login sin sesión
  const page = await req('GET', '/admin/');
  assert.equal(page.status, 302);
});

test('reseñas solo de huéspedes con estadía completada', async () => {
  const r = await req('POST', '/api/bookings', { body: guest({ checkin: day(60), checkout: day(62) }) });
  await req('POST', `/api/bookings/${r.json.code}/demo-approve`, { body: { t: r.json.token, reference: r.json.checkout.reference } });
  const token = U.randomToken(24);
  db.prepare(`UPDATE bookings SET status = 'completed', review_token = ? WHERE code = ?`).run(token, r.json.code);
  assert.equal((await req('POST', '/api/reviews', { body: { token: 'falso', rating: 5, comment: 'Excelente lugar' } })).status, 404);
  assert.equal((await req('POST', '/api/reviews', { body: { token, rating: 5, comment: 'Excelente lugar, muy limpio.' } })).status, 201);
  assert.equal((await req('POST', '/api/reviews', { body: { token, rating: 1, comment: 'Intento duplicado de reseña' } })).status, 409);
  const h = await req('GET', '/api/houses/casa-pueblo-bello');
  assert.equal(h.json.house.rating.count, 1);
  assert.equal(h.json.house.reviews[0].author, 'Ana P.');
});

test('cabeceras de seguridad', async () => {
  const r = await req('GET', '/');
  assert.match(r.headers.get('content-security-policy'), /form-action 'self' https:\/\/checkout\.wompi\.co/);
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('checkout real de Wompi: firma de integridad y URL de regreso', async () => {
  const prev = { mode: config.paymentsMode, secret: config.wompi.integritySecret, key: config.wompi.publicKey };
  config.paymentsMode = 'wompi'; config.wompi.integritySecret = 'test_integrity_abc'; config.wompi.publicKey = 'pub_test_123';
  try {
    const r = await req('POST', '/api/bookings', { body: guest({ checkin: day(80), checkout: day(82) }) });
    assert.equal(r.status, 201, r.text);
    const f = r.json.checkout.fields;
    assert.equal(r.json.checkout.action, 'https://checkout.wompi.co/p/');
    assert.equal(f['amount-in-cents'], '60000000');
    assert.equal(f['signature:integrity'], U.sha256(`${f.reference}60000000COPtest_integrity_abc`));
    assert.doesNotMatch(f['redirect-url'], /\?/);
    // Wompi regresa agregando ?id=
    const back = await req('GET', new URL(f['redirect-url']).pathname + '?id=12345-1700000000-99999');
    assert.equal(back.status, 302);
    assert.match(back.headers.get('location'), new RegExp(`code=${r.json.code}&t=.+&id=12345-1700000000-99999`));
  } finally { config.paymentsMode = prev.mode; config.wompi.integritySecret = prev.secret; config.wompi.publicKey = prev.key; }
});

test('subida de fotos: se convierten a WebP y se rechazan archivos que no son imagen/video', async () => {
  const login = await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'prueba-segura-123' } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const sharp = require('sharp');
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#4caf50' } }).png().toBuffer();
  const form = new FormData();
  form.append('files', new Blob([png], { type: 'image/png' }), 'foto.png');
  form.append('files', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'falso.png');
  const res = await fetch(base + '/api/admin/houses/1/media', { method: 'POST', body: form, headers: { Cookie: cookie, 'X-Requested-With': 'fetch' } });
  const j = await res.json();
  assert.equal(res.status, 200);
  assert.equal(j.added, 1);
  assert.equal(j.errors.length, 1);
  const last = j.media[j.media.length - 1];
  assert.match(last.src, /^\/uploads\/[a-f0-9]{24}\.webp$/);
  const img = await fetch(base + last.src);
  assert.equal(img.headers.get('content-type'), 'image/webp');
});

test('correo configurable desde el panel; la contraseña se guarda cifrada y nunca se devuelve', async () => {
  const login = await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'prueba-segura-123' } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const H = { 'X-Requested-With': 'fetch' };
  const before = await req('GET', '/api/admin/email', { cookie });
  assert.equal(before.json.user, 'mutto546@gmail.com');
  assert.equal(before.json.active, 'none');
  const put = await req('PUT', '/api/admin/email', { cookie, headers: H, body: { user: 'otro@gmail.com', password: 'abcd efgh ijkl mnop', fromName: 'Casas', notifyEmail: 'socio@gmail.com' } });
  assert.equal(put.status, 200, put.text);
  const after = await req('GET', '/api/admin/email', { cookie });
  assert.equal(after.json.user, 'otro@gmail.com');
  assert.equal(after.json.hasPassword, true);
  assert.equal(after.json.active, 'panel');
  assert.doesNotMatch(after.text, /abcd/);
  const stored = db.prepare(`SELECT value FROM settings WHERE key = 'smtp_pass_enc'`).get().value;
  assert.doesNotMatch(stored, /abcdefgh/);
  assert.equal(require('../server/secret').decrypt(stored), 'abcdefghijklmnop');
  assert.equal(require('../server/mailer').notifyEmail(), 'socio@gmail.com');
  // Sin cambiar la contraseña (campo vacío) se conserva
  await req('PUT', '/api/admin/email', { cookie, headers: H, body: { user: 'otro@gmail.com', password: '', notifyEmail: 'socio@gmail.com' } });
  assert.equal((await req('GET', '/api/admin/email', { cookie })).json.hasPassword, true);
  await req('PUT', '/api/admin/email', { cookie, headers: H, body: { user: 'mutto546@gmail.com', removePassword: true } });
});

test('cómo llegar: coordenadas privadas hasta confirmar la reserva, Google Maps/Waze para el huésped', async () => {
  const { parseCoords } = require('../server/location');
  assert.deepEqual(parseCoords('10.4235, -73.5791'), { lat: 10.4235, lng: -73.5791 });
  assert.deepEqual(parseCoords('https://www.google.com/maps/place/Casa/@10.41,-73.57,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.4235112!4d-73.5791234'), { lat: 10.4235112, lng: -73.5791234 });
  assert.equal(parseCoords('hola'), null);

  const login = await req('POST', '/api/admin/login', { body: { username: 'admin', password: 'prueba-segura-123' } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const H = { 'X-Requested-With': 'fetch' };
  const cur = (await req('GET', '/api/admin/houses/1', { cookie })).json.house;
  const body = { ...cur, amenities: cur.amenities, map_url: '10.4235112, -73.5791234', arrival_instructions: 'Portón verde. Llamar al llegar.', tour_url: 'https://my.matterport.com/show/?m=abc123' };
  const put = await req('PUT', '/api/admin/houses/1', { cookie, headers: H, body });
  assert.equal(put.status, 200, put.text);
  assert.equal(put.json.house.latitude, 10.4235112);
  // Recorrido de un sitio no permitido → rechazado
  const bad = await req('PUT', '/api/admin/houses/1', { cookie, headers: H, body: { ...body, tour_url: 'https://evil.example.com/tour' } });
  assert.equal(bad.status, 400);

  // Público: solo zona aproximada, nunca las coordenadas exactas
  const pub = await req('GET', '/api/houses/casa-pueblo-bello');
  assert.doesNotMatch(pub.text, /10\.4235|73\.5791/);
  assert.match(pub.json.house.approxMap, /openstreetmap/);
  assert.equal(pub.json.house.tourUrl, 'https://my.matterport.com/show/?m=abc123');

  // Reserva pendiente: sin ubicación. Pagada: con Google Maps, Waze e indicaciones
  const r = await req('POST', '/api/bookings', { body: guest({ checkin: day(100), checkout: day(102) }) });
  const pending = await req('GET', `/api/bookings/${r.json.code}?t=${r.json.token}`);
  assert.equal(pending.json.house.arrival, null);
  await req('POST', `/api/bookings/${r.json.code}/demo-approve`, { body: { t: r.json.token, reference: r.json.checkout.reference } });
  const ok = await req('GET', `/api/bookings/${r.json.code}?t=${r.json.token}`);
  assert.match(ok.json.house.arrival.google, /destination=10\.4235112,-73\.5791234/);
  assert.match(ok.json.house.arrival.waze, /waze\.com\/ul\?ll=10\.4235112,-73\.5791234/);
  assert.equal(ok.json.house.arrival.instructions, 'Portón verde. Llamar al llegar.');
});
