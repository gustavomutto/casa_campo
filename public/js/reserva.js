(function () {
  'use strict';
  const { $, esc, cop, api, D, toast, goToCheckout } = window.CC;
  const p = new URLSearchParams(location.search);
  const code = p.get('code');
  const t = p.get('t');
  const txId = p.get('id');       // Wompi regresa con ?id=<transacción>
  const demoRef = p.get('demo');  // modo de pruebas
  let polls = 0;

  if (!code || !t) { location.href = '/mis-reservas.html'; return; }

  const STATUS = {
    pending_payment: { cls: 'wait', icon: 'fa-hourglass-half', title: 'Esperando tu pago', text: 'Tus fechas están apartadas mientras completas el pago.' },
    confirmed: { cls: 'ok', icon: 'fa-check', title: '¡Reserva confirmada!', text: 'Te enviamos los detalles a tu correo. ¡Te esperamos!' },
    completed: { cls: 'ok', icon: 'fa-house-circle-check', title: 'Estadía finalizada', text: 'Gracias por hospedarte con nosotros.' },
    cancelled: { cls: 'bad', icon: 'fa-ban', title: 'Reserva cancelada', text: 'Esta reserva fue cancelada.' },
    expired: { cls: 'bad', icon: 'fa-clock', title: 'El tiempo para pagar venció', text: 'No recibimos el pago a tiempo y las fechas se liberaron. Si siguen libres, puedes intentarlo de nuevo.' },
    conflict: { cls: 'wait', icon: 'fa-triangle-exclamation', title: 'Estamos revisando tu reserva', text: 'Recibimos tu pago pero necesitamos verificar la disponibilidad. Te contactaremos muy pronto.' },
  };
  const PAY = { APPROVED: ['Aprobado', ''], PENDING: ['En proceso', 'warn'], DECLINED: ['Rechazado', 'danger'], VOIDED: ['Anulado', 'gray'], ERROR: ['Error', 'danger'] };

  async function verifyFromWompi() {
    try { await api(`/api/bookings/${encodeURIComponent(code)}/verify`, { method: 'POST', body: { t, id: txId } }); }
    catch (err) { toast(err.message, true); }
  }

  async function load() {
    let data;
    try { data = await api(`/api/bookings/${encodeURIComponent(code)}?t=${encodeURIComponent(t)}`); }
    catch (err) { $('#page').innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div>`; return; }
    render(data);
    const b = data.booking;
    const pending = b.payments.some(x => x.status === 'PENDING');
    if ((b.status === 'pending_payment' && (txId || pending)) && polls < 40) {
      polls++;
      setTimeout(async () => { if (txId) await verifyFromWompi(); load(); }, 4000);
    }
  }

  function gcalLink(b, h) {
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: `Estadía en ${h.name}`,
      dates: `${b.checkin.replace(/-/g, '')}/${b.checkout.replace(/-/g, '')}`,
      details: `Reserva ${b.code}. Llegada desde las ${h.checkinTime}, salida hasta las ${h.checkoutTime}.`,
      location: h.location,
    });
    return 'https://calendar.google.com/calendar/render?' + q;
  }

  function render({ booking: b, house: h, paymentsMode }) {
    const s = STATUS[b.status] || STATUS.pending_payment;
    const minsLeft = b.holdExpiresAt ? Math.max(0, Math.round((b.holdExpiresAt - Date.now()) / 60000)) : null;
    const processing = b.payments.some(x => x.status === 'PENDING');
    const lastDeclined = !processing && b.status === 'pending_payment' && b.payments.length && b.payments[b.payments.length - 1].status === 'DECLINED';

    $('#page').innerHTML = `
      <div class="status-hero ${s.cls}"><div class="big"><i class="fa-solid ${s.icon}"></i></div>
        <h1 style="font-size:1.7rem">${processing && b.status === 'pending_payment' ? 'Tu pago se está procesando' : s.title}</h1>
        <p class="muted" style="margin-top:6px">${processing && b.status === 'pending_payment' ? 'El banco está confirmando la transacción. Esta página se actualiza sola.' : s.text}</p>
        ${b.status === 'pending_payment' && minsLeft !== null && !processing ? `<p class="small" style="margin-top:8px"><span class="pill warn"><i class="fa-regular fa-clock"></i> Fechas apartadas por ${minsLeft} min más</span></p>` : ''}
      </div>
      ${lastDeclined ? '<div class="alert alert-danger" style="margin:16px 0"><i class="fa-solid fa-circle-xmark"></i>El último intento de pago fue rechazado. Puedes intentar con otro medio de pago.</div>' : ''}
      ${demoRef && b.status === 'pending_payment' && paymentsMode === 'demo' ? `
        <div class="card card-pad" style="margin:18px 0;border-color:#f5d08a;background:var(--warn-soft)">
          <b><i class="fa-solid fa-flask"></i> Simulador de pago (modo de pruebas)</b>
          <p class="small" style="margin:6px 0 12px">En producción aquí el huésped estaría en la página segura de Wompi pagando con tarjeta, PSE o Nequi.</p>
          <button class="btn btn-primary btn-sm" id="demoOk"><i class="fa-solid fa-check"></i> Simular pago aprobado</button>
        </div>` : ''}
      <div class="card card-pad" style="margin-top:22px">
        <div class="house-mini">${h.cover ? `<img src="${esc(h.cover)}" alt="">` : ''}<div><a href="/casa.html?c=${encodeURIComponent(h.slug)}"><b>${esc(h.name)}</b></a><div class="small muted">${esc(h.location)}</div></div></div>
        <dl class="kv">
          <dt>Código de reserva</dt><dd>${esc(b.code)}</dd>
          <dt>Llegada</dt><dd>${D.medium(b.checkin)} · desde ${esc(h.checkinTime)}</dd>
          <dt>Salida</dt><dd>${D.medium(b.checkout)} · hasta ${esc(h.checkoutTime)}</dd>
          <dt>Huéspedes</dt><dd>${b.guests}</dd>
          <dt>A nombre de</dt><dd>${esc(b.guestName)}</dd>
        </dl>
        <div class="breakdown">
          ${b.breakdown.map(x => `<div class="ln"><span>${cop(x.price)} × ${x.count} ${x.count === 1 ? 'noche' : 'noches'}${x.label !== 'Noche' ? ` (${esc(x.label)})` : ''}</span><span>${cop(x.price * x.count)}</span></div>`).join('')}
          ${b.cleaningFee ? `<div class="ln"><span>Limpieza</span><span>${cop(b.cleaningFee)}</span></div>` : ''}
          <div class="ln tot"><span>Total</span><span>${cop(b.total)}</span></div>
          <div class="ln"><span>Pagado</span><b style="color:var(--green-700)">${cop(b.amountPaid)}</b></div>
          ${b.balance > 0 && b.status !== 'cancelled' ? `<div class="ln"><span>Saldo pendiente</span><b>${cop(b.balance)}</b></div>` : ''}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
          ${(b.status === 'pending_payment' && !processing) || b.status === 'expired' ? `<button class="btn btn-accent" id="payNow"><i class="fa-solid fa-lock"></i> ${b.status === 'expired' ? 'Intentar de nuevo' : 'Pagar'} ${cop(b.deposit)}</button>` : ''}
          ${b.status === 'confirmed' && b.balance > 0 ? `<button class="btn btn-accent" id="payNow"><i class="fa-solid fa-lock"></i> Pagar saldo ${cop(b.balance)}</button>` : ''}
          ${['confirmed', 'completed'].includes(b.status) ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(gcalLink(b, h))}"><i class="fa-regular fa-calendar-plus"></i> Agregar a mi calendario</a>` : ''}
          ${h.mapUrl ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(h.mapUrl)}"><i class="fa-solid fa-map-location-dot"></i> Cómo llegar</a>` : ''}
          ${b.canReview ? `<a class="btn btn-primary" href="/resena.html?token=${encodeURIComponent(b.reviewToken)}"><i class="fa-solid fa-star"></i> Dejar mi reseña</a>` : ''}
        </div>
      </div>
      ${b.payments.length ? `<div class="card card-pad" style="margin-top:16px"><h3 style="font-size:1rem;margin-bottom:10px">Pagos</h3>
        ${b.payments.map(x => `<div class="ln" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)">
          <span class="small">${esc(x.created_at.slice(0, 16))} · ${esc(x.method || '')} ${x.purpose === 'balance' ? '· saldo' : ''}</span>
          <span>${cop(x.amount)} <span class="pill ${PAY[x.status]?.[1] || 'gray'}">${PAY[x.status]?.[0] || esc(x.status)}</span></span></div>`).join('')}</div>` : ''}
      <p class="small muted center" style="margin-top:20px">Guarda este enlace: con él puedes volver a ver tu reserva. También lo encuentras en <a href="/mis-reservas.html">Mis reservas</a> con tu código y correo.</p>`;

    $('#payNow') && $('#payNow').addEventListener('click', async e => {
      const btn = e.currentTarget; btn.disabled = true;
      try { const r = await api(`/api/bookings/${encodeURIComponent(code)}/pay`, { method: 'POST', body: { t } }); goToCheckout(r.checkout); }
      catch (err) { toast(err.message, true); btn.disabled = false; }
    });
    $('#demoOk') && $('#demoOk').addEventListener('click', async () => {
      try {
        await api(`/api/bookings/${encodeURIComponent(code)}/demo-approve`, { method: 'POST', body: { t, reference: demoRef } });
        const u = new URL(location.href); u.searchParams.delete('demo'); history.replaceState(null, '', u); location.reload();
      } catch (err) { toast(err.message, true); }
    });
  }

  (async () => { if (txId) await verifyFromWompi(); load(); })();
})();
