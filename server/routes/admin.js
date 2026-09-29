'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { db, getSetting, setSetting } = require('../db');
const config = require('../config');
const U = require('../util');
const { HttpError } = U;
const auth = require('../auth');
const { mediaFor, ratingFor } = require('../houses');
const media = require('../media');
const ical = require('../ical');
const { refreshCleaningTasks, listTasks } = require('../cleaning');
const { ACTIVE_BOOKING_SQL } = require('../availability');
const AMENITIES = require('../amenities');
const mailer = require('../mailer');
const { encrypt } = require('../secret');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false,
  skipSuccessfulRequests: true, message: { error: 'Demasiados intentos fallidos. Espera 15 minutos.' } });

// ------------------------------------------------------------ Sesión
router.post('/api/admin/login', loginLimiter, (req, res) => {
  const r = auth.login(req.body?.username, req.body?.password);
  if (!r) throw new HttpError(401, 'Usuario o contraseña incorrectos.');
  auth.setSessionCookie(res, r.token);
  res.json({ ok: true, username: r.admin.username });
});
router.post('/api/admin/logout', (req, res) => { auth.logout(req, res); res.json({ ok: true }); });

router.use('/api/admin', auth.requireAdmin);

router.get('/api/admin/me', (req, res) => res.json({ username: req.admin.username, paymentsMode: config.paymentsMode, baseUrl: config.baseUrl }));

router.post('/api/admin/password', (req, res) => {
  auth.changePassword(req.admin.id, req.body?.current, req.body?.next);
  auth.logout(req, res);
  res.json({ ok: true });
});

// ------------------------------------------------------------ Resumen
router.get('/api/admin/dashboard', (req, res) => {
  const t = U.today();
  const monthStart = t.slice(0, 8) + '01';
  const monthEnd = U.addDays(new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 1)).toISOString().slice(0, 10), 0);
  const houses = db.prepare('SELECT id, name FROM houses WHERE active = 1').all();
  const daysInMonth = U.diffDays(monthStart, monthEnd);

  const occupancy = houses.map(h => {
    const nights = new Set();
    for (const b of db.prepare(`SELECT checkin, checkout FROM bookings WHERE house_id = ? AND status IN ('confirmed','completed','conflict') AND checkout > ? AND checkin < ?`).all(h.id, monthStart, monthEnd))
      for (const n of U.eachNight(b.checkin > monthStart ? b.checkin : monthStart, b.checkout < monthEnd ? b.checkout : monthEnd)) nights.add(n);
    for (const e of db.prepare('SELECT start_date, end_date FROM external_events WHERE house_id = ? AND is_reservation = 1 AND end_date > ? AND start_date < ?').all(h.id, monthStart, monthEnd))
      for (const n of U.eachNight(e.start_date > monthStart ? e.start_date : monthStart, e.end_date < monthEnd ? e.end_date : monthEnd)) nights.add(n);
    return { house: h.name, nights: nights.size, percent: Math.round(nights.size / daysInMonth * 100) };
  });

  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'APPROVED' AND updated_at >= ?`).get(monthStart + ' 00:00:00').s;
  const upcoming = db.prepare(`SELECT b.code, b.id, b.guest_name, b.guests, b.checkin, b.checkout, b.status, b.total, b.amount_paid, h.name AS house
     FROM bookings b JOIN houses h ON h.id = b.house_id WHERE b.status IN ('confirmed','conflict') AND b.checkout >= ? ORDER BY b.checkin LIMIT 8`).all(t);
  const externalUpcoming = db.prepare(`SELECT e.start_date, e.end_date, e.summary, f.name AS feed, h.name AS house FROM external_events e
     JOIN ical_feeds f ON f.id = e.feed_id JOIN houses h ON h.id = e.house_id WHERE e.is_reservation = 1 AND e.end_date >= ? ORDER BY e.start_date LIMIT 8`).all(t);
  refreshCleaningTasks();
  const cleaning = listTasks(t, U.addDays(t, 2)).filter(x => x.status === 'pendiente');
  const alerts = [];
  for (const c of db.prepare(`SELECT b.code, h.name FROM bookings b JOIN houses h ON h.id = b.house_id WHERE b.status = 'conflict'`).all())
    alerts.push({ level: 'danger', text: `Reserva ${c.code} (${c.name}) en conflicto: revisa si hay doble reserva o un pago que reembolsar.` });
  for (const f of db.prepare(`SELECT f.name, h.name AS house, f.last_error FROM ical_feeds f JOIN houses h ON h.id = f.house_id WHERE f.last_status = 'error'`).all())
    alerts.push({ level: 'warn', text: `No se pudo leer el calendario de ${f.name} para ${f.house}: ${f.last_error}` });
  for (const h of db.prepare(`SELECT h.name FROM houses h WHERE h.active = 1 AND NOT EXISTS (SELECT 1 FROM ical_feeds f WHERE f.house_id = h.id)`).all())
    alerts.push({ level: 'info', text: `${h.name} no está conectada a Airbnb/Booking. Conéctala en el menú "Airbnb / Booking" para evitar dobles reservas.` });
  if (config.paymentsMode === 'demo') alerts.push({ level: 'warn', text: 'Pagos en MODO DEMO: nadie paga dinero real. Configura las llaves de Wompi antes de publicar.' });

  res.json({ today: t, occupancy, income, upcoming, externalUpcoming, cleaning, alerts,
    pendingPayment: db.prepare(`SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending_payment' AND hold_expires_at > ?`).get(Date.now()).n });
});

// ------------------------------------------------------------ Casas
function houseInput(body, existing = {}) {
  const b = body || {};
  const amenities = Array.isArray(b.amenities) ? b.amenities.filter(k => AMENITIES[k]) : JSON.parse(existing.amenities || '[]');
  const out = {
    name: U.str(b.name, { min: 3, max: 100, field: 'nombre' }),
    location: U.str(b.location, { max: 120, field: 'ubicación' }),
    short_desc: U.str(b.short_desc, { max: 200, field: 'descripción corta' }),
    description: U.str(b.description, { max: 6000, field: 'descripción' }),
    house_rules: U.str(b.house_rules, { max: 4000, field: 'reglas' }),
    price_night: U.int(b.price_night, { min: 10000, max: 100000000, field: 'precio por noche' }),
    price_weekend: U.int(b.price_weekend, { min: 10000, max: 100000000, field: 'precio fin de semana', optional: true }),
    cleaning_fee: U.int(b.cleaning_fee || 0, { min: 0, max: 10000000, field: 'tarifa de limpieza' }),
    max_guests: U.int(b.max_guests, { min: 1, max: 100, field: 'huéspedes' }),
    bedrooms: U.int(b.bedrooms, { min: 0, max: 50, field: 'habitaciones' }),
    beds: U.int(b.beds, { min: 0, max: 100, field: 'camas' }),
    bathrooms: U.int(b.bathrooms, { min: 0, max: 50, field: 'baños' }),
    min_nights: U.int(b.min_nights || 1, { min: 1, max: 60, field: 'noches mínimas' }),
    checkin_time: /^\d{2}:\d{2}$/.test(b.checkin_time) ? b.checkin_time : '15:00',
    checkout_time: /^\d{2}:\d{2}$/.test(b.checkout_time) ? b.checkout_time : '11:00',
    cleaning_buffer_days: U.int(b.cleaning_buffer_days || 0, { min: 0, max: 7, field: 'días de limpieza' }),
    deposit_percent: U.int(b.deposit_percent || 100, { min: 10, max: 100, field: '% a pagar al reservar' }),
    badge: U.str(b.badge, { max: 30, field: 'etiqueta' }),
    map_url: U.str(b.map_url, { max: 500, field: 'mapa' }),
    active: b.active === false || b.active === 0 ? 0 : 1,
    amenities: JSON.stringify(amenities),
  };
  if (out.map_url && !/^https:\/\//.test(out.map_url)) throw new HttpError(400, 'El enlace del mapa debe empezar por https://');
  return out;
}

function adminHouse(h) {
  return {
    ...h, amenities: JSON.parse(h.amenities || '[]'), media: mediaFor(h.id), rating: ratingFor(h.id),
    seasons: db.prepare('SELECT * FROM seasons WHERE house_id = ? ORDER BY start_date').all(h.id),
    ical_export_url: `${config.baseUrl}/ical/${h.ical_token}.ics`,
    feeds: db.prepare('SELECT * FROM ical_feeds WHERE house_id = ? ORDER BY id').all(h.id)
      .map(f => ({ ...f, export_url: `${config.baseUrl}/ical/${h.ical_token}.ics?para=${f.id}` })),
  };
}

router.get('/api/admin/houses', (req, res) => {
  res.json({ houses: db.prepare('SELECT * FROM houses ORDER BY position, id').all().map(adminHouse), amenities: AMENITIES });
});
router.get('/api/admin/houses/:id', (req, res) => {
  const h = db.prepare('SELECT * FROM houses WHERE id = ?').get(Number(req.params.id));
  if (!h) throw new HttpError(404, 'Casa no encontrada.');
  res.json({ house: adminHouse(h), amenities: AMENITIES });
});
router.post('/api/admin/houses', (req, res) => {
  const data = houseInput(req.body);
  let slug = U.slugify(data.name); let i = 2;
  while (db.prepare('SELECT 1 FROM houses WHERE slug = ?').get(slug)) slug = `${U.slugify(data.name)}-${i++}`;
  const pos = db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM houses').get().p;
  const cols = Object.keys(data);
  const info = db.prepare(`INSERT INTO houses(${cols.join(',')}, slug, position, ical_token) VALUES(${cols.map(c => '@' + c).join(',')}, @slug, @pos, @tok)`)
    .run({ ...data, slug, pos, tok: U.randomToken(24) });
  res.status(201).json({ house: adminHouse(db.prepare('SELECT * FROM houses WHERE id = ?').get(info.lastInsertRowid)) });
});
router.put('/api/admin/houses/:id', (req, res) => {
  const h = db.prepare('SELECT * FROM houses WHERE id = ?').get(Number(req.params.id));
  if (!h) throw new HttpError(404, 'Casa no encontrada.');
  const data = houseInput(req.body, h);
  db.prepare(`UPDATE houses SET ${Object.keys(data).map(c => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id: h.id });
  res.json({ house: adminHouse(db.prepare('SELECT * FROM houses WHERE id = ?').get(h.id)) });
});
router.delete('/api/admin/houses/:id', (req, res) => {
  const id = Number(req.params.id);
  const hasBookings = db.prepare('SELECT 1 FROM bookings WHERE house_id = ? LIMIT 1').get(id);
  if (hasBookings) {
    db.prepare('UPDATE houses SET active = 0 WHERE id = ?').run(id);
    return res.json({ ok: true, deactivated: true });
  }
  for (const m of db.prepare('SELECT * FROM media WHERE house_id = ?').all(id)) media.removeFiles(m);
  db.prepare('DELETE FROM houses WHERE id = ?').run(id);
  res.json({ ok: true });
});
router.post('/api/admin/houses/order', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
  const upd = db.prepare('UPDATE houses SET position = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))();
  res.json({ ok: true });
});

// ------------------------------------------------------------ Fotos y videos
router.post('/api/admin/houses/:id/media', media.upload.array('files', 20), async (req, res) => {
  const h = db.prepare('SELECT id FROM houses WHERE id = ?').get(Number(req.params.id));
  if (!h) throw new HttpError(404, 'Casa no encontrada.');
  const files = req.files || [];
  if (!files.length) throw new HttpError(400, 'No se recibió ningún archivo.');
  const added = []; const errors = [];
  let pos = db.prepare('SELECT COALESCE(MAX(position),0) AS p FROM media WHERE house_id = ?').get(h.id).p;
  for (const f of files) {
    try {
      const m = await media.processUpload(f);
      const info = db.prepare('INSERT INTO media(house_id, kind, file, thumb, width, height, position) VALUES(?,?,?,?,?,?,?)')
        .run(h.id, m.kind, m.file, m.thumb || null, m.width || null, m.height || null, ++pos);
      added.push(info.lastInsertRowid);
    } catch (err) { errors.push(err.status ? err.message : `Error procesando "${f.originalname}".`); if (!err.status) console.error(err); }
  }
  res.json({ added: added.length, errors, media: mediaFor(h.id) });
});
router.post('/api/admin/houses/:id/youtube', (req, res) => {
  const id = Number(req.params.id);
  const vid = media.youtubeId(req.body?.url);
  const pos = db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM media WHERE house_id = ?').get(id).p;
  db.prepare(`INSERT INTO media(house_id, kind, url, position) VALUES(?, 'youtube', ?, ?)`).run(id, vid, pos);
  res.json({ media: mediaFor(id) });
});
router.post('/api/admin/houses/:id/media/order', (req, res) => {
  const id = Number(req.params.id);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
  const upd = db.prepare('UPDATE media SET position = ? WHERE id = ? AND house_id = ?');
  db.transaction(() => ids.forEach((mid, i) => upd.run(i, mid, id)))();
  res.json({ media: mediaFor(id) });
});
router.put('/api/admin/media/:id', (req, res) => {
  db.prepare('UPDATE media SET caption = ? WHERE id = ?').run(U.str(req.body?.caption, { max: 200, field: 'descripción' }), Number(req.params.id));
  res.json({ ok: true });
});
router.delete('/api/admin/media/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(Number(req.params.id));
  if (!m) throw new HttpError(404, 'No encontrado.');
  db.prepare('DELETE FROM media WHERE id = ?').run(m.id);
  media.removeFiles(m);
  res.json({ media: mediaFor(m.house_id) });
});

// ------------------------------------------------------------ Temporadas (precios especiales)
router.post('/api/admin/houses/:id/seasons', (req, res) => {
  const id = Number(req.params.id);
  const start = U.date(req.body?.start_date, 'inicio'); const end = U.date(req.body?.end_date, 'fin');
  if (end < start) throw new HttpError(400, 'La fecha final debe ser igual o posterior a la inicial.');
  db.prepare('INSERT INTO seasons(house_id, name, start_date, end_date, price_night, min_nights) VALUES(?,?,?,?,?,?)').run(id,
    U.str(req.body?.name, { min: 2, max: 60, field: 'nombre' }), start, end,
    U.int(req.body?.price_night, { min: 10000, max: 100000000, field: 'precio' }),
    U.int(req.body?.min_nights, { min: 1, max: 60, field: 'noches mínimas', optional: true }));
  res.json({ seasons: db.prepare('SELECT * FROM seasons WHERE house_id = ? ORDER BY start_date').all(id) });
});
router.delete('/api/admin/seasons/:id', (req, res) => {
  db.prepare('DELETE FROM seasons WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ------------------------------------------------------------ Calendario (todas las casas)
router.get('/api/admin/calendar', (req, res) => {
  const from = U.date(req.query.from, 'desde'); const to = U.date(req.query.to, 'hasta');
  if (U.diffDays(from, to) > 120) throw new HttpError(400, 'Rango demasiado grande.');
  const houses = db.prepare('SELECT id, name, cleaning_buffer_days, active FROM houses ORDER BY position, id').all();
  const out = houses.map(h => ({
    id: h.id, name: h.name, active: h.active, bufferDays: h.cleaning_buffer_days,
    bookings: db.prepare(`SELECT id, code, guest_name, guests, checkin, checkout, status FROM bookings
      WHERE house_id = @h AND checkout > @from AND checkin < @to AND ${ACTIVE_BOOKING_SQL}`).all({ h: h.id, from, to, now: Date.now() }),
    external: db.prepare(`SELECT e.id, e.start_date, e.end_date, e.summary, e.is_reservation, f.name AS feed FROM external_events e
      JOIN ical_feeds f ON f.id = e.feed_id WHERE e.house_id = ? AND e.end_date > ? AND e.start_date < ?`).all(h.id, from, to),
    blocks: db.prepare('SELECT id, start_date, end_date, reason FROM blocks WHERE house_id = ? AND end_date > ? AND start_date < ?').all(h.id, from, to),
    cleaning: db.prepare(`SELECT id, date, status, assignee FROM cleaning_tasks WHERE house_id = ? AND date >= ? AND date < ? AND status != 'cancelada'`).all(h.id, from, to),
  }));
  res.json({ from, to, today: U.today(), houses: out });
});

router.post('/api/admin/blocks', (req, res) => {
  const house = U.int(req.body?.house_id, { min: 1, field: 'casa' });
  const start = U.date(req.body?.start_date, 'inicio'); const end = U.date(req.body?.end_date, 'fin');
  if (end <= start) throw new HttpError(400, 'La fecha final debe ser posterior a la inicial.');
  const clash = db.prepare(`SELECT code FROM bookings WHERE house_id = @h AND checkout > @s AND checkin < @e AND ${ACTIVE_BOOKING_SQL}`)
    .get({ h: house, s: start, e: end, now: Date.now() });
  if (clash) throw new HttpError(409, `Ese rango incluye la reserva ${clash.code}. Cancélala primero si quieres bloquear.`);
  db.prepare('INSERT INTO blocks(house_id, start_date, end_date, reason) VALUES(?,?,?,?)').run(house, start, end,
    U.str(req.body?.reason, { max: 200, field: 'motivo' }));
  res.status(201).json({ ok: true });
});
router.delete('/api/admin/blocks/:id', (req, res) => {
  db.prepare('DELETE FROM blocks WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ------------------------------------------------------------ Reservas
router.get('/api/admin/bookings', (req, res) => {
  const where = []; const p = {};
  if (req.query.status) { where.push('b.status = @status'); p.status = String(req.query.status); }
  else where.push(`b.status NOT IN ('expired')`);
  if (req.query.house) { where.push('b.house_id = @house'); p.house = Number(req.query.house); }
  if (req.query.q) { where.push('(b.code LIKE @q OR b.guest_name LIKE @q OR b.guest_email LIKE @q OR b.guest_phone LIKE @q)'); p.q = `%${String(req.query.q).slice(0, 60)}%`; }
  if (req.query.when === 'upcoming') where.push(`b.checkout >= '${U.today()}'`);
  if (req.query.when === 'past') where.push(`b.checkout < '${U.today()}'`);
  const rows = db.prepare(`SELECT b.*, h.name AS house_name FROM bookings b JOIN houses h ON h.id = b.house_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.checkin DESC LIMIT 300`).all(p);
  res.json({ bookings: rows.map(({ access_token, review_token, ...r }) => r) });
});
router.get('/api/admin/bookings/:id', (req, res) => {
  const b = db.prepare('SELECT b.*, h.name AS house_name FROM bookings b JOIN houses h ON h.id = b.house_id WHERE b.id = ?').get(Number(req.params.id));
  if (!b) throw new HttpError(404, 'Reserva no encontrada.');
  const pays = db.prepare('SELECT id, reference, amount, purpose, status, method, transaction_id, created_at, updated_at FROM payments WHERE booking_id = ? ORDER BY id').all(b.id);
  const { access_token, review_token, ...rest } = b;
  res.json({ booking: { ...rest, guest_link: `${config.baseUrl}/reserva.html?code=${b.code}&t=${access_token}`, breakdown: JSON.parse(b.price_breakdown || '[]') }, payments: pays });
});
router.put('/api/admin/bookings/:id', (req, res) => {
  db.prepare(`UPDATE bookings SET admin_notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(U.str(req.body?.admin_notes, { max: 4000, field: 'notas' }), Number(req.params.id));
  res.json({ ok: true });
});
router.post('/api/admin/bookings/:id/status', (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(req.params.id));
  if (!b) throw new HttpError(404, 'Reserva no encontrada.');
  const to = String(req.body?.status);
  const allowed = { cancelled: ['pending_payment', 'confirmed', 'conflict', 'expired'], confirmed: ['conflict'], completed: ['confirmed'] };
  if (!allowed[to] || !allowed[to].includes(b.status)) throw new HttpError(400, 'Cambio de estado no permitido.');
  db.prepare(`UPDATE bookings SET status = ?, hold_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(to, b.id);
  refreshCleaningTasks();
  res.json({ ok: true, note: to === 'cancelled' && b.amount_paid > 0 ? 'Recuerda hacer el reembolso desde tu panel de Wompi si aplica según tu política.' : null });
});

// ------------------------------------------------------------ Limpieza
router.get('/api/admin/cleaning', (req, res) => {
  refreshCleaningTasks();
  const from = U.isDate(req.query.from) ? req.query.from : U.addDays(U.today(), -2);
  const to = U.isDate(req.query.to) ? req.query.to : U.addDays(U.today(), 45);
  let token = getSetting('cleaning_ical_token');
  if (!token) { token = U.randomToken(18); setSetting('cleaning_ical_token', token); }
  res.json({ tasks: listTasks(from, to), icalUrl: `${config.baseUrl}/ical/limpieza-${token}.ics`, staff: getSetting('cleaning_staff') });
});
router.post('/api/admin/cleaning', (req, res) => {
  db.prepare('INSERT INTO cleaning_tasks(house_id, date, assignee, notes) VALUES(?,?,?,?)').run(
    U.int(req.body?.house_id, { min: 1, field: 'casa' }), U.date(req.body?.date),
    U.str(req.body?.assignee, { max: 80, field: 'encargado' }), U.str(req.body?.notes, { max: 500, field: 'notas' }));
  res.status(201).json({ ok: true });
});
router.put('/api/admin/cleaning/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM cleaning_tasks WHERE id = ?').get(Number(req.params.id));
  if (!t) throw new HttpError(404, 'Tarea no encontrada.');
  const status = ['pendiente', 'hecha', 'cancelada'].includes(req.body?.status) ? req.body.status : t.status;
  db.prepare(`UPDATE cleaning_tasks SET status = ?, assignee = ?, notes = ?, done_at = CASE WHEN ? = 'hecha' THEN datetime('now') ELSE NULL END WHERE id = ?`)
    .run(status, U.str(req.body?.assignee ?? t.assignee, { max: 80, field: 'encargado' }), U.str(req.body?.notes ?? t.notes, { max: 500, field: 'notas' }), status, t.id);
  if (req.body?.assignee) {
    const staff = new Set(getSetting('cleaning_staff').split('\n').filter(Boolean)); staff.add(req.body.assignee.trim());
    setSetting('cleaning_staff', [...staff].slice(-20).join('\n'));
  }
  res.json({ ok: true });
});

// ------------------------------------------------------------ Sincronización Airbnb / Booking
router.post('/api/admin/feeds', async (req, res) => {
  const house = U.int(req.body?.house_id, { min: 1, field: 'casa' });
  const name = U.str(req.body?.name, { min: 2, max: 40, field: 'plataforma' });
  const url = U.str(req.body?.url, { min: 10, max: 1000, field: 'URL' });
  if (!/^https?:\/\//i.test(url)) throw new HttpError(400, 'La URL del calendario debe empezar por https://');
  const info = db.prepare('INSERT INTO ical_feeds(house_id, name, url) VALUES(?,?,?)').run(house, name, url);
  const feed = db.prepare('SELECT * FROM ical_feeds WHERE id = ?').get(info.lastInsertRowid);
  const r = await ical.syncFeed(feed);
  refreshCleaningTasks();
  await ical.detectConflicts();
  res.status(201).json({ result: r });
});
router.delete('/api/admin/feeds/:id', (req, res) => {
  db.prepare('DELETE FROM ical_feeds WHERE id = ?').run(Number(req.params.id));
  refreshCleaningTasks();
  res.json({ ok: true });
});
router.post('/api/admin/sync', async (req, res) => {
  res.json({ results: await ical.syncAll() });
});

// ------------------------------------------------------------ Reseñas
router.get('/api/admin/reviews', (req, res) => {
  res.json({ reviews: db.prepare(`SELECT r.*, h.name AS house_name, b.code FROM reviews r JOIN houses h ON h.id = r.house_id
    LEFT JOIN bookings b ON b.id = r.booking_id ORDER BY r.created_at DESC`).all() });
});
router.put('/api/admin/reviews/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Reseña no encontrada.');
  db.prepare('UPDATE reviews SET visible = ?, host_reply = ? WHERE id = ?').run(
    req.body?.visible === undefined ? r.visible : (req.body.visible ? 1 : 0),
    req.body?.host_reply === undefined ? r.host_reply : U.str(req.body.host_reply, { max: 2000, field: 'respuesta' }), r.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------ Ajustes
const SETTING_KEYS = ['contact_phone', 'contact_email', 'instagram', 'facebook', 'tiktok', 'address', 'about', 'terms'];
router.get('/api/admin/settings', (req, res) => {
  res.json({ settings: Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)])),
    system: { paymentsMode: config.paymentsMode, wompiEnv: config.wompi.env, baseUrl: config.baseUrl,
      webhookUrl: `${config.baseUrl}/api/webhooks/wompi`, smtp: mailer.emailConfig().source !== 'none', syncMinutes: config.icalSyncMinutes } });
});
router.put('/api/admin/settings', (req, res) => {
  for (const k of SETTING_KEYS) if (req.body?.[k] !== undefined) setSetting(k, U.str(req.body[k], { max: k === 'terms' ? 20000 : 2000, field: k }));
  res.json({ ok: true });
});

// ------------------------------------------------------------ Correo (cambiable desde el panel)
router.get('/api/admin/email', (req, res) => {
  const c = mailer.emailConfig();
  res.json({
    host: getSetting('smtp_host') || 'smtp.gmail.com', port: Number(getSetting('smtp_port') || 587),
    user: getSetting('smtp_user'), fromName: getSetting('mail_from_name') || config.siteName,
    notifyEmail: getSetting('notify_email'), hasPassword: !!getSetting('smtp_pass_enc'),
    active: c.source, activeUser: c.user || null,
  });
});
router.put('/api/admin/email', (req, res) => {
  const b = req.body || {};
  const user = b.user ? U.email(b.user) : '';
  const notify = b.notifyEmail ? U.email(b.notifyEmail) : '';
  const host = U.str(b.host || 'smtp.gmail.com', { max: 120, field: 'servidor' });
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new HttpError(400, 'Servidor SMTP inválido.');
  const port = U.int(b.port || 587, { min: 1, max: 65535, field: 'puerto' });
  setSetting('smtp_user', user);
  setSetting('notify_email', notify);
  setSetting('smtp_host', host);
  setSetting('smtp_port', port);
  setSetting('mail_from_name', U.str(b.fromName, { max: 80, field: 'nombre del remitente' }));
  if (typeof b.password === 'string' && b.password.trim()) {
    // Las contraseñas de aplicación de Gmail se muestran con espacios: se quitan
    setSetting('smtp_pass_enc', encrypt(b.password.replace(/\s+/g, '')));
  }
  if (b.removePassword === true) setSetting('smtp_pass_enc', '');
  res.json({ ok: true });
});
router.post('/api/admin/email/test', async (req, res) => {
  const to = mailer.notifyEmail();
  if (!to) throw new HttpError(400, 'Primero indica el correo que recibe los avisos.');
  if (mailer.emailConfig().source === 'none') throw new HttpError(400, 'Falta la contraseña de aplicación de Gmail. Pégala arriba y pulsa "Guardar correo".');
  try {
    await mailer.sendStrict(to, 'Correo de prueba ✔', '<h2 style="margin-top:0">¡Funciona!</h2><p>Así se verán los correos que reciben tus huéspedes y tú.</p>');
  } catch (err) {
    const msg = /Invalid login|535|Username and Password not accepted/i.test(err.message)
      ? 'Gmail rechazó el usuario o la contraseña. Usa una "contraseña de aplicación" (no tu contraseña normal).'
      : 'No se pudo enviar: ' + err.message;
    throw new HttpError(400, msg);
  }
  res.json({ ok: true, to });
});

module.exports = router;
