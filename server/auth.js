'use strict';
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const config = require('./config');
const { randomToken, sha256, HttpError } = require('./util');

const COOKIE = 'cc_admin';
const SESSION_HOURS = 12;
const DUMMY_HASH = bcrypt.hashSync('usuario-inexistente', 12);

function ensureInitialAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count > 0) return;
  let { user, password } = config.initialAdmin;
  let generated = false;
  if (!password) { password = randomToken(12); generated = true; }
  if (password.length < 10) {
    console.error('[SEGURIDAD] ADMIN_PASSWORD debe tener al menos 10 caracteres.');
    process.exit(1);
  }
  db.prepare('INSERT INTO admins(username, password_hash) VALUES(?, ?)').run(user, bcrypt.hashSync(password, 12));
  console.log('\n==============================================');
  console.log(' Administrador creado');
  console.log(`   Usuario:    ${user}`);
  if (generated) console.log(`   Contraseña: ${password}   <-- guárdala y cámbiala en Ajustes`);
  console.log('==============================================\n');
}

function login(username, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username || ''));
  // Comparamos siempre (aunque no exista el usuario) para no revelar cuál falló por tiempo de respuesta
  const hash = admin ? admin.password_hash : DUMMY_HASH;
  const ok = bcrypt.compareSync(String(password || ''), hash);
  if (!admin || !ok) return null;
  const token = randomToken(32);
  db.prepare('INSERT INTO sessions(token_hash, admin_id, expires_at) VALUES(?, ?, ?)')
    .run(sha256(token), admin.id, Date.now() + SESSION_HOURS * 3600e3);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return { token, admin };
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 3600e3,
  });
}

function logout(req, res) {
  const token = req.cookies[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

function currentAdmin(req) {
  const token = req.cookies[COOKIE];
  if (!token) return null;
  const row = db.prepare(`SELECT a.id, a.username, s.expires_at FROM sessions s JOIN admins a ON a.id = s.admin_id
                          WHERE s.token_hash = ?`).get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, username: row.username };
}

// Middleware: exige sesión de admin. Para métodos que modifican datos exige además
// la cabecera X-Requested-With (protección CSRF: un formulario de otro sitio no puede enviarla).
function requireAdmin(req, res, next) {
  const admin = currentAdmin(req);
  if (!admin) return next(new HttpError(401, 'Sesión expirada. Inicia sesión de nuevo.'));
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') {
    return next(new HttpError(403, 'Solicitud no permitida.'));
  }
  req.admin = admin;
  next();
}

function changePassword(adminId, current, next) {
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
  if (!bcrypt.compareSync(String(current || ''), admin.password_hash)) throw new HttpError(400, 'La contraseña actual no es correcta.');
  if (String(next || '').length < 10) throw new HttpError(400, 'La nueva contraseña debe tener al menos 10 caracteres.');
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), adminId);
  db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
}

module.exports = { ensureInitialAdmin, login, logout, setSessionCookie, currentAdmin, requireAdmin, changePassword, COOKIE };
