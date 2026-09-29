(function () {
  'use strict';
  const { $, $$, esc, api, D, toast } = window.CC;
  const page = document.body.dataset.page;
  const root = $('#page');

  // ------------------------------------------------------------ Mis reservas
  if (page === 'mis-reservas') {
    let last = null;
    try { last = JSON.parse(localStorage.getItem('cc_last_booking') || 'null'); } catch { /* sin almacenamiento */ }
    root.innerHTML = `
      <h1 style="font-size:1.8rem;margin-bottom:6px">Mis reservas</h1>
      <p class="muted" style="margin-bottom:22px">Ingresa el código que te llegó al correo (por ejemplo CC-7H3K9Q) y el correo con el que reservaste.</p>
      ${last ? `<div class="alert alert-info" style="margin-bottom:18px"><i class="fa-solid fa-clock-rotate-left"></i><span>Tu última reserva en este dispositivo: <a href="/reserva.html?code=${encodeURIComponent(last.code)}&t=${encodeURIComponent(last.t)}"><b>${esc(last.code)}</b></a></span></div>` : ''}
      <form class="card card-pad" id="lookup">
        <div class="field"><label for="lc">Código de reserva</label><input id="lc" required maxlength="20" autocapitalize="characters" placeholder="CC-XXXXXX"></div>
        <div class="field"><label for="le">Correo electrónico</label><input id="le" type="email" required maxlength="200"></div>
        <div class="alert alert-danger hidden" id="lerr"></div>
        <button class="btn btn-primary btn-block" style="margin-top:8px">Ver mi reserva</button>
      </form>`;
    $('#lookup').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#lerr'); err.classList.add('hidden');
      try {
        const r = await api('/api/bookings/lookup', { method: 'POST', body: { code: $('#lc').value.trim(), email: $('#le').value.trim() } });
        location.href = `/reserva.html?code=${encodeURIComponent(r.code)}&t=${encodeURIComponent(r.t)}`;
      } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    });
  }

  // ------------------------------------------------------------ Reseña verificada
  if (page === 'resena') {
    const token = new URLSearchParams(location.search).get('token');
    (async () => {
      let info;
      try { info = await api(`/api/reviews/${encodeURIComponent(token || '')}`); }
      catch (err) { root.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div>`; return; }
      if (info.done) { root.innerHTML = thanks(info); return; }
      let rating = 0;
      root.innerHTML = `
        <h1 style="font-size:1.7rem">¿Cómo te fue en ${esc(info.house.name)}?</h1>
        <p class="muted" style="margin:6px 0 22px">Hola ${esc(info.guestName)}, tu estadía fue del ${D.medium(info.checkin)} al ${D.medium(info.checkout)}.</p>
        <form class="card card-pad" id="rv">
          <div class="field"><label>Calificación</label><div class="star-input" id="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} estrellas"><i class="fa-solid fa-star"></i></button>`).join('')}</div></div>
          <div class="field"><label for="rc">Cuéntale a otros viajeros tu experiencia</label><textarea id="rc" maxlength="2000" required minlength="10" placeholder="¿Qué fue lo que más te gustó? ¿La casa era como en las fotos?"></textarea></div>
          <div class="alert alert-danger hidden" id="rerr"></div>
          <button class="btn btn-primary btn-block">Publicar reseña</button>
        </form>`;
      const paint = () => $$('#stars button').forEach(b => b.classList.toggle('on', Number(b.dataset.n) <= rating));
      $$('#stars button').forEach(b => b.addEventListener('click', () => { rating = Number(b.dataset.n); paint(); }));
      $('#rv').addEventListener('submit', async e => {
        e.preventDefault();
        const err = $('#rerr'); err.classList.add('hidden');
        if (!rating) { err.textContent = 'Elige una calificación de 1 a 5 estrellas.'; err.classList.remove('hidden'); return; }
        try { await api('/api/reviews', { method: 'POST', body: { token, rating, comment: $('#rc').value } }); root.innerHTML = thanks(info); }
        catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
      });
    })();
    const thanks = info => `<div class="status-hero ok"><div class="big"><i class="fa-solid fa-heart"></i></div><h1 style="font-size:1.6rem">¡Gracias por tu reseña!</h1>
      <p class="muted">Ya aparece en la página de <a href="/casa.html?c=${encodeURIComponent(info.house.slug)}">${esc(info.house.name)}</a>.</p></div>`;
  }

  // ------------------------------------------------------------ Términos
  if (page === 'terminos') {
    api('/api/terms').then(r => {
      root.innerHTML = `<h1 style="font-size:1.8rem;margin-bottom:18px">Términos y política de cancelación</h1><div class="card card-pad prose"><p>${esc(r.terms)}</p></div>`;
    }).catch(err => toast(err.message, true));
  }
})();
