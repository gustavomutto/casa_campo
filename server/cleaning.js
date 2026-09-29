'use strict';
const { db } = require('./db');
const { addDays, today } = require('./util');

/**
 * Crea automáticamente una tarea de limpieza el día de cada salida
 * (reservas de la web y reservas importadas de Airbnb/Booking).
 * Si la reserva se cancela o desaparece del calendario externo, la tarea pendiente se cancela.
 */
function refreshCleaningTasks() {
  const from = addDays(today(), -3);
  const wanted = new Map(); // source_key -> {house_id, date}

  for (const b of db.prepare(`SELECT id, house_id, checkout FROM bookings
      WHERE status IN ('confirmed','completed','conflict') AND checkout >= ?`).all(from)) {
    wanted.set(`booking:${b.id}`, { house_id: b.house_id, date: b.checkout });
  }
  for (const e of db.prepare(`SELECT feed_id, uid, house_id, end_date FROM external_events
      WHERE is_reservation = 1 AND end_date >= ?`).all(from)) {
    wanted.set(`ext:${e.feed_id}:${e.uid}`, { house_id: e.house_id, date: e.end_date });
  }

  const tx = db.transaction(() => {
    const upsert = db.prepare(`INSERT INTO cleaning_tasks(house_id, date, source_key) VALUES(@house_id, @date, @key)
      ON CONFLICT(source_key) DO UPDATE SET date = excluded.date, house_id = excluded.house_id,
        status = CASE WHEN cleaning_tasks.status = 'cancelada' THEN 'pendiente' ELSE cleaning_tasks.status END`);
    for (const [key, v] of wanted) upsert.run({ ...v, key });

    const existing = db.prepare(`SELECT id, source_key FROM cleaning_tasks
       WHERE source_key IS NOT NULL AND status = 'pendiente' AND date >= ?`).all(from);
    const cancel = db.prepare(`UPDATE cleaning_tasks SET status = 'cancelada' WHERE id = ?`);
    for (const t of existing) if (!wanted.has(t.source_key)) cancel.run(t.id);
  });
  tx();
}

/** Tareas con contexto: quién sale, quién llega después y cuánto tiempo hay para limpiar. */
function listTasks(from, to) {
  const tasks = db.prepare(`SELECT t.*, h.name AS house_name, h.checkin_time, h.checkout_time
    FROM cleaning_tasks t JOIN houses h ON h.id = t.house_id
    WHERE t.date >= ? AND t.date <= ? AND t.status != 'cancelada' ORDER BY t.date, h.name`).all(from, to);

  const nextArrival = db.prepare(`SELECT MIN(d) AS d FROM (
      SELECT checkin AS d FROM bookings WHERE house_id = @h AND checkin >= @date AND status IN ('confirmed','completed','pending_payment','conflict')
      UNION ALL SELECT start_date FROM external_events WHERE house_id = @h AND start_date >= @date AND is_reservation = 1)`);

  return tasks.map(t => {
    let origin = 'Manual';
    if (t.source_key?.startsWith('booking:')) {
      const b = db.prepare('SELECT code, guest_name FROM bookings WHERE id = ?').get(Number(t.source_key.split(':')[1]));
      origin = b ? `Web ${b.code} · ${b.guest_name}` : 'Web';
    } else if (t.source_key?.startsWith('ext:')) {
      const f = db.prepare('SELECT name FROM ical_feeds WHERE id = ?').get(Number(t.source_key.split(':')[1]));
      origin = f ? f.name : 'Externa';
    }
    const next = nextArrival.get({ h: t.house_id, date: t.date })?.d || null;
    return { ...t, origin, next_arrival: next, same_day_turnover: next === t.date };
  });
}

module.exports = { refreshCleaningTasks, listTasks };
