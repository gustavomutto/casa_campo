'use strict';
const nodemailer = require('nodemailer');
const config = require('./config');
const { getSetting } = require('./db');
const { escapeHtml: e, cop, fechaLarga } = require('./util');

const { decrypt } = require('./secret');

/**
 * Configuración del correo. Lo que se guarde en el panel (Ajustes → Correo) tiene prioridad;
 * si no hay nada en el panel se usan las variables de entorno SMTP_*.
 */
function emailConfig() {
  const panelUser = getSetting('smtp_user');
  const panelPass = decrypt(getSetting('smtp_pass_enc'));
  if (panelUser && panelPass) {
    const name = getSetting('mail_from_name') || config.siteName;
    return {
      source: 'panel', host: getSetting('smtp_host') || 'smtp.gmail.com', port: Number(getSetting('smtp_port') || 587),
      user: panelUser, pass: panelPass, from: `"${name.replace(/"/g, '')}" <${panelUser}>`,
    };
  }
  if (config.smtp.host && config.smtp.user) {
    return { source: 'env', ...config.smtp, from: config.smtp.from || config.smtp.user };
  }
  return { source: 'none' };
}

/** Correo que recibe los avisos del propietario (nuevas reservas, conflictos). */
function notifyEmail() {
  return getSetting('notify_email') || config.adminEmail || getSetting('contact_email');
}

let cached = { sig: null, transport: null };
function getTransport(c) {
  const sig = [c.host, c.port, c.user, c.pass].join('|');
  if (cached.sig !== sig) {
    cached = { sig, transport: nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, auth: { user: c.user, pass: c.pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 }) };
  }
  return cached.transport;
}

/** Envía y lanza error si falla (se usa para el correo de prueba). */
async function sendStrict(to, subject, html) {
  const c = emailConfig();
  if (c.source === 'none') throw new Error('El correo no está configurado.');
  await getTransport(c).sendMail({ from: c.from, to, subject, html: layout(subject, html) });
}

async function send(to, subject, html) {
  if (!to) return;
  if (emailConfig().source === 'none') {
    console.log(`[correo no configurado] Para: ${to} | Asunto: ${subject}`);
    return;
  }
  try { await sendStrict(to, subject, html); }
  catch (err) { console.error('[correo] error enviando a', to, err.message); }
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f1;font-family:Arial,sans-serif;color:#1f2a1f">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#1b5e20;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:18px">🌿 ${e(config.siteName)}</div>
    <div style="background:#fff;padding:22px;border-radius:0 0 12px 12px;line-height:1.55">${body}</div>
    <p style="font-size:12px;color:#6b776b;text-align:center">${e(getSetting('contact_phone'))} · ${e(getSetting('contact_email'))}</p>
  </div></body></html>`;
}

function bookingTable(b, house) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#6b776b">Casa</td><td style="text-align:right"><b>${e(house.name)}</b></td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Código</td><td style="text-align:right"><b>${e(b.code)}</b></td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Llegada</td><td style="text-align:right">${e(fechaLarga(b.checkin))} desde las ${e(house.checkin_time)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Salida</td><td style="text-align:right">${e(fechaLarga(b.checkout))} hasta las ${e(house.checkout_time)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Huéspedes</td><td style="text-align:right">${b.guests}</td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Total</td><td style="text-align:right">${cop(b.total)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b776b">Pagado</td><td style="text-align:right"><b>${cop(b.amount_paid)}</b></td></tr>
    ${b.total - b.amount_paid > 0 ? `<tr><td style="padding:6px 0;color:#b45309">Saldo pendiente</td><td style="text-align:right;color:#b45309">${cop(b.total - b.amount_paid)}</td></tr>` : ''}
  </table>`;
}

function bookingLink(b) {
  return `${config.baseUrl}/reserva.html?code=${encodeURIComponent(b.code)}&t=${encodeURIComponent(b.access_token)}`;
}
const btn = (href, label) => `<p style="text-align:center;margin:22px 0"><a href="${e(href)}" style="background:#2e7d32;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${e(label)}</a></p>`;

async function bookingConfirmed(b, house) {
  await send(b.guest_email, `Reserva confirmada ${b.code} · ${house.name}`,
    `<h2 style="margin-top:0">¡Tu reserva está confirmada, ${e(b.guest_name.split(' ')[0])}!</h2>
     <p>Recibimos tu pago. Estos son los detalles:</p>${bookingTable(b, house)}
     ${btn(bookingLink(b), 'Ver mi reserva')}
     ${arrivalBlock(house)}`);
  await send(notifyEmail(), `Nueva reserva ${b.code} · ${house.name}`,
    `<h2 style="margin-top:0">Nueva reserva pagada</h2>${bookingTable(b, house)}
     <p>Huésped: ${e(b.guest_name)} · ${e(b.guest_email)} · ${e(b.guest_phone)}</p>
     ${btn(config.baseUrl + '/admin/', 'Abrir panel')}`);
}

// Bloque "Cómo llegar" para los correos: botones de Google Maps y Waze + indicaciones escritas
function arrivalBlock(house) {
  const { directionLinks } = require('./location');
  const hasCoords = house.latitude != null;
  if (!hasCoords && !house.arrival_instructions) return '';
  const l = hasCoords ? directionLinks(house.latitude, house.longitude) : null;
  const small = (href, label, bg) => `<a href="${e(href)}" style="display:inline-block;background:${bg};color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold;margin:4px">${label}</a>`;
  return `<h3 style="margin:22px 0 8px">📍 Cómo llegar</h3>
    ${l ? `<p style="text-align:center">${small(l.google, 'Abrir en Google Maps', '#1a73e8')}${small(l.waze, 'Abrir en Waze', '#33ccff')}</p>` : ''}
    ${house.arrival_instructions ? `<p style="white-space:pre-line;background:#f3f5f1;padding:12px 14px;border-radius:10px">${e(house.arrival_instructions)}</p>` : ''}`;
}

async function arrivalReminder(b, house) {
  await send(b.guest_email, `¡Mañana llegas a ${house.name}! Cómo llegar`,
    `<h2 style="margin-top:0">Te esperamos mañana, ${e(b.guest_name.split(' ')[0])} 🌿</h2>
     <p>Llegada desde las <b>${e(house.checkin_time)}</b> · Salida hasta las <b>${e(house.checkout_time)}</b>.</p>
     ${arrivalBlock(house)}
     ${btn(bookingLink(b), 'Ver mi reserva')}`);
}

async function balancePaid(b, house) {
  await send(b.guest_email, `Pago recibido ${b.code}`,
    `<h2 style="margin-top:0">Recibimos tu pago</h2>${bookingTable(b, house)}${btn(bookingLink(b), 'Ver mi reserva')}`);
}

async function reviewRequest(b, house) {
  const link = `${config.baseUrl}/resena.html?token=${encodeURIComponent(b.review_token)}`;
  await send(b.guest_email, `¿Cómo te fue en ${house.name}?`,
    `<h2 style="margin-top:0">Gracias por hospedarte con nosotros</h2>
     <p>Tu opinión ayuda a otros viajeros. ¿Nos cuentas cómo fue tu estadía en <b>${e(house.name)}</b>?</p>
     ${btn(link, 'Dejar mi reseña')}`);
}

async function adminAlert(subject, html) {
  await send(notifyEmail(), subject, html);
}

module.exports = { arrivalReminder, send, sendStrict, emailConfig, notifyEmail, bookingConfirmed, balancePaid, reviewRequest, adminAlert, bookingLink };
