'use strict';
const crypto = require('crypto');
const config = require('./config');

// ---------- Fechas (siempre como texto YYYY-MM-DD, aritmética en UTC para evitar líos de zona horaria)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDays(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function eachNight(from, to) {
  const out = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}
function dayOfWeek(s) {
  return new Date(s + 'T00:00:00Z').getUTCDay(); // 0 domingo … 6 sábado
}
// Fecha de hoy en la zona horaria del negocio (Colombia)
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// ---------- Tokens y códigos
function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}
function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
function bookingCode() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return 'CC-' + s;
}

// ---------- Formato
function cop(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function fechaLarga(s) {
  return new Date(s + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'casa';
}

// ---------- Validación simple
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function str(v, { max = 500, min = 0, field = 'campo' } = {}) {
  const s = typeof v === 'string' ? v.trim() : (v == null ? '' : String(v).trim());
  if (s.length < min) throw new HttpError(400, `El campo "${field}" es obligatorio.`);
  if (s.length > max) throw new HttpError(400, `El campo "${field}" es demasiado largo.`);
  return s;
}
function int(v, { min = 0, max = 1e12, field = 'número', optional = false } = {}) {
  if (optional && (v === '' || v == null)) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `Valor inválido para "${field}".`);
  return n;
}
function email(v) {
  const s = str(v, { max: 200, min: 3, field: 'correo' }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new HttpError(400, 'Correo electrónico inválido.');
  return s;
}
function date(v, field = 'fecha') {
  if (!isDate(v)) throw new HttpError(400, `Fecha inválida: ${field}.`);
  return v;
}

module.exports = {
  isDate, addDays, diffDays, eachNight, dayOfWeek, today,
  randomToken, sha256, safeEqual, bookingCode,
  cop, fechaLarga, escapeHtml, slugify,
  HttpError, str, int, email, date,
};
