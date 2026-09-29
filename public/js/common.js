/* Utilidades compartidas del sitio público y del panel */
(function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cop = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  async function api(path, { method = 'GET', body, form } = {}) {
    const opts = { method, headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
    if (form) opts.body = form;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Ocurrió un error. Intenta de nuevo.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Fechas en texto YYYY-MM-DD (sin zona horaria)
  const D = {
    parse: s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
    fmt: dt => dt.toISOString().slice(0, 10),
    add: (s, n) => { const d = D.parse(s); d.setUTCDate(d.getUTCDate() + n); return D.fmt(d); },
    diff: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
    short: s => D.parse(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    long: s => D.parse(s).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    medium: s => D.parse(s).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    today: () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
  };

  function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), isErr ? 5000 : 3000);
  }

  /** Modal simple. Devuelve { el, close }. body es HTML ya escapado. */
  function modal({ title, body, footer = '', wide = false, onClose }) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</div>`;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    return { el: back, close };
  }

  function stars(rating) {
    if (!rating || !rating.count) return '<span class="new-tag">Nuevo</span>';
    return `<span class="stars"><i class="fa-solid fa-star"></i> ${String(rating.average).replace('.', ',')} <span class="muted">(${rating.count})</span></span>`;
  }

  let sitePromise = null;
  const site = () => (sitePromise ||= api('/api/site'));

  async function mountChrome() {
    const header = $('#site-header');
    const footer = $('#site-footer');
    const s = await site().catch(() => null);
    if (header) {
      header.className = 'site-header';
      header.innerHTML = `
        ${s && s.paymentsMode === 'demo' ? '<div class="demo-banner"><i class="fa-solid fa-flask"></i> Sitio en modo de pruebas: los pagos son simulados.</div>' : ''}
        <div class="container">
          <a class="brand" href="/"><span class="brand-mark"><i class="fa-solid fa-leaf"></i></span>${esc(s ? s.name : 'Casas Campestres')}</a>
          <button class="nav-toggle" aria-label="Menú"><i class="fa-solid fa-bars"></i></button>
          <nav class="nav">
            <a href="/#casas">Casas</a>
            <a href="/mis-reservas.html">Mis reservas</a>
            <a href="/#contacto">Contacto</a>
          </nav>
        </div>`;
      const nav = $('.nav', header);
      $('.nav-toggle', header).addEventListener('click', () => nav.classList.toggle('open'));
    }
    if (footer && s) {
      const c = s.contact;
      footer.className = 'site-footer';
      footer.id = 'contacto';
      footer.innerHTML = `<div class="container">
        <div class="cols">
          <div><h4><i class="fa-solid fa-leaf"></i> ${esc(s.name)}</h4><p>${esc(s.about)}</p>
            <div class="social">
              ${c.instagram ? `<a href="${esc(c.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>` : ''}
              ${c.facebook ? `<a href="${esc(c.facebook)}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>` : ''}
              ${c.tiktok ? `<a href="${esc(c.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok"><i class="fa-brands fa-tiktok"></i></a>` : ''}
            </div></div>
          <div><h4>Enlaces</h4><ul><li><a href="/#casas">Casas</a></li><li><a href="/mis-reservas.html">Mis reservas</a></li><li><a href="/terminos.html">Términos y cancelación</a></li></ul></div>
          <div><h4>Contacto</h4><ul>
            ${c.phone ? `<li><i class="fa-solid fa-phone"></i> <a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></li>` : ''}
            ${c.email ? `<li><i class="fa-solid fa-envelope"></i> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ''}
            ${c.address ? `<li><i class="fa-solid fa-location-dot"></i> ${esc(c.address)}</li>` : ''}
          </ul></div>
        </div>
        <div class="bottom"><span>© ${new Date().getFullYear()} ${esc(s.name)}</span><span><i class="fa-solid fa-lock"></i> Pagos seguros con Wompi · <a href="/admin/">Acceso propietario</a></span></div>
      </div>`;
    }
  }

  /** Envía al huésped al checkout de pago (Wompi) o al simulador en modo demo. */
  function goToCheckout(checkout) {
    if (checkout.mode === 'demo') { location.href = checkout.redirect; return; }
    const f = document.createElement('form');
    f.method = 'GET'; f.action = checkout.action;
    for (const [k, v] of Object.entries(checkout.fields)) {
      const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
    }
    document.body.appendChild(f);
    f.submit();
  }

  window.CC = { esc, cop, $, $$, api, D, toast, modal, stars, site, mountChrome, goToCheckout };
  document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('site-header')) mountChrome(); });
})();
