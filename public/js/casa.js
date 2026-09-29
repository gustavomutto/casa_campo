(function () {
  'use strict';
  const { $, $$, esc, cop, api, D, stars, toast, modal, goToCheckout, site } = window.CC;
  const params = new URLSearchParams(location.search);
  const slug = params.get('c');
  const state = { checkin: params.get('in'), checkout: params.get('out'), guests: Number(params.get('g')) || 1, quote: null, available: false };
  let house, calData, inlineCal, pop = null;

  if (!slug) { location.href = '/'; return; }

  async function init() {
    try {
      const [{ house: h }, cal] = await Promise.all([api(`/api/houses/${encodeURIComponent(slug)}`), api(`/api/houses/${encodeURIComponent(slug)}/calendar`)]);
      house = h; calData = cal;
    } catch (err) {
      $('#page').innerHTML = `<div class="narrow"><div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div><p style="margin-top:16px"><a href="/">Volver al inicio</a></p></div>`;
      return;
    }
    document.title = `${house.name} · Casas Campestres`;
    state.guests = Math.min(state.guests, house.maxGuests);
    render();
    if (state.checkin && state.checkout) updateQuote(); else renderBooking();
  }

  // ------------------------------------------------------------ Render principal
  function render() {
    const media = house.media;
    const shown = media.slice(0, 5);
    const n = Math.min(shown.length, 5);
    const galleryCls = n <= 2 ? `n${n}` : (n < 5 ? 'n3' : '');
    const gallery = n ? `<div class="gallery ${galleryCls}">
      ${shown.map((m, i) => `<div class="g" data-i="${i}">
        ${m.kind === 'video' ? `<video src="${esc(m.src)}#t=0.5" muted preload="metadata" playsinline></video>` : `<img src="${esc(i === 0 ? (m.kind === 'image' ? m.src : m.thumb) : m.thumb)}" alt="${esc(m.caption || house.name)}">`}
        ${m.kind !== 'image' ? '<span class="play"><i class="fa-solid fa-circle-play"></i></span>' : ''}</div>`).join('')}
      ${media.length > 1 ? `<button class="btn btn-ghost btn-sm show-all" id="showAll"><i class="fa-solid fa-grip"></i> Ver ${media.length} fotos y videos</button>` : ''}
    </div>` : '';

    const videos = media.filter(m => m.kind !== 'image').length;

    $('#page').innerHTML = `
      <div class="detail-head">
        <h1>${esc(house.name)}</h1>
        <div class="sub">${stars(house.rating)} <span>·</span> <span><i class="fa-solid fa-location-dot"></i> ${esc(house.location)}</span>
          ${videos ? `<span>·</span><span><i class="fa-solid fa-video"></i> ${videos} ${videos === 1 ? 'video' : 'videos'}</span>` : ''}</div>
      </div>
      ${gallery}
      <div class="detail-grid">
        <div>
          <div class="detail-block">
            <div class="facts">
              <span class="fact"><i class="fa-solid fa-users"></i> ${house.maxGuests} huéspedes</span>
              <span class="fact"><i class="fa-solid fa-door-closed"></i> ${house.bedrooms} habitaciones</span>
              <span class="fact"><i class="fa-solid fa-bed"></i> ${house.beds} camas</span>
              <span class="fact"><i class="fa-solid fa-bath"></i> ${house.bathrooms} baños</span>
            </div>
          </div>
          <div class="detail-block prose"><h2>Sobre este alojamiento</h2>${house.description.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
          ${house.amenities.length ? `<div class="detail-block"><h2>Lo que ofrece este lugar</h2><div class="amenities">
            ${house.amenities.map(a => `<div><i class="fa-solid ${esc(a.icon)}"></i>${esc(a.label)}</div>`).join('')}</div></div>` : ''}
          <div class="detail-block" id="disponibilidad">
            <h2>Disponibilidad</h2>
            <p class="muted small" style="margin:-8px 0 14px">Las fechas tachadas ya están reservadas (aquí o en otras plataformas).${house.minNights > 1 ? ` Estadía mínima: ${house.minNights} noches.` : ''}</p>
            <div id="inlineCal"></div>
            <div class="cal-foot"><span class="small muted" id="inlineSummary"></span><button type="button" class="btn btn-ghost btn-sm" id="inlineClear">Borrar fechas</button></div>
          </div>
          <div class="detail-block"><h2>Horarios y reglas</h2>
            <div class="times"><div><small>Llegada</small><b>Desde las ${esc(house.checkinTime)}</b></div><div><small>Salida</small><b>Hasta las ${esc(house.checkoutTime)}</b></div></div>
            ${house.houseRules ? `<div class="prose" style="margin-top:14px"><p>${esc(house.houseRules)}</p></div>` : ''}
            <p class="small" style="margin-top:10px"><a href="/terminos.html" target="_blank">Política de cancelación y términos</a></p>
          </div>
          <div class="detail-block" id="resenas">
            <h2>${house.rating.count ? `<i class="fa-solid fa-star" style="color:var(--accent)"></i> ${String(house.rating.average).replace('.', ',')} · ${house.rating.count} ${house.rating.count === 1 ? 'reseña' : 'reseñas'}` : 'Reseñas'}</h2>
            ${house.reviews.length ? `<div class="reviews">${house.reviews.map(r => `<div class="review">
              <div class="who"><div class="avatar">${esc(r.author[0] || '?')}</div><div><b>${esc(r.author)}</b><div class="small muted">${esc(D.parse(r.date).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }))} · ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div></div></div>
              <p>${esc(r.comment)}</p>${r.hostReply ? `<div class="reply"><b>Respuesta del anfitrión:</b> ${esc(r.hostReply)}</div>` : ''}</div>`).join('')}</div>`
              : '<p class="muted">Aún no hay reseñas. Solo los huéspedes que se hospedan pueden dejar una, así que todas son verificadas.</p>'}
          </div>
          ${house.mapUrl ? `<div class="detail-block"><h2>Ubicación</h2><p>${esc(house.location)}</p><p style="margin-top:8px" class="small muted">La ubicación exacta se comparte al confirmar la reserva.</p></div>` : ''}
        </div>
        <aside><div class="card book-card" id="bookCard"></div></aside>
      </div>
      <div class="mobile-bar" id="mobileBar"></div>`;

    $$('.gallery .g').forEach(g => g.addEventListener('click', () => lightbox(Number(g.dataset.i))));
    $('#showAll') && $('#showAll').addEventListener('click', () => lightbox(0));

    inlineCal = new window.RangeCalendar($('#inlineCal'), {
      months: window.innerWidth < 700 ? 1 : 2, today: calData.today, unavailable: calData.unavailable, occupied: calData.occupied,
      bufferDays: calData.bufferDays, minNights: house.minNights, start: state.checkin, end: state.checkout,
      onChange: (s, e) => setDates(s, e, 'inline'),
    });
    $('#inlineClear').addEventListener('click', () => setDates(null, null));
  }

  function setDates(s, e, from) {
    state.checkin = s; state.checkout = e; state.quote = null;
    if (from !== 'inline' && inlineCal) { inlineCal.start = s; inlineCal.end = e; inlineCal.render(); }
    const url = new URL(location.href);
    s && e ? (url.searchParams.set('in', s), url.searchParams.set('out', e)) : (url.searchParams.delete('in'), url.searchParams.delete('out'));
    history.replaceState(null, '', url);
    if (s && e) updateQuote(); else renderBooking();
  }

  async function updateQuote() {
    renderBooking(true);
    try {
      const r = await api(`/api/houses/${encodeURIComponent(slug)}/quote?checkin=${state.checkin}&checkout=${state.checkout}&guests=${state.guests}`);
      state.quote = r.quote; state.available = r.available; state.reason = r.reason;
    } catch (err) {
      state.quote = null; state.available = false; state.reason = err.message;
    }
    renderBooking();
  }

  // ------------------------------------------------------------ Tarjeta de reserva
  function renderBooking(loading = false) {
    const q = state.quote;
    const has = state.checkin && state.checkout;
    const nightsLabel = n => `${n} ${n === 1 ? 'noche' : 'noches'}`;
    $('#bookCard').innerHTML = `
      <div class="price-line"><b>${cop(house.priceNight)}</b><span class="muted">/ noche</span>
        ${house.priceWeekend ? `<span class="small muted">(vie-sáb ${cop(house.priceWeekend)})</span>` : ''}</div>
      <div class="date-box">
        <button type="button" data-open="in"><small>Llegada</small><span>${state.checkin ? D.medium(state.checkin) : 'Agregar fecha'}</span></button>
        <button type="button" data-open="out"><small>Salida</small><span>${state.checkout ? D.medium(state.checkout) : 'Agregar fecha'}</span></button>
      </div>
      <div class="guests-box"><div><small>Huéspedes</small>${state.guests} ${state.guests === 1 ? 'huésped' : 'huéspedes'}</div>
        <div class="stepper"><button type="button" data-g="-1" ${state.guests <= 1 ? 'disabled' : ''} aria-label="Menos">−</button><button type="button" data-g="1" ${state.guests >= house.maxGuests ? 'disabled' : ''} aria-label="Más">+</button></div></div>
      <div style="margin-top:16px">
        ${loading ? '<div class="center"><span class="spinner"></span></div>'
          : !has ? '<button class="btn btn-primary btn-lg btn-block" data-open="in">Ver disponibilidad</button>'
          : !state.available ? `<div class="alert alert-warn"><i class="fa-solid fa-circle-info"></i>${esc(state.reason || 'Fechas no disponibles')}</div>`
          : '<button class="btn btn-accent btn-lg btn-block" id="reserveBtn"><i class="fa-solid fa-lock"></i> Reservar</button>'}
      </div>
      ${has && q && !loading ? `<div class="breakdown">
        ${q.breakdown.map(b => `<div class="ln"><span>${cop(b.price)} × ${nightsLabel(b.count)}${b.label !== 'Noche' ? ` <span class="pill gray">${esc(b.label)}</span>` : ''}</span><span>${cop(b.price * b.count)}</span></div>`).join('')}
        ${q.cleaningFee ? `<div class="ln"><span>Tarifa de limpieza</span><span>${cop(q.cleaningFee)}</span></div>` : ''}
        <div class="ln tot"><span>Total</span><span>${cop(q.total)}</span></div>
        ${q.depositPercent < 100 ? `<div class="ln"><span>Pagas hoy (${q.depositPercent}%)</span><b>${cop(q.deposit)}</b></div><div class="ln small"><span>Saldo antes de llegar</span><span>${cop(q.balance)}</span></div>` : ''}
      </div>` : ''}
      <div class="secure-note"><i class="fa-solid fa-shield-halved"></i> Pago seguro procesado por Wompi</div>
      <div class="pay-logos"><span>VISA</span><span>MASTERCARD</span><span>PSE</span><span>NEQUI</span><span>BANCOLOMBIA</span></div>`;

    $$('#bookCard [data-open]').forEach(b => b.addEventListener('click', ev => openPicker(ev.currentTarget)));
    $$('#bookCard [data-g]').forEach(b => b.addEventListener('click', () => {
      state.guests = Math.max(1, Math.min(house.maxGuests, state.guests + Number(b.dataset.g)));
      has ? updateQuote() : renderBooking();
    }));
    $('#reserveBtn') && $('#reserveBtn').addEventListener('click', openGuestForm);

    $('#mobileBar').innerHTML = has && q && state.available
      ? `<div><b>${cop(q.total)}</b><div class="small muted">${D.short(state.checkin)} – ${D.short(state.checkout)}</div></div><button class="btn btn-accent" id="mReserve">Reservar</button>`
      : `<div><b>${cop(house.priceNight)}</b> <span class="muted small">/ noche</span></div><a class="btn btn-primary" href="#disponibilidad">Ver fechas</a>`;
    $('#mReserve') && $('#mReserve').addEventListener('click', openGuestForm);
  }

  function openPicker(anchorEl) {
    if (window.innerWidth < 960) { $('#disponibilidad').scrollIntoView({ behavior: 'smooth' }); return; }
    if (pop) closePicker();
    const r = $('#bookCard').getBoundingClientRect();
    pop = document.createElement('div');
    pop.className = 'popover';
    pop.style.left = Math.max(12, r.right + window.scrollX - 720) + 'px';
    pop.style.top = (r.top + window.scrollY + 70) + 'px';
    pop.innerHTML = '<div id="popCal"></div><div class="cal-foot"><button type="button" class="btn btn-ghost btn-sm" id="popClear">Borrar fechas</button><button type="button" class="btn btn-primary btn-sm" id="popClose">Cerrar</button></div>';
    document.body.appendChild(pop);
    const cal = new window.RangeCalendar($('#popCal', pop), {
      months: 2, today: calData.today, unavailable: calData.unavailable, occupied: calData.occupied,
      bufferDays: calData.bufferDays, minNights: house.minNights, start: state.checkin, end: state.checkout,
      onChange: (s, e) => { setDates(s, e); if (s && e) setTimeout(closePicker, 250); },
    });
    if (anchorEl.dataset.open === 'in' && state.checkin && state.checkout) { /* permite re-elegir */ }
    $('#popClear', pop).addEventListener('click', () => cal.clear());
    $('#popClose', pop).addEventListener('click', closePicker);
    setTimeout(() => document.addEventListener('mousedown', outside), 0);
  }
  function outside(e) { if (pop && !pop.contains(e.target) && !$('#bookCard').contains(e.target)) closePicker(); }
  function closePicker() { if (pop) { pop.remove(); pop = null; document.removeEventListener('mousedown', outside); } }

  // ------------------------------------------------------------ Datos del huésped y pago
  async function openGuestForm() {
    const q = state.quote;
    const s = await site();
    const m = modal({
      title: 'Confirma y paga',
      body: `
        <div class="house-mini">${house.media[0] ? `<img src="${esc(house.media.find(x => x.kind === 'image')?.thumb || '')}" alt="">` : ''}
          <div><b>${esc(house.name)}</b><div class="small muted">${D.medium(state.checkin)} → ${D.medium(state.checkout)} · ${state.guests} ${state.guests === 1 ? 'huésped' : 'huéspedes'}</div>
          <div class="small">Total ${cop(q.total)}${q.depositPercent < 100 ? ` · pagas hoy <b>${cop(q.deposit)}</b>` : ''}</div></div></div>
        <form id="guestForm" novalidate>
          <div class="field"><label for="gName">Nombre completo</label><input id="gName" autocomplete="name" required maxlength="120"></div>
          <div class="grid-2">
            <div class="field"><label for="gEmail">Correo electrónico</label><input id="gEmail" type="email" autocomplete="email" required maxlength="200"></div>
            <div class="field"><label for="gPhone">Celular</label><input id="gPhone" type="tel" autocomplete="tel" required placeholder="300 123 4567" maxlength="30"></div>
          </div>
          <div class="field"><label for="gDoc">Documento de identidad</label><input id="gDoc" maxlength="30" placeholder="Cédula o pasaporte"></div>
          <div class="field"><label for="gNotes">Mensaje para el anfitrión (opcional)</label><textarea id="gNotes" maxlength="1000" placeholder="Hora aproximada de llegada, ocasión especial…"></textarea></div>
          <label class="check"><input type="checkbox" id="gTerms"> <span>Acepto los <a href="/terminos.html" target="_blank">términos y la política de cancelación</a> y el tratamiento de mis datos para gestionar la reserva.</span></label>
          <div class="alert alert-danger hidden" id="gErr" style="margin-top:14px"></div>
        </form>
        ${s.paymentsMode === 'demo' ? '<div class="alert alert-warn" style="margin-top:14px"><i class="fa-solid fa-flask"></i>Modo de pruebas: el pago será simulado.</div>' : ''}`,
      footer: `<span class="small muted" style="margin-right:auto"><i class="fa-solid fa-lock"></i> Serás redirigido a Wompi para pagar</span><button class="btn btn-accent" id="payBtn"><i class="fa-solid fa-lock"></i> Pagar ${cop(q.deposit)}</button>`,
    });
    const el = m.el;
    $('#gName', el).focus();
    $('#payBtn', el).addEventListener('click', async () => {
      const err = $('#gErr', el);
      err.classList.add('hidden');
      const body = {
        house: slug, checkin: state.checkin, checkout: state.checkout, guests: state.guests,
        name: $('#gName', el).value, email: $('#gEmail', el).value, phone: $('#gPhone', el).value,
        document: $('#gDoc', el).value, notes: $('#gNotes', el).value, acceptTerms: $('#gTerms', el).checked,
      };
      const problems = [];
      if (body.name.trim().length < 3) problems.push('tu nombre');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email.trim())) problems.push('un correo válido');
      if (!/^[+\d\s()-]{7,30}$/.test(body.phone.trim())) problems.push('un celular válido');
      if (!body.acceptTerms) problems.push('aceptar los términos');
      if (problems.length) { err.textContent = 'Falta: ' + problems.join(', ') + '.'; err.classList.remove('hidden'); return; }
      const btn = $('#payBtn', el);
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Apartando fechas…';
      try {
        const r = await api('/api/bookings', { method: 'POST', body });
        try { localStorage.setItem('cc_last_booking', JSON.stringify({ code: r.code, t: r.token })); } catch { /* sin almacenamiento */ }
        goToCheckout(r.checkout);
      } catch (e) {
        err.textContent = e.message; err.classList.remove('hidden');
        btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-lock"></i> Pagar ${cop(q.deposit)}`;
        if (e.status === 409) { const cal = await api(`/api/houses/${encodeURIComponent(slug)}/calendar`); calData = cal; inlineCal.setData(cal); }
      }
    });
  }

  // ------------------------------------------------------------ Visor de fotos y videos
  function lightbox(start) {
    const media = house.media;
    let i = start;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<div class="lightbox-top"><span id="lbCount"></span><button id="lbClose"><i class="fa-solid fa-xmark"></i> Cerrar</button></div>
      <div class="lightbox-stage" id="lbStage"></div>`;
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    const show = () => {
      const m = media[i];
      $('#lbCount', lb).textContent = `${i + 1} / ${media.length}${m.caption ? ' · ' + m.caption : ''}`;
      const stage = $('#lbStage', lb);
      stage.innerHTML = (m.kind === 'image' ? `<img src="${esc(m.src)}" alt="${esc(m.caption || house.name)}">`
        : m.kind === 'video' ? `<video src="${esc(m.src)}" controls autoplay playsinline></video>`
        : `<iframe src="${esc(m.src)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>`)
        + (media.length > 1 ? '<button class="nav-btn prev" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button><button class="nav-btn next" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>' : '');
      $('.prev', stage) && $('.prev', stage).addEventListener('click', () => { i = (i - 1 + media.length) % media.length; show(); });
      $('.next', stage) && $('.next', stage).addEventListener('click', () => { i = (i + 1) % media.length; show(); });
    };
    const close = () => { lb.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', key); };
    const key = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { i = (i - 1 + media.length) % media.length; show(); }
      if (e.key === 'ArrowRight') { i = (i + 1) % media.length; show(); }
    };
    let tx = null;
    lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) { i = (i + (dx < 0 ? 1 : -1) + media.length) % media.length; show(); }
    });
    document.addEventListener('keydown', key);
    $('#lbClose', lb).addEventListener('click', close);
    show();
  }

  init();
})();
