'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { db } = require('./db');
const U = require('./util');
const auth = require('./auth');
const { seed } = require('./seed');
const ical = require('./ical');
const payments = require('./payments');
const { refreshCleaningTasks } = require('./cleaning');
const mailer = require('./mailer');

const app = express();
app.set('trust proxy', 1); // detrás de Railway/Render/Nginx
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'font-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https://i.ytimg.com'],
      'media-src': ["'self'", 'blob:'],
      'frame-src': ['https://www.youtube-nocookie.com', 'https://www.openstreetmap.org', 'https://my.matterport.com', 'https://kuula.co', 'https://www.kuula.co', 'https://momento360.com', 'https://tour.panoee.com', 'https://www.google.com'],
      'form-action': ["'self'", 'https://checkout.wompi.co'],
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': config.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: config.isProd,
}));
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));

// Rutas
app.use(require('./routes/public'));
app.use(require('./routes/admin'));

// Archivos subidos (fotos/videos). Nombres aleatorios, sin listado de directorio.
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

// Íconos y tipografía servidos desde nuestro propio servidor (sin depender de terceros)
app.use('/vendor/fa', express.static(path.join(__dirname, '..', 'node_modules', '@fortawesome', 'fontawesome-free'), { maxAge: '30d' }));
app.use('/vendor/font', express.static(path.join(__dirname, '..', 'node_modules', '@fontsource', 'plus-jakarta-sans'), { maxAge: '30d' }));

// Panel: si no hay sesión, al login
app.get(['/admin', '/admin/', '/admin/index.html'], (req, res, next) => {
  if (!auth.currentAdmin(req)) return res.redirect('/admin/login.html');
  res.set('Cache-Control', 'no-store');
  next();
});
// Sin caché larga para HTML/JS/CSS: tras cada actualización todos ven la versión nueva (el navegador valida con ETag)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'],
  setHeaders: (res, file) => { res.setHeader('Cache-Control', /\.(png|svg|jpg|webp|woff2?)$/.test(file) ? 'public, max-age=86400' : 'no-cache'); },
}));

// Errores
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') err = new U.HttpError(400, 'El archivo es demasiado grande (máx. 250 MB).');
  if (err.type === 'entity.parse.failed') err = new U.HttpError(400, 'Solicitud inválida.');
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api') || req.path.startsWith('/ical')) return res.status(status).json({ error: status >= 500 ? 'Error interno. Intenta de nuevo.' : err.message });
  res.status(status).send(status === 404 ? 'No encontrado' : 'Error');
});

// ------------------------------------------------------------ Tareas programadas
function every(ms, fn) {
  const run = async () => { try { await fn(); } catch (e) { console.error('[tarea]', e); } };
  setTimeout(run, 5000);
  return setInterval(run, ms);
}

async function dailyJobs() {
  const t = U.today();
  // Estadías terminadas → "completada" y se envía invitación a dejar reseña
  const done = db.prepare(`SELECT * FROM bookings WHERE status = 'confirmed' AND checkout <= ?`).all(t);
  for (const b of done) {
    db.prepare(`UPDATE bookings SET status = 'completed', review_token = COALESCE(review_token, ?), updated_at = datetime('now') WHERE id = ?`).run(U.randomToken(24), b.id);
  }
  const toInvite = db.prepare(`SELECT * FROM bookings WHERE status = 'completed' AND review_email_sent = 0 AND review_token IS NOT NULL`).all();
  for (const b of toInvite) {
    const h = db.prepare('SELECT * FROM houses WHERE id = ?').get(b.house_id);
    await mailer.reviewRequest(b, h);
    db.prepare('UPDATE bookings SET review_email_sent = 1 WHERE id = ?').run(b.id);
  }
  // Recordatorio con "cómo llegar" el día antes de la llegada
  const tomorrow = U.addDays(t, 1);
  for (const b of db.prepare(`SELECT * FROM bookings WHERE status = 'confirmed' AND arrival_email_sent = 0 AND checkin <= ? AND checkin >= ?`).all(tomorrow, t)) {
    const h = db.prepare('SELECT * FROM houses WHERE id = ?').get(b.house_id);
    await mailer.arrivalReminder(b, h);
    db.prepare('UPDATE bookings SET arrival_email_sent = 1 WHERE id = ?').run(b.id);
  }
  refreshCleaningTasks();
}

async function start() {
  auth.ensureInitialAdmin();
  await seed();
  refreshCleaningTasks();
  app.listen(config.port, () => {
    console.log(`\n🌿 ${config.siteName} escuchando en ${config.baseUrl}`);
    console.log(`   Pagos: ${config.paymentsMode === 'demo' ? 'MODO DEMO (sin dinero real)' : 'Wompi ' + config.wompi.env}`);
  });
  if (process.env.NODE_ENV !== 'test') {
    every(60e3, () => payments.expireHolds());
    every(config.icalSyncMinutes * 60e3, () => ical.syncAll());
    every(60 * 60e3, dailyJobs);
  }
}

if (require.main === module) start();
module.exports = { app, start, dailyJobs };
