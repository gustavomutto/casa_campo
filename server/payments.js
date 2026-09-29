'use strict';
const crypto = require('crypto');
const { db } = require('./db');
const config = require('./config');
const { sha256, safeEqual, randomToken, HttpError, escapeHtml: e, cop } = require('./util');
const { assertAvailable } = require('./availability');
const { refreshCleaningTasks } = require('./cleaning');
const mailer = require('./mailer');

/**
 * Crea un intento de pago y devuelve los datos para enviar al huésped al checkout de Wompi.
 * El monto SIEMPRE lo calcula el servidor: el navegador nunca decide cuánto se cobra.
 */
function createCheckout(booking, purpose) {
  const amount = purpose === 'balance' ? booking.total - booking.amount_paid : booking.deposit_amount;
  if (amount <= 0) throw new HttpError(400, 'No hay saldo pendiente por pagar.');
  const reference = `${booking.code}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  db.prepare('INSERT INTO payments(booking_id, provider, reference, amount, purpose) VALUES(?, ?, ?, ?, ?)')
    .run(booking.id, config.paymentsMode, reference, amount, purpose);

  if (config.paymentsMode === 'demo') {
    const page = `${config.baseUrl}/reserva.html?code=${encodeURIComponent(booking.code)}&t=${encodeURIComponent(booking.access_token)}`;
    return { mode: 'demo', reference, amount, redirect: `${page}&demo=${encodeURIComponent(reference)}` };
  }
  // URL de regreso sin "?" para que Wompi pueda agregar ?id=<transacción> sin dañar el enlace
  const redirect = `${config.baseUrl}/r/${encodeURIComponent(booking.code)}/${encodeURIComponent(booking.access_token)}`;

  const amountInCents = amount * 100;
  const currency = 'COP';
  // Firma de integridad de Wompi: SHA256(referencia + monto_en_centavos + moneda + secreto_integridad)
  const signature = sha256(`${reference}${amountInCents}${currency}${config.wompi.integritySecret}`);
  return {
    mode: 'wompi', reference, amount,
    action: config.wompi.checkoutUrl,
    fields: {
      'public-key': config.wompi.publicKey,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': signature,
      'redirect-url': redirect,
      'customer-data:email': booking.guest_email,
      'customer-data:full-name': booking.guest_name,
    },
  };
}

/** Consulta a Wompi el estado real de una transacción (no confiamos en lo que diga el navegador). */
async function fetchTransaction(transactionId) {
  if (!/^[\w-]{5,80}$/.test(String(transactionId))) throw new HttpError(400, 'Transacción inválida.');
  const res = await fetch(`${config.wompi.apiBase}/transactions/${encodeURIComponent(transactionId)}`);
  if (!res.ok) throw new HttpError(502, 'No pudimos consultar el pago con Wompi. Intenta de nuevo en un momento.');
  const body = await res.json();
  return body.data;
}

/** Verifica la firma de un evento (webhook) de Wompi. */
function verifyEvent(body, headerChecksum) {
  if (!body?.signature?.properties || !body.timestamp) return false;
  let concat = '';
  for (const prop of body.signature.properties) {
    const value = prop.split('.').reduce((o, k) => (o == null ? undefined : o[k]), body.data);
    if (value === undefined) return false;
    concat += String(value);
  }
  concat += String(body.timestamp) + config.wompi.eventsSecret;
  const expected = sha256(concat).toUpperCase();
  const received = String(headerChecksum || body.signature.checksum || '').toUpperCase();
  return received.length > 0 && safeEqual(expected, received);
}

/**
 * Aplica el resultado de una transacción. Es idempotente: si Wompi avisa dos veces
 * (webhook + regreso del huésped) no se suma el pago dos veces.
 */
async function applyTransaction(tx) {
  const payment = db.prepare('SELECT * FROM payments WHERE reference = ?').get(String(tx.reference || ''));
  if (!payment) return { ok: false, reason: 'referencia desconocida' };
  if (Number(tx.amount_in_cents) !== payment.amount * 100 || (tx.currency && tx.currency !== 'COP')) {
    console.error('[pagos] monto no coincide', tx.reference, tx.amount_in_cents, payment.amount);
    db.prepare(`UPDATE payments SET status = 'ERROR', raw = ?, updated_at = datetime('now') WHERE id = ?`).run(JSON.stringify(tx), payment.id);
    return { ok: false, reason: 'monto no coincide' };
  }

  let after = null;
  const result = db.transaction(() => {
    const fresh = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    if (fresh.status === 'APPROVED') return { ok: true, already: true };
    const status = String(tx.status || 'ERROR').toUpperCase();
    db.prepare(`UPDATE payments SET status = ?, transaction_id = ?, method = ?, raw = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, tx.id || null, tx.payment_method_type || null, JSON.stringify(tx), payment.id);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(payment.booking_id);
    if (status === 'PENDING' && booking.status === 'pending_payment') {
      // PSE puede tardar: mantenemos las fechas apartadas mientras el banco responde
      db.prepare('UPDATE bookings SET hold_expires_at = MAX(hold_expires_at, ?) WHERE id = ?').run(Date.now() + 45 * 60e3, booking.id);
    }
    if (status !== 'APPROVED') return { ok: true, status };

    const paid = booking.amount_paid + payment.amount;
    let newStatus = booking.status;
    if (['pending_payment', 'expired'].includes(booking.status)) {
      try {
        assertAvailable(booking.house_id, booking.checkin, booking.checkout, { excludeBookingId: booking.id });
        newStatus = 'confirmed';
      } catch {
        newStatus = 'conflict'; // pagó pero las fechas se ocuparon: el admin debe resolver (reubicar o reembolsar)
      }
    }
    db.prepare(`UPDATE bookings SET amount_paid = ?, status = ?, hold_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`)
      .run(paid, newStatus, booking.id);
    after = { booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id), wasStatus: booking.status, purpose: payment.purpose };
    return { ok: true, status };
  })();

  if (after) {
    const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(after.booking.house_id);
    refreshCleaningTasks();
    if (after.booking.status === 'conflict' && after.wasStatus !== 'conflict') {
      await mailer.adminAlert(`⚠️ Pago recibido con fechas ocupadas · ${after.booking.code}`,
        `<p>El huésped ${e(after.booking.guest_name)} pagó ${cop(payment.amount)} por ${e(house.name)} (${after.booking.checkin} → ${after.booking.checkout}), pero las fechas se ocuparon mientras pagaba. Contáctalo para reubicarlo o reembolsar desde el panel de Wompi.</p>`);
    } else if (after.purpose === 'balance') {
      await mailer.balancePaid(after.booking, house);
    } else {
      await mailer.bookingConfirmed(after.booking, house);
    }
  }
  return result;
}

/** Solo modo demo (pruebas locales): simula que Wompi aprobó el pago. */
async function approveDemo(reference) {
  if (config.paymentsMode !== 'demo') throw new HttpError(403, 'Modo demo desactivado.');
  const p = db.prepare('SELECT * FROM payments WHERE reference = ?').get(String(reference));
  if (!p) throw new HttpError(404, 'Pago no encontrado.');
  return applyTransaction({ id: 'DEMO-' + randomToken(6), reference: p.reference, amount_in_cents: p.amount * 100, currency: 'COP', status: 'APPROVED', payment_method_type: 'DEMO' });
}

/** Libera las fechas de reservas que no se pagaron a tiempo. */
function expireHolds() {
  const r = db.prepare(`UPDATE bookings SET status = 'expired', updated_at = datetime('now')
    WHERE status = 'pending_payment' AND hold_expires_at < ?`).run(Date.now());
  return r.changes;
}

module.exports = { createCheckout, fetchTransaction, verifyEvent, applyTransaction, approveDemo, expireHolds };
