'use strict';
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS houses (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  short_desc TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  house_rules TEXT NOT NULL DEFAULT '',
  price_night INTEGER NOT NULL,           -- COP por noche (entre semana)
  price_weekend INTEGER,                  -- COP por noche viernes y sábado (opcional)
  cleaning_fee INTEGER NOT NULL DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  beds INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  amenities TEXT NOT NULL DEFAULT '[]',   -- JSON
  min_nights INTEGER NOT NULL DEFAULT 1,
  checkin_time TEXT NOT NULL DEFAULT '15:00',
  checkout_time TEXT NOT NULL DEFAULT '11:00',
  cleaning_buffer_days INTEGER NOT NULL DEFAULT 0, -- días bloqueados después de cada salida
  deposit_percent INTEGER NOT NULL DEFAULT 100,    -- % que se paga al reservar
  badge TEXT NOT NULL DEFAULT '',
  map_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  ical_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image','video','youtube')),
  file TEXT,            -- nombre en uploads/ (image/video)
  thumb TEXT,           -- miniatura (image)
  url TEXT,             -- id de YouTube
  caption TEXT NOT NULL DEFAULT '',
  width INTEGER, height INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS media_house ON media(house_id, position);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,  -- inclusive
  end_date TEXT NOT NULL,    -- inclusive (última noche)
  price_night INTEGER NOT NULL,
  min_nights INTEGER
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  house_id INTEGER NOT NULL REFERENCES houses(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_document TEXT NOT NULL DEFAULT '',
  guests INTEGER NOT NULL,
  checkin TEXT NOT NULL,   -- YYYY-MM-DD
  checkout TEXT NOT NULL,  -- YYYY-MM-DD (noche anterior es la última)
  nights INTEGER NOT NULL,
  nights_total INTEGER NOT NULL,
  cleaning_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,  -- lo que se cobra al reservar
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending_payment','confirmed','completed','cancelled','expired','conflict')),
  hold_expires_at INTEGER,          -- epoch ms
  access_token TEXT NOT NULL,       -- enlace privado del huésped
  review_token TEXT,
  review_email_sent INTEGER NOT NULL DEFAULT 0,
  guest_notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  price_breakdown TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS bookings_house_dates ON bookings(house_id, checkin, checkout);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,           -- COP
  purpose TEXT NOT NULL DEFAULT 'deposit', -- deposit | balance
  status TEXT NOT NULL DEFAULT 'CREATED',  -- CREATED | PENDING | APPROVED | DECLINED | VOIDED | ERROR
  transaction_id TEXT,
  method TEXT,
  raw TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,  -- primera noche bloqueada
  end_date TEXT NOT NULL,    -- exclusivo
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ical_feeds (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  last_sync_at TEXT,
  last_status TEXT,
  last_error TEXT,
  event_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS external_events (
  id INTEGER PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES ical_feeds(id) ON DELETE CASCADE,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  is_reservation INTEGER NOT NULL DEFAULT 1,
  UNIQUE(feed_id, uid)
);

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  source_key TEXT UNIQUE,     -- booking:ID | ext:FEED:UID | NULL si es manual
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','hecha','cancelada')),
  assignee TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  booking_id INTEGER UNIQUE REFERENCES bookings(id),
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  host_reply TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value ?? ''));
}

module.exports = { db, getSetting, setSetting };
