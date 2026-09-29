'use strict';
const { db } = require('./db');
const { addDays, eachNight, diffDays, dayOfWeek, today, HttpError } = require('./util');

const MAX_ADVANCE_DAYS = 540; // se puede reservar hasta ~18 meses adelante

// Estados de reserva que ocupan el calendario
const ACTIVE_BOOKING_SQL = `(status IN ('confirmed','completed','conflict') OR (status = 'pending_payment' AND hold_expires_at > @now))`;

/**
 * Devuelve la ocupación de una casa entre from (incl.) y to (excl.).
 * occupied: noche -> { type, ref }   (reservas web, Airbnb/Booking, bloqueos manuales)
 * buffer:   noche -> true            (días de limpieza después de una salida)
 */
function getOccupancy(houseId, from, to, { excludeBookingId = null } = {}) {
  const house = db.prepare('SELECT cleaning_buffer_days FROM houses WHERE id = ?').get(houseId);
  const bufferDays = house ? house.cleaning_buffer_days : 0;
  const lookFrom = addDays(from, -Math.max(bufferDays, 0) - 1);
  const occupied = new Map();
  const buffer = new Set();
  const now = Date.now();

  const mark = (start, end, info, isReservation) => {
    for (const n of eachNight(start > lookFrom ? start : lookFrom, end < to ? end : to)) {
      if (!occupied.has(n)) occupied.set(n, info);
    }
    if (isReservation) for (let i = 0; i < bufferDays; i++) buffer.add(addDays(end, i));
  };

  const bookings = db.prepare(`SELECT id, code, checkin, checkout, status FROM bookings
     WHERE house_id = @house AND checkout > @from AND checkin < @to AND ${ACTIVE_BOOKING_SQL}`)
    .all({ house: houseId, from: lookFrom, to, now });
  for (const b of bookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    mark(b.checkin, b.checkout, { type: 'reserva', ref: b.code, status: b.status }, true);
  }

  const ext = db.prepare(`SELECT e.id, e.start_date, e.end_date, e.summary, e.is_reservation, f.name AS feed
     FROM external_events e JOIN ical_feeds f ON f.id = e.feed_id
     WHERE e.house_id = ? AND e.end_date > ? AND e.start_date < ?`).all(houseId, lookFrom, to);
  for (const e of ext) mark(e.start_date, e.end_date, { type: 'externa', ref: e.feed, summary: e.summary }, !!e.is_reservation);

  const blocks = db.prepare('SELECT id, start_date, end_date, reason FROM blocks WHERE house_id = ? AND end_date > ? AND start_date < ?')
    .all(houseId, lookFrom, to);
  for (const bl of blocks) mark(bl.start_date, bl.end_date, { type: 'bloqueo', ref: bl.id, reason: bl.reason }, false);

  return { occupied, buffer, bufferDays };
}

/** Lanza HttpError si el rango no está disponible. */
function assertAvailable(houseId, checkin, checkout, opts = {}) {
  const bufferDays = db.prepare('SELECT cleaning_buffer_days AS b FROM houses WHERE id = ?').get(houseId)?.b || 0;
  const { occupied, buffer } =getOccupancy(houseId, checkin, addDays(checkout, bufferDays), opts);
  for (const n of eachNight(checkin, checkout)) {
    if (occupied.has(n) || buffer.has(n)) throw new HttpError(409, 'Lo sentimos, esas fechas ya no están disponibles.');
  }
  // Después de la salida deben quedar libres los días de limpieza
  for (let i = 0; i < bufferDays; i++) {
    if (occupied.has(addDays(checkout, i))) throw new HttpError(409, 'Esas fechas no dejan tiempo de limpieza antes de la siguiente reserva.');
  }
}

function seasonFor(houseId, night) {
  return db.prepare('SELECT * FROM seasons WHERE house_id = ? AND start_date <= ? AND end_date >= ? ORDER BY id DESC LIMIT 1')
    .get(houseId, night, night);
}

function priceForNight(house, night) {
  const s = seasonFor(house.id, night);
  if (s) return { price: s.price_night, label: s.name };
  const dow = dayOfWeek(night);
  if (house.price_weekend && (dow === 5 || dow === 6)) return { price: house.price_weekend, label: 'Fin de semana' };
  return { price: house.price_night, label: 'Noche' };
}

/** Calcula el precio de una estadía y valida reglas básicas (no disponibilidad). */
function quote(house, checkin, checkout, guests) {
  const nights = diffDays(checkin, checkout);
  const t = today();
  if (checkin < t) throw new HttpError(400, 'La fecha de llegada ya pasó.');
  if (diffDays(t, checkin) > MAX_ADVANCE_DAYS) throw new HttpError(400, 'Solo se puede reservar hasta 18 meses adelante.');
  if (nights < 1) throw new HttpError(400, 'La salida debe ser posterior a la llegada.');
  if (nights > 60) throw new HttpError(400, 'La estadía máxima es de 60 noches.');
  if (guests < 1 || guests > house.max_guests) throw new HttpError(400, `Esta casa recibe máximo ${house.max_guests} huéspedes.`);
  const season = seasonFor(house.id, checkin);
  const minNights = Math.max(house.min_nights, season?.min_nights || 0);
  if (nights < minNights) throw new HttpError(400, `La estadía mínima para esas fechas es de ${minNights} noches.`);

  const groups = new Map();
  let nightsTotal = 0;
  for (const n of eachNight(checkin, checkout)) {
    const { price, label } = priceForNight(house, n);
    nightsTotal += price;
    const key = label + '|' + price;
    const g = groups.get(key) || { label, price, count: 0 };
    g.count++; groups.set(key, g);
  }
  const total = nightsTotal + house.cleaning_fee;
  const deposit = Math.round(total * house.deposit_percent / 100);
  return {
    nights, nightsTotal, cleaningFee: house.cleaning_fee, total,
    depositPercent: house.deposit_percent, deposit, balance: total - deposit,
    breakdown: [...groups.values()],
  };
}

/** Calendario público (sin datos personales): noches no disponibles para quien reserva. */
function publicCalendar(houseId, from, to) {
  const { occupied, buffer, bufferDays } = getOccupancy(houseId, from, addDays(to, 10));
  const unavailable = new Set([...occupied.keys(), ...buffer]);
  return {
    bufferDays,
    unavailable: [...unavailable].filter(d => d >= from).sort(),
    occupied: [...occupied.keys()].filter(d => d >= from).sort(),
  };
}

module.exports = { getOccupancy, assertAvailable, quote, publicCalendar, ACTIVE_BOOKING_SQL };
