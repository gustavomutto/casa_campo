'use strict';
const { db, getSetting, setSetting } = require('./db');
const config = require('./config');
const { addDays, today, isDate, escapeHtml: e } = require('./util');
const { refreshCleaningTasks } = require('./cleaning');

// ---------------------------------------------------------------- Exportar (lo que Airbnb/Booking leen de nosotros)

function icsEscape(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function icsDate(s) { return s.replace(/-/g, ''); }
function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function fold(line) {
  // RFC 5545: líneas de máx. 75 octetos
  const out = []; let cur = line;
  while (Buffer.byteLength(cur) > 74) {
    let cut = 74; while (Buffer.byteLength(cur.slice(0, cut)) > 74) cut--;
    out.push(cur.slice(0, cut)); cur = ' ' + cur.slice(cut);
  }
  out.push(cur); return out.join('\r\n');
}
function calendar(name, events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casas Campestres//Reservas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`];
  const ts = stamp();
  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${ts}`,
      `DTSTART;VALUE=DATE:${icsDate(ev.start)}`, `DTEND;VALUE=DATE:${icsDate(ev.end)}`,
      `SUMMARY:${icsEscape(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/**
 * Calendario de disponibilidad de una casa para que Airbnb/Booking lo importen.
 * excludeFeedId: no reenviamos a una plataforma sus propias reservas (evita duplicados y bucles).
 * No incluye datos personales de los huéspedes.
 */
function exportHouse(house, excludeFeedId = null) {
  const from = addDays(today(), -30);
  const host = new URL(config.baseUrl).host;
  const events = [];
  const buffer = house.cleaning_buffer_days;
  const pushBuffer = (end, key) => {
    if (buffer > 0) events.push({ uid: `limpieza-${key}@${host}`, start: end, end: addDays(end, buffer), summary: 'No disponible (limpieza)' });
  };

  for (const b of db.prepare(`SELECT id, checkin, checkout FROM bookings WHERE house_id = ? AND checkout >= ?
      AND (status IN ('confirmed','completed','conflict') OR (status = 'pending_payment' AND hold_expires_at > ?))`).all(house.id, from, Date.now())) {
    events.push({ uid: `reserva-${b.id}@${host}`, start: b.checkin, end: b.checkout, summary: 'Reservado (web)' });
    pushBuffer(b.checkout, `r${b.id}`);
  }
  for (const bl of db.prepare('SELECT id, start_date, end_date FROM blocks WHERE house_id = ? AND end_date >= ?').all(house.id, from)) {
    events.push({ uid: `bloqueo-${bl.id}@${host}`, start: bl.start_date, end: bl.end_date, summary: 'No disponible' });
  }
  for (const ev of db.prepare(`SELECT e.id, e.feed_id, e.start_date, e.end_date, e.is_reservation, f.name FROM external_events e
      JOIN ical_feeds f ON f.id = e.feed_id WHERE e.house_id = ? AND e.end_date >= ?`).all(house.id, from)) {
    if (excludeFeedId && ev.feed_id === excludeFeedId) continue;
    events.push({ uid: `externa-${ev.id}@${host}`, start: ev.start_date, end: ev.end_date, summary: `No disponible (${ev.name})` });
    if (ev.is_reservation) pushBuffer(ev.end_date, `e${ev.id}`);
  }
  return calendar(`${config.siteName} · ${house.name}`, events);
}

/** Calendario de limpiezas para el celular de la persona encargada. */
function exportCleaning() {
  const rows = db.prepare(`SELECT t.id, t.date, t.assignee, t.notes, t.status, h.name, h.checkout_time, h.checkin_time
     FROM cleaning_tasks t JOIN houses h ON h.id = t.house_id WHERE t.status != 'cancelada' AND t.date >= ?`).all(addDays(today(), -14));
  const host = new URL(config.baseUrl).host;
  return calendar(`${config.siteName} · Limpiezas`, rows.map(r => ({
    uid: `limpieza-${r.id}@${host}`, start: r.date, end: addDays(r.date, 1),
    summary: `${r.status === 'hecha' ? '✔ ' : ''}Limpieza ${r.name}`,
    description: `Salida huéspedes: ${r.checkout_time}. Próxima llegada desde: ${r.checkin_time}.${r.assignee ? ' Encargado: ' + r.assignee + '.' : ''} ${r.notes}`,
  })));
}

// ---------------------------------------------------------------- Importar (lo que leemos de Airbnb/Booking)

function unfold(text) { return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, ''); }

function parseIcsDate(value, params) {
  const v = value.trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  if (m[7] === 'Z') {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  return `${m[1]}-${m[2]}-${m[3]}`; // hora local o con TZID: tomamos la fecha tal cual
}

function parseIcs(text) {
  const lines = unfold(text).split('\n');
  const events = []; let cur = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':'); if (idx < 0) continue;
    const [name, ...params] = line.slice(0, idx).split(';');
    const value = line.slice(idx + 1);
    const key = name.toUpperCase();
    if (key === 'UID') cur.uid = value.trim();
    else if (key === 'DTSTART') cur.start = parseIcsDate(value, params);
    else if (key === 'DTEND') cur.end = parseIcsDate(value, params);
    else if (key === 'SUMMARY') cur.summary = value.replace(/\\n/g, ' ').replace(/\\([,;\\])/g, '$1').trim();
    else if (key === 'STATUS') cur.status = value.trim().toUpperCase();
  }
  return events
    .filter(ev => ev.start && isDate(ev.start) && ev.status !== 'CANCELLED')
    .map(ev => {
      let end = ev.end && isDate(ev.end) ? ev.end : addDays(ev.start, 1);
      if (end <= ev.start) end = addDays(ev.start, 1);
      const summary = (ev.summary || '').slice(0, 200);
      // En Airbnb "Airbnb (Not available)" es un bloqueo manual del anfitrión, no un huésped.
      const isReservation = !/airbnb \(not available\)/i.test(summary);
      return { uid: (ev.uid || `${ev.start}-${end}-${summary}`).slice(0, 300), start: ev.start, end, summary, isReservation };
    });
}

async function fetchText(url) {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('La URL debe empezar por https://');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(u, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'CasasCampestres-iCal/1.0' } });
    if (!res.ok) throw new Error(`La plataforma respondió ${res.status}`);
    const text = await res.text();
    if (text.length > 3_000_000) throw new Error('El calendario es demasiado grande');
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('La URL no devolvió un calendario iCal válido');
    return text;
  } finally { clearTimeout(timer); }
}

async function syncFeed(feed) {
  try {
    const events = parseIcs(await fetchText(feed.url));
    const cutoff = addDays(today(), -60);
    db.transaction(() => {
      db.prepare('DELETE FROM external_events WHERE feed_id = ?').run(feed.id);
      const ins = db.prepare(`INSERT OR REPLACE INTO external_events(feed_id, house_id, uid, start_date, end_date, summary, is_reservation)
        VALUES(?, ?, ?, ?, ?, ?, ?)`);
      for (const ev of events) if (ev.end >= cutoff) ins.run(feed.id, feed.house_id, ev.uid, ev.start, ev.end, ev.summary, ev.isReservation ? 1 : 0);
      db.prepare(`UPDATE ical_feeds SET last_sync_at = datetime('now'), last_status = 'ok', last_error = NULL, event_count = ? WHERE id = ?`)
        .run(events.length, feed.id);
    })();
    return { ok: true, count: events.length };
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado' : err.message;
    db.prepare(`UPDATE ical_feeds SET last_sync_at = datetime('now'), last_status = 'error', last_error = ? WHERE id = ?`).run(msg, feed.id);
    return { ok: false, error: msg };
  }
}

let running = null;
async function syncAll() {
  if (running) return running;
  running = (async () => {
    const feeds = db.prepare('SELECT * FROM ical_feeds').all();
    const results = [];
    for (const f of feeds) results.push({ id: f.id, ...(await syncFeed(f)) });
    refreshCleaningTasks();
    await detectConflicts();
    return results;
  })();
  try { return await running; } finally { running = null; }
}

/** Sincroniza los calendarios de una casa si la última lectura es más vieja que maxAgeSec (se usa antes de cobrar). */
async function syncHouseIfStale(houseId, maxAgeSec = 120) {
  const feeds = db.prepare(`SELECT * FROM ical_feeds WHERE house_id = ? AND
     (last_sync_at IS NULL OR last_sync_at < datetime('now', ?))`).all(houseId, `-${maxAgeSec} seconds`);
  if (!feeds.length) return;
  await Promise.all(feeds.map(syncFeed));
}

/** Avisa al admin si una reserva web choca con una reserva externa (p. ej. Airbnb aún no había leído nuestro calendario). */
async function detectConflicts() {
  const rows = db.prepare(`SELECT b.id, b.code, b.checkin, b.checkout, h.name AS house, f.name AS feed, e.uid, e.start_date, e.end_date
    FROM bookings b JOIN external_events e ON e.house_id = b.house_id AND e.start_date < b.checkout AND e.end_date > b.checkin
    JOIN ical_feeds f ON f.id = e.feed_id JOIN houses h ON h.id = b.house_id
    WHERE b.status IN ('confirmed') AND e.is_reservation = 1 AND b.checkout >= ?`).all(today());
  const { adminAlert } = require('./mailer');
  for (const r of rows) {
    const key = `conflict:${r.id}:${r.uid}`;
    if (getSetting(key)) continue;
    setSetting(key, '1');
    db.prepare(`UPDATE bookings SET status = 'conflict', updated_at = datetime('now') WHERE id = ?`).run(r.id);
    await adminAlert(`⚠️ Posible doble reserva en ${r.house}`,
      `<p>La reserva web <b>${e(r.code)}</b> (${r.checkin} → ${r.checkout}) se cruza con un evento de <b>${e(r.feed)}</b> (${r.start_date} → ${r.end_date}).</p>
       <p>Revisa ambas plataformas lo antes posible. La reserva quedó marcada como "conflicto" en el panel.</p>`);
  }
}

module.exports = { exportHouse, exportCleaning, parseIcs, syncFeed, syncAll, syncHouseIfStale, detectConflicts };
