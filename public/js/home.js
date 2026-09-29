(function () {
  'use strict';
  const { $, esc, cop, api, D, stars } = window.CC;
  const state = { checkin: null, checkout: null, guests: 1 };
  let pop = null;

  const guestsSel = $('#searchGuests');
  for (let i = 1; i <= 20; i++) guestsSel.insertAdjacentHTML('beforeend', `<option value="${i}">${i} ${i === 1 ? 'huésped' : 'huéspedes'}</option>`);
  guestsSel.addEventListener('change', () => { state.guests = Number(guestsSel.value); });

  function datesLabel() {
    $('#searchDatesLabel').textContent = state.checkin && state.checkout
      ? `${D.short(state.checkin)} — ${D.short(state.checkout)}` : (state.checkin ? `${D.short(state.checkin)} — Salida` : 'Llegada — Salida');
  }

  function openDates() {
    if (pop) return closeDates();
    const anchor = $('#searchDates').getBoundingClientRect();
    pop = document.createElement('div');
    pop.className = 'popover';
    pop.style.left = Math.max(12, anchor.left + window.scrollX) + 'px';
    pop.style.top = (anchor.bottom + window.scrollY + 12) + 'px';
    pop.innerHTML = '<div id="homeCal"></div><div class="cal-foot"><button type="button" class="btn btn-ghost btn-sm" id="calClear">Borrar</button><button type="button" class="btn btn-primary btn-sm" id="calOk">Listo</button></div>';
    document.body.appendChild(pop);
    const cal = new window.RangeCalendar($('#homeCal', pop), {
      months: window.innerWidth < 700 ? 1 : 2, start: state.checkin, end: state.checkout,
      onChange: (s, e) => { state.checkin = s; state.checkout = e; datesLabel(); if (s && e) setTimeout(closeDates, 250); },
    });
    $('#calClear', pop).addEventListener('click', () => cal.clear());
    $('#calOk', pop).addEventListener('click', closeDates);
    setTimeout(() => document.addEventListener('mousedown', outside), 0);
  }
  function outside(e) { if (pop && !pop.contains(e.target) && !$('#searchDates').contains(e.target)) closeDates(); }
  function closeDates() { if (pop) { pop.remove(); pop = null; document.removeEventListener('mousedown', outside); } }
  $('#searchDates').addEventListener('click', openDates);
  $('#searchDates').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDates(); } });

  function card(h, withDates) {
    const params = new URLSearchParams({ c: h.slug });
    if (withDates) { params.set('in', state.checkin); params.set('out', state.checkout); }
    if (state.guests > 1) params.set('g', state.guests);
    const feats = [`${h.maxGuests} huéspedes`, `${h.bedrooms} hab.`, `${h.bathrooms} baños`].join(' · ');
    const price = withDates && h.available
      ? `<b>${cop(h.quote.total)}</b> <span class="muted">total · ${h.quote.nights} ${h.quote.nights === 1 ? 'noche' : 'noches'}</span>`
      : `<b>${cop(h.priceNight)}</b> <span class="muted">/ noche</span>`;
    return `<a class="house-card" href="/casa.html?${params}">
      <div class="ph">${h.cover ? `<img src="${esc(h.cover)}" alt="${esc(h.name)}" loading="lazy">` : ''}
        ${h.badge ? `<span class="badge">${esc(h.badge)}</span>` : ''}
        ${withDates && !h.available ? '<div class="unavail">No disponible en esas fechas</div>' : ''}</div>
      <div class="meta">
        <div class="row"><h3>${esc(h.name)}</h3>${stars(h.rating)}</div>
        <div class="loc">${esc(h.location)}</div>
        <div class="feats">${esc(feats)}</div>
        <div class="price">${price}</div>
      </div></a>`;
  }

  async function load() {
    const withDates = !!(state.checkin && state.checkout);
    const q = new URLSearchParams({ guests: state.guests });
    if (withDates) { q.set('checkin', state.checkin); q.set('checkout', state.checkout); }
    const grid = $('#houses');
    try {
      const { houses } = await api('/api/houses?' + q);
      if (withDates) houses.sort((a, b) => Number(b.available) - Number(a.available));
      const avail = houses.filter(h => !withDates || h.available).length;
      $('#listTitle').textContent = withDates ? `${avail} ${avail === 1 ? 'casa disponible' : 'casas disponibles'}` : 'Nuestras casas';
      $('#listSub').textContent = withDates ? `${D.medium(state.checkin)} → ${D.medium(state.checkout)} · ${state.guests} ${state.guests === 1 ? 'huésped' : 'huéspedes'}` : 'Elige tu próximo destino de descanso';
      $('#clearSearch').classList.toggle('hidden', !withDates);
      grid.innerHTML = houses.length ? houses.map(h => card(h, withDates)).join('') : '<p class="muted">No hay casas para ese número de huéspedes.</p>';
      const hero = houses.find(h => h.coverFull);
      if (hero && !$('#heroBg').style.backgroundImage) $('#heroBg').style.backgroundImage = `url("${hero.coverFull}")`;
    } catch (err) {
      grid.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div>`;
    }
  }

  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault(); closeDates(); load();
    document.getElementById('casas').scrollIntoView({ behavior: 'smooth' });
  });
  $('#clearSearch').addEventListener('click', () => { state.checkin = state.checkout = null; datesLabel(); load(); });

  load();
})();
