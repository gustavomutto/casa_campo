'use strict';
require('dotenv').config({ quiet: true });
const path = require('path');

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data'));

const wompiEnv = (env.WOMPI_ENV || 'sandbox').toLowerCase(); // sandbox | production

const config = {
  isProd,
  port: Number(env.PORT || 3000),
  // URL pública del sitio (sin / final). Se usa para links en correos, redirect de Wompi y feeds iCal.
  baseUrl: (env.BASE_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
  dataDir: DATA_DIR,
  dbFile: path.join(DATA_DIR, 'casas.db'),
  uploadsDir: path.join(DATA_DIR, 'uploads'),
  siteName: env.SITE_NAME || 'Casas Campestres',
  timezone: env.TZ_SITE || 'America/Bogota',

  // Pagos
  // PAYMENTS_MODE=wompi (real) | demo (solo pruebas locales, NUNCA en producción)
  paymentsMode: (env.PAYMENTS_MODE || (env.WOMPI_PUBLIC_KEY ? 'wompi' : 'demo')).toLowerCase(),
  wompi: {
    env: wompiEnv,
    publicKey: env.WOMPI_PUBLIC_KEY || '',
    integritySecret: env.WOMPI_INTEGRITY_SECRET || '',
    eventsSecret: env.WOMPI_EVENTS_SECRET || '',
    apiBase: wompiEnv === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1',
    checkoutUrl: 'https://checkout.wompi.co/p/',
  },
  holdMinutes: Number(env.HOLD_MINUTES || 30),

  // Sincronización iCal
  icalSyncMinutes: Number(env.ICAL_SYNC_MINUTES || 15),

  // Correo (opcional). Si no se configura, los correos se escriben en la consola.
  smtp: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT || 587),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || '',
  },
  adminEmail: env.ADMIN_EMAIL || '',

  // Admin inicial (solo se usa si la base no tiene administradores)
  initialAdmin: { user: env.ADMIN_USER || 'admin', password: env.ADMIN_PASSWORD || '' },
};

// ALLOW_DEMO_PAYMENTS=true permite publicar el sitio en modo demostración (para mostrarlo a un cliente).
// El sitio muestra un aviso visible de que los pagos son simulados.
if (config.isProd && config.paymentsMode === 'demo' && env.ALLOW_DEMO_PAYMENTS !== 'true') {
  console.error('\n[SEGURIDAD] PAYMENTS_MODE=demo no está permitido en producción. Configura las llaves de Wompi.\n');
  process.exit(1);
}
if (config.paymentsMode === 'wompi' && (!config.wompi.publicKey || !config.wompi.integritySecret || !config.wompi.eventsSecret)) {
  console.error('\n[CONFIG] Faltan WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET o WOMPI_EVENTS_SECRET.\n');
  process.exit(1);
}

module.exports = config;
