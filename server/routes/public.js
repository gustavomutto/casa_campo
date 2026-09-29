'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { db, getSetting } = require('../db');
const config = require('../config');
const U = require('../util');
const { HttpError } = U;
const { quote, assertAvailable, publicCalendar } = require('../availability');
const { publicHouse } = require('../houses');
const payments = require('../payments');
const ical = require('../ical');
const AMENITIES = require('../amenities');
const { directionLinks } = require('../location');

const router = express.Router();

const bookingLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' } });
const lookupLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' } });

function houseBySlug(slug) {
  const h = db.prepare('SELECT * FROM houses WHERE slug = ? AND active = 1').get(String(slug));
  if (!h) throw new HttpError(404, 'Casa no encontrada.');
  return h;
}

function bookingForGuest(code, token) {
  const b = db.prepare('SELECT * FROM bookings WHERE code = ?').get(String(code || '').toUpperCase());
  if (!b || !token || !U.safeEqual(b.access_token, token)) throw new HttpError(404, 'Reserva no encontrada.');
  return b;
}

// ------------------------------------------------------------ Información general
router.get('/api/site', (req, res) => {
  res.json({
    name: config.siteName,
    paymentsMode: config.paymentsMode,
    contact: {
      phone: getSetting('contact_phone'), email: getSetting('contact_email'),
      instagram: getSetting('instagram'), facebook: getSetting('facebook'), tiktok: getSetting('tiktok'),
      address: getSetting('address'),
    },
    about: getSetting('about'),
    amenities: Object.fromEntries(Object.entries(AMENITIES).map(([k, [label, icon]]) => [k, { label, icon }])),
  });
});

router.get('/api/terms', (req, res) => res.json({ terms: getSetting('terms') }));

// ------------------------------------------------------------ Casas
router.get('/api/houses', (req, res) => {
  const { checkin, checkout } = req.query;
  const guests = Number(req.query.guests) || 1;
  const houses = db.prepare('SELECT * FROM houses WHERE active = 1 ORDER BY position, id').all();
  const withDates = U.isDate(checkin) && U.isDate(checkout) && checkout > checkin;
  const list = houses.filter(h => h.max_guests >= guests).map(h => {
    const out = publicHouse(h);
    if (withDates) {
      try {
        assertAvailable(h.id, checkin, checkout);
        const q = quote(h, checkin, checkout, guests);
        out.available = true; out.quote = { total: q.total, nights: q.nights };
      } catch (err) { out.available = false; out.unavailableReason = err.message; }
    }
    return out;
  });
  res.json({ houses: list });
});

router.get('/api/houses/:slug', (req, res) => {
  res.json({ house: publicHouse(houseBySlug(req.params.slug), { full: true }) });
});

router.get('/api/houses/:slug/calendar', (req, res) => {
  const h = houseBySlug(req.params.slug);
  const from = U.isDate(req.query.from) ? req.query.from : U.today();
  const to = U.isDate(req.query.to) ? req.query.to : U.addDays(from, 400);
  if (U.diffDays(from, to) > 800) throw new HttpError(400, 'Rango demasiado grande.');
  res.json({ today: U.today(), minNights: h.min_nights, ...publicCalendar(h.id, from, to),
    seasons: db.prepare('SELECT name, start_date, end_date, price_night, min_nights FROM seasons WHERE house_id = ? AND end_date >= ?').all(h.id, from) });
});

router.get('/api/houses/:slug/quote', (req, res) => {
  const h = houseBySlug(req.params.slug);
  const checkin = U.date(req.query.checkin, 'llegada');
  const checkout = U.date(req.query.checkout, 'salida');
  const guests = U.int(req.query.guests || 1, { min: 1, max: 100, field: 'huéspedes' });
  const q = quote(h, checkin, checkout, guests);
  let available = true; let reason = null;
  try { assertAvailable(h.id, checkin, checkout); } catch (err) { available = false; reason = err.message; }
  res.json({ quote: q, available, reason });
});

// ------------------------------------------------------------ Reservas
router.post('/api/bookings', bookingLimiter, async (req, res) => {
  const b = req.body || {};
  const h = houseBySlug(b.house);
  const checkin = U.date(b.checkin, 'llegada');
  const checkout = U.date(b.checkout, 'salida');
  const guests = U.int(b.guests, { min: 1, max: 100, field: 'huéspedes' });
  const name = U.str(b.name, { min: 3, max: 120, field: 'nombre' });
  const email = U.email(b.email);
  const phone = U.str(b.phone, { min: 7, max: 30, field: 'teléfono' });
  if (!/^[+\d\s()-]{7,30}$/.test(phone)) throw new HttpError(400, 'Teléfono inválido.');
  const documentId = U.str(b.document, { max: 30, field: 'documento' });
  const notes = U.str(b.notes, { max: 1000, field: 'mensaje' });
  if (b.acceptTerms !== true) throw new HttpError(400, 'Debes aceptar los términos y la política de cancelación.');

  // Antes de apartar fechas leemos Airbnb/Booking otra vez si la última lectura tiene más de 2 minutos
  await ical.syncHouseIfStale(h.id, 120).catch(() => {});

  const booking = db.transaction(() => {
    const q = quote(h, checkin, checkout, guests);
    assertAvailable(h.id, checkin, checkout);
    let code; do { code = U.bookingCode(); } while (db.prepare('SELECT 1 FROM bookings WHERE code = ?').get(code));
    const info = db.prepare(`INSERT INTO bookings(code, house_id, guest_name, guest_email, guest_phone, guest_document, guests,
        checkin, checkout, nights, nights_total, cleaning_fee, total, deposit_amount, status, hold_expires_at, access_token, guest_notes, price_breakdown)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending_payment', ?, ?, ?, ?)`)
      .run(code, h.id, name, email, phone, documentId, guests, checkin, checkout, q.nights, q.nightsTotal, q.cleaningFee, q.total, q.deposit,
        Date.now() + config.holdMinutes * 60e3, U.randomToken(24), notes, JSON.stringify(q.breakdown));
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
  })();

  const checkoutData = payments.createCheckout(booking, 'deposit');
  res.status(201).json({ code: booking.code, token: booking.access_token, holdMinutes: config.holdMinutes, checkout: checkoutData });
});

router.get('/api/bookings/:code', (req, res) => {
  const b = bookingForGuest(req.params.code, req.query.t);
  const h = db.prepare('SELECT * FROM houses WHERE id = ?').get(b.house_id);
  const pays = db.prepare(`SELECT reference, amount, purpose, status, method, created_at FROM payments WHERE booking_id = ? AND status != 'CREATED' ORDER BY id`).all(b.id);
  const review = db.prepare('SELECT rating FROM reviews WHERE booking_id = ?').get(b.id);
  res.json({
    booking: {
      code: b.code, status: b.status, checkin: b.checkin, checkout: b.checkout, nights: b.nights, guests: b.guests,
      guestName: b.guest_name, guestEmail: b.guest_email, total: b.total, cleaningFee: b.cleaning_fee, nightsTotal: b.nights_total,
      deposit: b.deposit_amount, amountPaid: b.amount_paid, balance: b.total - b.amount_paid,
      holdExpiresAt: b.status === 'pending_payment' ? b.hold_expires_at : null,
      breakdown: JSON.parse(b.price_breakdown || '[]'), payments: pays,
      canReview: b.status === 'completed' && !review && !!b.review_token, reviewToken: b.status === 'completed' && !review ? b.review_token : null,
    },
    house: { slug: h.slug, name: h.name, location: h.location, checkinTime: h.checkin_time, checkoutTime: h.checkout_time,
      cover: publicHouse(h).cover,
      // Cómo llegar: solo para reservas pagadas
      arrival: ['confirmed', 'completed'].includes(b.status) ? {
        instructions: h.arrival_instructions,
        ...(h.latitude != null ? directionLinks(h.latitude, h.longitude) : {}),
      } : null },
    paymentsMode: config.paymentsMode,
  });
});

router.post('/api/bookings/:code/pay', bookingLimiter, (req, res) => {
  const b = bookingForGuest(req.params.code, req.body?.t);
  let purpose;
  if (b.status === 'pending_payment' || b.status === 'expired') {
    // Si el apartado venció, intentamos apartar de nuevo (si las fechas siguen libres)
    db.transaction(() => {
      assertAvailable(b.house_id, b.checkin, b.checkout, { excludeBookingId: b.id });
      if (b.checkin < U.today()) throw new HttpError(400, 'La fecha de llegada ya pasó.');
      db.prepare(`UPDATE bookings SET status = 'pending_payment', hold_expires_at = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(Date.now() + config.holdMinutes * 60e3, b.id);
    })();
    purpose = 'deposit';
  } else if (b.status === 'confirmed' && b.total > b.amount_paid) {
    purpose = 'balance';
  } else {
    throw new HttpError(400, 'Esta reserva no tiene pagos pendientes.');
  }
  const fresh = db.prepare('SELECT * FROM bookings WHERE id = ?').get(b.id);
  res.json({ checkout: payments.createCheckout(fresh, purpose) });
});

// El huésped regresa de Wompi con ?id=TRANSACCION: consultamos a Wompi directamente
router.post('/api/bookings/:code/verify', async (req, res) => {
  const b = bookingForGuest(req.params.code, req.body?.t);
  if (config.paymentsMode !== 'wompi') throw new HttpError(400, 'Pagos reales desactivados.');
  const tx = await payments.fetchTransaction(req.body?.id);
  if (!tx || !String(tx.reference || '').startsWith(b.code + '-')) throw new HttpError(400, 'La transacción no corresponde a esta reserva.');
  const r = await payments.applyTransaction(tx);
  res.json({ status: tx.status, result: r });
});

router.post('/api/bookings/:code/demo-approve', async (req, res) => {
  const b = bookingForGuest(req.params.code, req.body?.t);
  if (!String(req.body?.reference || '').startsWith(b.code + '-')) throw new HttpError(400, 'Referencia inválida.');
  res.json(await payments.approveDemo(req.body.reference));
});

router.post('/api/bookings/lookup', lookupLimiter, (req, res) => {
  const code = U.str(req.body?.code, { min: 4, max: 20, field: 'código' }).toUpperCase();
  const email = U.email(req.body?.email);
  const b = db.prepare('SELECT code, access_token, guest_email FROM bookings WHERE code = ?').get(code);
  if (!b || b.guest_email !== email) throw new HttpError(404, 'No encontramos una reserva con ese código y correo.');
  res.json({ code: b.code, t: b.access_token });
});

// Regreso desde Wompi: /r/CODIGO/TOKEN?id=TRANSACCION → página de la reserva
router.get('/r/:code/:token', (req, res) => {
  const q = new URLSearchParams({ code: String(req.params.code), t: String(req.params.token) });
  if (req.query.id && /^[\w-]{5,80}$/.test(String(req.query.id))) q.set('id', String(req.query.id));
  res.redirect(302, '/reserva.html?' + q);
});

// ------------------------------------------------------------ Reseñas verificadas
router.get('/api/reviews/:token', (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE review_token = ?').get(String(req.params.token));
  if (!b) throw new HttpError(404, 'Enlace de reseña inválido.');
  const h = db.prepare('SELECT name, slug FROM houses WHERE id = ?').get(b.house_id);
  const done = !!db.prepare('SELECT 1 FROM reviews WHERE booking_id = ?').get(b.id);
  res.json({ house: h, guestName: b.guest_name.split(' ')[0], checkin: b.checkin, checkout: b.checkout, done });
});

router.post('/api/reviews', lookupLimiter, (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE review_token = ?').get(String(req.body?.token || ''));
  if (!b || b.status !== 'completed') throw new HttpError(404, 'Enlace de reseña inválido.');
  const rating = U.int(req.body.rating, { min: 1, max: 5, field: 'calificación' });
  const comment = U.str(req.body.comment, { min: 10, max: 2000, field: 'comentario' });
  const parts = b.guest_name.trim().split(/\s+/);
  const author = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
  try {
    db.prepare('INSERT INTO reviews(house_id, booking_id, author, rating, comment) VALUES(?, ?, ?, ?, ?)').run(b.house_id, b.id, author, rating, comment);
  } catch { throw new HttpError(409, 'Ya dejaste una reseña para esta estadía. ¡Gracias!'); }
  res.status(201).json({ ok: true });
});

// ------------------------------------------------------------ Webhook de Wompi
router.post('/api/webhooks/wompi', async (req, res) => {
  if (config.paymentsMode !== 'wompi') return res.status(404).end();
  const body = req.body;
  if (!payments.verifyEvent(body, req.get('X-Event-Checksum'))) {
    console.warn('[wompi] evento con firma inválida rechazado');
    return res.status(401).json({ error: 'firma inválida' });
  }
  if (body.event === 'transaction.updated' && body.data?.transaction) {
    await payments.applyTransaction(body.data.transaction);
  }
  res.json({ ok: true });
});

// ------------------------------------------------------------ Calendarios iCal para Airbnb / Booking
router.get('/ical/:file', (req, res) => {
  const m = String(req.params.file).match(/^([\w-]{20,})\.ics$/);
  if (!m) throw new HttpError(404, 'No encontrado');
  const token = m[1];
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Cache-Control', 'no-cache');
  const cleaningToken = getSetting('cleaning_ical_token');
  if (cleaningToken && U.safeEqual(token, 'limpieza-' + cleaningToken)) return res.send(ical.exportCleaning());
  const house = db.prepare('SELECT * FROM houses WHERE ical_token = ?').get(token);
  if (!house) throw new HttpError(404, 'No encontrado');
  const para = Number(req.query.para) || null;
  res.send(ical.exportHouse(house, para));
});

module.exports = router;
