/* Panel de administración */
(function () {
  'use strict';
  const { $, $$, esc, cop, api, D, toast, modal } = window.CC;
  const view = $('#view');
  let me = null;

  const STATUS = {
    pending_payment: ['Esperando pago', 'warn'], confirmed: ['Confirmada', ''], completed: ['Completada', 'gray'],
    cancelled: ['Cancelada', 'danger'], expired: ['Vencida', 'gray'], conflict: ['Conflicto', 'danger'],
  };
  const pill = s => `<span class="pill ${STATUS[s]?.[1] ?? 'gray'}">${STATUS[s]?.[0] ?? esc(s)}</span>`;
  const nights = n => `${n} ${n === 1 ? 'noche' : 'noches'}`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Si la sesión vence, al login
  async function call(path, opts) {
    try { return await api(path, opts); }
    catch (err) { if (err.status === 401) location.href = '/admin/login.html'; throw err; }
  }
  const guard = fn => async (...a) => { try { await fn(...a); } catch (err) { toast(err.message, true); } };

  function copyBtn(root = document) {
    $$('[data-copy]', root).forEach(b => b.addEventListener('click', async () => {
      const input = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
      toast('Enlace copiado');
    }));
  }
  const copyField = (id, value) => `<div class="copy-field"><input class="input" id="${id}" readonly value="${esc(value)}"><button type="button" class="btn btn-ghost btn-sm" data-copy="${id}"><i class="fa-regular fa-copy"></i> Copiar</button></div>`;

  // ============================================================ Enrutador
  const routes = {
    resumen: renderDashboard, calendario: renderCalendar, reservas: renderBookings, casas: renderHouses,
    casa: renderHouseEditor, limpieza: renderCleaning, sincronizacion: renderSync, resenas: renderReviews, ajustes: renderSettings,
  };
  async function route() {
    const [name, arg] = (location.hash.slice(1) || 'resumen').split('/');
    const fn = routes[name] || renderDashboard;
    $$('#sideNav a').forEach(a => a.classList.toggle('active', a.dataset.s === (name === 'casa' ? 'casas' : name)));
    view.innerHTML = '<div class="center" style="padding:80px"><span class="spinner"></span></div>';
    try { await fn(arg); } catch (err) {
      view.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div>`;
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ============================================================ Resumen
  async function renderDashboard() {
    const d = await call('/api/admin/dashboard');
    const alertCls = { danger: 'alert-danger', warn: 'alert-warn', info: 'alert-info' };
    view.innerHTML = `
      <div class="page-h"><h1>Hola 👋</h1><div class="actions"><a class="btn btn-primary" href="#casa/nueva"><i class="fa-solid fa-plus"></i> Nueva casa</a></div></div>
      ${d.alerts.length ? `<div class="stack" style="margin-bottom:20px">${d.alerts.map(a => `<div class="alert ${alertCls[a.level]}"><i class="fa-solid fa-circle-exclamation"></i><span>${esc(a.text)}</span></div>`).join('')}</div>` : ''}
      <div class="kpis">
        <div class="kpi"><small>Ingresos del mes (web)</small><b>${cop(d.income)}</b></div>
        ${d.occupancy.map(o => `<div class="kpi"><small>Ocupación · ${esc(o.house)}</small><b>${o.percent}%</b><div class="bar"><i style="width:${o.percent}%"></i></div><span class="small muted">${nights(o.nights)} este mes (todas las plataformas)</span></div>`).join('')}
        <div class="kpi"><small>Pagos en curso</small><b>${d.pendingPayment}</b><span class="small muted">fechas apartadas esperando pago</span></div>
      </div>
      <div class="cols-2">
        <div class="card card-pad"><h2><i class="fa-solid fa-plane-arrival"></i> Próximas reservas web</h2>
          ${d.upcoming.length ? d.upcoming.map(b => `<div class="list-row"><div><b>${esc(b.guest_name)}</b> · ${esc(b.house)}<div class="small muted">${D.medium(b.checkin)} → ${D.medium(b.checkout)} · ${b.guests} huésp.</div></div>
            <div style="text-align:right">${pill(b.status)}<div class="small"><a href="#reservas" data-open-booking="${b.id}">${esc(b.code)}</a></div></div></div>`).join('') : '<p class="muted">No hay reservas próximas.</p>'}
        </div>
        <div class="card card-pad"><h2><i class="fa-brands fa-airbnb"></i> Próximas reservas en otras plataformas</h2>
          ${d.externalUpcoming.length ? d.externalUpcoming.map(e => `<div class="list-row"><div><b>${esc(e.house)}</b><div class="small muted">${D.medium(e.start_date)} → ${D.medium(e.end_date)}</div></div><span class="pill airbnb">${esc(e.feed)}</span></div>`).join('') : '<p class="muted">Nada importado todavía. Conecta tus calendarios en <a href="#sincronizacion">Airbnb / Booking</a>.</p>'}
        </div>
        <div class="card card-pad"><h2><i class="fa-solid fa-broom"></i> Limpiezas (hoy a 2 días)</h2>
          ${d.cleaning.length ? d.cleaning.map(t => `<div class="list-row"><div><b>${esc(t.house_name)}</b><div class="small muted">${D.medium(t.date)} · ${esc(t.origin)}</div></div>
            ${t.same_day_turnover ? '<span class="pill danger">Llegan el mismo día</span>' : '<span class="pill info">Pendiente</span>'}</div>`).join('') : '<p class="muted">Sin limpiezas pendientes.</p>'}
          <p style="margin-top:10px"><a href="#limpieza">Ver todas →</a></p>
        </div>
      </div>`;
    $$('[data-open-booking]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openBooking(Number(a.dataset.openBooking)); }));
  }

  // ============================================================ Calendario
  // Ventana móvil: desde 2 días antes de hoy, 35 días
  let calStart = D.add(D.today(), -2);
  const CAL_DAYS = 35;
  async function renderCalendar() {
    const first = calStart;
    const next = D.add(first, CAL_DAYS);
    const data = await call(`/api/admin/calendar?from=${first}&to=${next}`);
    const days = CAL_DAYS;
    const dates = Array.from({ length: days }, (_, i) => D.add(first, i));
    const title = `${D.short(first)} – ${D.short(D.add(next, -1))}`;

    let grid = `<div class="hcell" style="border-bottom:1px solid var(--line)">Casa</div>` + dates.map(d => {
      const dow = D.parse(d).getUTCDay();
      return `<div class="dhead ${dow === 0 || dow === 6 ? 'we' : ''} ${d === data.today ? 'today' : ''}">${'DLMXJVS'[dow]}<b>${Number(d.slice(8))}</b></div>`;
    }).join('');

    for (const h of data.houses) {
      const events = []; // {start, end, cls, label, click}
      for (const b of h.bookings) events.push({ start: b.checkin, end: b.checkout, cls: b.status === 'pending_payment' ? 'pending' : b.status === 'conflict' ? 'conflict' : 'web', label: `${b.guest_name} · ${b.guests}p`, icon: 'fa-globe', act: `b:${b.id}` });
      for (const e of h.external) events.push({ start: e.start_date, end: e.end_date, cls: 'ext' + (e.is_reservation ? '' : ' block'), label: `${e.feed}${e.summary ? ' · ' + e.summary : ''}`, icon: 'fa-arrow-right-to-bracket', act: `e:${h.id}:${e.id}` });
      for (const bl of h.blocks) events.push({ start: bl.start_date, end: bl.end_date, cls: 'blk', label: bl.reason || 'Bloqueado', icon: 'fa-lock', act: `k:${bl.id}` });
      const buffer = new Set();
      if (h.bufferDays) for (const ev of events) if (ev.cls === 'web' || ev.cls === 'ext') for (let i = 0; i < h.bufferDays; i++) buffer.add(D.add(ev.end, i));
      const clean = Object.fromEntries(h.cleaning.map(c => [c.date, c]));

      grid += `<div class="hcell">${esc(h.name)}${h.active ? '' : ' <span class="pill gray">oculta</span>'}</div>`;
      grid += dates.map(d => {
        const dow = D.parse(d).getUTCDay();
        // Barras: empiezan a mitad del día de llegada y terminan a mitad del día de salida
        const starting = events.filter(ev => ev.start === d || (ev.start < first && d === first));
        const bars = starting.map(ev => {
          const inMonth = ev.start >= first;
          const startPos = D.diff(first, inMonth ? ev.start : first) + (inMonth ? 0.5 : 0);
          const endPos = ev.end < next ? D.diff(first, ev.end) + 0.5 : days;
          const w = Math.max(endPos - startPos, 0.5);
          return `<div class="ev ${ev.cls}" style="left:calc(${inMonth ? 50 : 0}% + 2px);width:calc(${w * 100}% - 4px)" data-act="${ev.act}" title="${esc(ev.label)}"><i class="fa-solid ${ev.icon}"></i>${esc(ev.label)}</div>`;
        }).join('');
        const c = clean[d];
        return `<div class="cell ${dow === 0 || dow === 6 ? 'we' : ''} ${buffer.has(d) ? 'buffer' : ''}" data-house="${h.id}" data-date="${d}">${bars}
          ${c ? `<span class="clean-dot ${c.status === 'hecha' ? 'done' : ''}" title="Limpieza ${c.status}${c.assignee ? ' · ' + esc(c.assignee) : ''}"><i class="fa-solid fa-broom"></i></span>` : ''}</div>`;
      }).join('');
    }

    view.innerHTML = `
      <div class="page-h"><h1>Calendario</h1>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-m="-1"><i class="fa-solid fa-chevron-left"></i></button>
          <b style="min-width:150px;text-align:center;align-self:center">${esc(title)}</b>
          <button class="btn btn-ghost btn-sm" data-m="1"><i class="fa-solid fa-chevron-right"></i></button>
          <button class="btn btn-ghost btn-sm" data-m="0">Hoy</button>
          <button class="btn btn-primary btn-sm" id="newBlock"><i class="fa-solid fa-lock"></i> Bloquear fechas</button>
        </div></div>
      <div class="tl-wrap"><div class="tl" style="grid-template-columns:170px repeat(${days}, minmax(38px, 1fr))">${grid}</div></div>
      <div class="legend">
        <span><i class="sw" style="background:var(--green-700)"></i> Reserva web</span>
        <span><i class="sw" style="background:#9ca3af"></i> Esperando pago</span>
        <span><i class="sw" style="background:#e11d48"></i> Reserva Airbnb/Booking</span>
        <span><i class="sw" style="background:#fda4af"></i> Bloqueo en otra plataforma</span>
        <span><i class="sw" style="background:#6b7280"></i> Bloqueo manual</span>
        <span><i class="sw" style="background:repeating-linear-gradient(45deg,#dbe6ff,#dbe6ff 3px,#fff 3px,#fff 6px)"></i> Días de limpieza</span>
        <span><i class="fa-solid fa-broom" style="color:var(--info)"></i> Limpieza programada</span>
      </div>
      <p class="small muted" style="margin-top:8px">Haz clic en un día libre para bloquearlo (mantenimiento, uso personal, reserva por fuera). Los bloqueos también se envían a Airbnb/Booking.</p>`;

    $$('[data-m]').forEach(b => b.addEventListener('click', () => {
      const m = Number(b.dataset.m);
      calStart = m === 0 ? D.add(D.today(), -2) : D.add(calStart, m * 28);
      renderCalendar().catch(e => toast(e.message, true));
    }));
    $('#newBlock').addEventListener('click', () => blockModal(data.houses, data.houses[0]?.id, D.today()));
    $$('.tl .ev').forEach(el => el.addEventListener('click', e => {
      e.stopPropagation();
      const [kind, a, b] = el.dataset.act.split(':');
      if (kind === 'b') openBooking(Number(a));
      if (kind === 'k') deleteBlock(Number(a));
      if (kind === 'e') {
        const ev = data.houses.find(h => h.id === Number(a)).external.find(x => x.id === Number(b));
        modal({ title: `Evento de ${ev.feed}`, body: `<p><b>${esc(ev.summary || 'Reservado')}</b></p><p class="muted">${D.medium(ev.start_date)} → ${D.medium(ev.end_date)}</p>
          <p class="small" style="margin-top:12px">Este evento viene del calendario de ${esc(ev.feed)}. Para cambiarlo, hazlo en ${esc(ev.feed)}; aquí se actualiza solo en la siguiente sincronización.</p>` });
      }
    }));
    $$('.tl .cell').forEach(c => c.addEventListener('click', () => blockModal(data.houses, Number(c.dataset.house), c.dataset.date)));
  }

  function blockModal(houses, houseId, start) {
    const m = modal({
      title: 'Bloquear fechas',
      body: `<div class="field"><label>Casa</label><select id="bH">${houses.map(h => `<option value="${h.id}" ${h.id === houseId ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
        <div class="grid-2"><div class="field"><label>Primera noche bloqueada</label><input type="date" id="bS" value="${start}"></div>
        <div class="field"><label>Día en que se libera</label><input type="date" id="bE" value="${D.add(start, 1)}"></div></div>
        <div class="field"><label>Motivo (solo lo ves tú)</label><input id="bR" maxlength="200" placeholder="Mantenimiento, uso familiar, reserva por teléfono…"></div>`,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="bSave">Bloquear</button>',
    });
    $('#bS', m.el).addEventListener('change', e => { if ($('#bE', m.el).value <= e.target.value) $('#bE', m.el).value = D.add(e.target.value, 1); });
    $('#bSave', m.el).addEventListener('click', guard(async () => {
      await call('/api/admin/blocks', { method: 'POST', body: { house_id: Number($('#bH', m.el).value), start_date: $('#bS', m.el).value, end_date: $('#bE', m.el).value, reason: $('#bR', m.el).value } });
      m.close(); toast('Fechas bloqueadas'); route();
    }));
  }
  function deleteBlock(id) {
    const m = modal({ title: 'Bloqueo manual', body: '<p>¿Quieres quitar este bloqueo y volver a abrir esas fechas para reservas?</p>',
      footer: '<button class="btn btn-ghost" data-close>No</button><button class="btn btn-danger" id="dYes">Quitar bloqueo</button>' });
    $('#dYes', m.el).addEventListener('click', guard(async () => { await call(`/api/admin/blocks/${id}`, { method: 'DELETE' }); m.close(); toast('Bloqueo eliminado'); route(); }));
  }

  // ============================================================ Reservas
  const bookingFilters = { status: '', house: '', q: '', when: 'upcoming' };
  async function renderBookings() {
    const [{ houses }, { bookings }] = await Promise.all([
      call('/api/admin/houses'), call('/api/admin/bookings?' + new URLSearchParams(Object.entries(bookingFilters).filter(([, v]) => v))),
    ]);
    view.innerHTML = `
      <div class="page-h"><h1>Reservas</h1></div>
      <div class="filters">
        <input class="input" id="fQ" placeholder="Buscar nombre, código, correo…" value="${esc(bookingFilters.q)}">
        <select class="input" id="fWhen"><option value="upcoming">Próximas y en curso</option><option value="past">Pasadas</option><option value="">Todas</option></select>
        <select class="input" id="fStatus"><option value="">Todos los estados</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
        <select class="input" id="fHouse"><option value="">Todas las casas</option>${houses.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select>
      </div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Código</th><th>Huésped</th><th>Casa</th><th>Fechas</th><th>Total</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>
        ${bookings.length ? bookings.map(b => `<tr class="click" data-id="${b.id}"><td><b>${esc(b.code)}</b></td><td>${esc(b.guest_name)}<div class="small muted">${esc(b.guest_phone)}</div></td>
          <td>${esc(b.house_name)}</td><td>${D.short(b.checkin)} → ${D.short(b.checkout)}<div class="small muted">${nights(b.nights)} · ${b.guests} huésp.</div></td>
          <td>${cop(b.total)}</td><td>${cop(b.amount_paid)}</td><td>${pill(b.status)}</td></tr>`).join('')
          : '<tr><td colspan="7" class="center muted" style="padding:30px">No hay reservas con esos filtros.</td></tr>'}
      </tbody></table></div>`;
    $('#fWhen').value = bookingFilters.when; $('#fStatus').value = bookingFilters.status; $('#fHouse').value = bookingFilters.house;
    const refilter = () => { bookingFilters.q = $('#fQ').value.trim(); bookingFilters.when = $('#fWhen').value; bookingFilters.status = $('#fStatus').value; bookingFilters.house = $('#fHouse').value; renderBookings().catch(e => toast(e.message, true)); };
    let timer; $('#fQ').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refilter, 350); });
    ['#fWhen', '#fStatus', '#fHouse'].forEach(s => $(s).addEventListener('change', refilter));
    $$('tr.click').forEach(tr => tr.addEventListener('click', () => openBooking(Number(tr.dataset.id))));
  }

  async function openBooking(id) {
    const { booking: b, payments } = await call(`/api/admin/bookings/${id}`).catch(e => { toast(e.message, true); throw e; });
    const actions = [];
    if (['pending_payment', 'confirmed', 'conflict', 'expired'].includes(b.status)) actions.push('<button class="btn btn-danger" data-st="cancelled">Cancelar reserva</button>');
    if (b.status === 'conflict') actions.push('<button class="btn btn-primary" data-st="confirmed">Marcar como resuelta (confirmada)</button>');
    if (b.status === 'confirmed' && b.checkout <= D.today()) actions.push('<button class="btn btn-ghost" data-st="completed">Marcar completada</button>');
    const m = modal({
      wide: true, title: `Reserva ${b.code}`,
      body: `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div><b style="font-size:1.1rem">${esc(b.house_name)}</b><div class="muted">${D.medium(b.checkin)} → ${D.medium(b.checkout)} · ${nights(b.nights)}</div></div>${pill(b.status)}</div>
        ${b.status === 'conflict' ? '<div class="alert alert-danger" style="margin-bottom:14px"><i class="fa-solid fa-triangle-exclamation"></i><span>Esta reserva se cruza con otra plataforma o se pagó cuando las fechas ya estaban ocupadas. Revisa Airbnb/Booking, contacta al huésped y decide: mantenerla (marcar resuelta) o cancelarla y reembolsar desde Wompi.</span></div>' : ''}
        <div class="cols-2">
          <div><h3 style="font-size:.95rem;margin-bottom:8px">Huésped</h3><dl class="kv">
            <dt>Nombre</dt><dd>${esc(b.guest_name)}</dd><dt>Correo</dt><dd><a href="mailto:${esc(b.guest_email)}">${esc(b.guest_email)}</a></dd>
            <dt>Celular</dt><dd><a href="tel:${esc(b.guest_phone)}">${esc(b.guest_phone)}</a></dd><dt>Documento</dt><dd>${esc(b.guest_document || '—')}</dd><dt>Huéspedes</dt><dd>${b.guests}</dd></dl>
            ${b.guest_notes ? `<div class="alert alert-info" style="margin-top:12px"><i class="fa-regular fa-comment"></i><span>${esc(b.guest_notes)}</span></div>` : ''}</div>
          <div><h3 style="font-size:.95rem;margin-bottom:8px">Dinero</h3><dl class="kv">
            ${b.breakdown.map(x => `<dt>${cop(x.price)} × ${x.count}${x.label !== 'Noche' ? ' ' + esc(x.label) : ''}</dt><dd>${cop(x.price * x.count)}</dd>`).join('')}
            <dt>Limpieza</dt><dd>${cop(b.cleaning_fee)}</dd><dt><b>Total</b></dt><dd>${cop(b.total)}</dd>
            <dt>Pagado</dt><dd style="color:var(--green-700)">${cop(b.amount_paid)}</dd><dt>Saldo</dt><dd>${cop(b.total - b.amount_paid)}</dd></dl></div>
        </div>
        <h3 style="font-size:.95rem;margin:18px 0 8px">Pagos</h3>
        ${payments.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Referencia</th><th>Medio</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
          ${payments.map(p => `<tr><td>${esc(p.updated_at.slice(0, 16))}</td><td class="small">${esc(p.reference)}${p.transaction_id ? `<div class="muted">Wompi: ${esc(p.transaction_id)}</div>` : ''}</td><td>${esc(p.method || '—')}</td><td>${cop(p.amount)}</td><td><span class="pill ${p.status === 'APPROVED' ? '' : p.status === 'DECLINED' || p.status === 'ERROR' ? 'danger' : 'gray'}">${esc(p.status)}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted small">Sin intentos de pago.</p>'}
        <div class="field" style="margin-top:18px"><label>Enlace privado del huésped (para reenviárselo)</label>${copyField('gLink', b.guest_link)}</div>
        <div class="field"><label>Notas internas</label><textarea id="aNotes" maxlength="4000">${esc(b.admin_notes)}</textarea></div>
        <button class="btn btn-ghost btn-sm" id="saveNotes">Guardar notas</button>`,
      footer: actions.join('') || '<button class="btn btn-ghost" data-close>Cerrar</button>',
    });
    copyBtn(m.el);
    $('#saveNotes', m.el).addEventListener('click', guard(async () => { await call(`/api/admin/bookings/${id}`, { method: 'PUT', body: { admin_notes: $('#aNotes', m.el).value } }); toast('Notas guardadas'); }));
    $$('[data-st]', m.el).forEach(btn => btn.addEventListener('click', guard(async () => {
      const to = btn.dataset.st;
      if (to === 'cancelled' && !confirm('¿Seguro que quieres cancelar esta reserva? Las fechas quedarán libres.')) return;
      const r = await call(`/api/admin/bookings/${id}/status`, { method: 'POST', body: { status: to } });
      m.close(); toast(r.note || 'Reserva actualizada'); route();
    })));
  }

  // ============================================================ Casas
  async function renderHouses() {
    const { houses } = await call('/api/admin/houses');
    view.innerHTML = `
      <div class="page-h"><h1>Casas</h1><div class="actions"><a class="btn btn-primary" href="#casa/nueva"><i class="fa-solid fa-plus"></i> Nueva casa</a></div></div>
      <div class="house-rows">${houses.map(h => {
        const cover = h.media.find(m => m.kind === 'image');
        return `<div class="house-row">
          ${cover ? `<img src="${esc(cover.thumb)}" alt="">` : '<div class="noimg"><i class="fa-regular fa-image"></i></div>'}
          <div><b>${esc(h.name)}</b> ${h.active ? '' : '<span class="pill gray">Oculta</span>'}
            <div class="small muted">${esc(h.location)} · ${cop(h.price_night)}/noche · ${h.max_guests} huésp. · ${h.media.length} fotos/videos</div>
            <div class="small" style="margin-top:4px">${h.feeds.length ? `<span class="pill"><i class="fa-solid fa-link"></i> ${h.feeds.map(f => esc(f.name)).join(', ')}</span>` : '<span class="pill warn">Sin conectar a Airbnb/Booking</span>'}
              ${h.latitude != null ? ' <span class="pill"><i class="fa-solid fa-location-dot"></i> Ubicación lista</span>' : ' <span class="pill warn"><i class="fa-solid fa-location-dot"></i> Falta ubicación</span>'}
              ${h.rating.count ? ` <span class="pill gray">★ ${h.rating.average} (${h.rating.count})</span>` : ''}</div></div>
          <div class="actions" style="display:flex;gap:8px"><a class="btn btn-ghost btn-sm" href="/casa.html?c=${encodeURIComponent(h.slug)}" target="_blank"><i class="fa-solid fa-eye"></i> Ver</a><a class="btn btn-primary btn-sm" href="#casa/${h.id}"><i class="fa-solid fa-pen"></i> Editar</a></div>
        </div>`;
      }).join('') || '<p class="muted">Aún no hay casas.</p>'}</div>`;
  }

  async function renderHouseEditor(arg) {
    const isNew = arg === 'nueva';
    const { house: h, amenities } = isNew ? { house: null, amenities: (await call('/api/admin/houses')).amenities } : await call(`/api/admin/houses/${Number(arg)}`);
    const v = h || { name: '', location: '', short_desc: '', description: '', house_rules: '', price_night: '', price_weekend: '', cleaning_fee: 0, max_guests: 6, bedrooms: 3, beds: 3, bathrooms: 2, min_nights: 1, checkin_time: '15:00', checkout_time: '11:00', cleaning_buffer_days: 0, deposit_percent: 100, badge: '', map_url: '', active: 1, amenities: [] };
    const f = (id, label, input, hint = '') => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
    const inp = (id, val, attrs = '') => `<input id="${id}" value="${esc(val ?? '')}" ${attrs}>`;

    view.innerHTML = `
      <div class="page-h"><h1>${isNew ? 'Nueva casa' : esc(h.name)}</h1>
        <div class="actions"><a class="btn btn-ghost btn-sm" href="#casas"><i class="fa-solid fa-arrow-left"></i> Volver</a>
        ${!isNew ? `<a class="btn btn-ghost btn-sm" target="_blank" href="/casa.html?c=${encodeURIComponent(h.slug)}"><i class="fa-solid fa-eye"></i> Ver como huésped</a>` : ''}</div></div>

      ${!isNew ? `<div class="form-section" id="mediaSec"><h2>Fotos y videos</h2>
        <p class="muted">La primera foto es la portada. Arrastra para cambiar el orden. Las fotos se optimizan automáticamente (y se les quitan datos de ubicación GPS). Videos MP4/MOV hasta 250 MB, o pega un enlace de YouTube.</p>
        <label class="dropzone" id="drop"><input type="file" id="files" multiple accept="image/*,video/mp4,video/quicktime,video/webm" hidden>
          <i class="fa-solid fa-cloud-arrow-up"></i><div><b>Arrastra fotos y videos aquí</b> o haz clic para elegirlos</div><div class="small muted">Puedes subir varios a la vez</div>
          <div class="progress hidden" id="prog"><i></i></div></label>
        <div class="copy-field" style="margin-top:12px"><input class="input" id="ytUrl" placeholder="https://youtube.com/watch?v=…  (opcional)"><button class="btn btn-ghost btn-sm" id="ytAdd"><i class="fa-brands fa-youtube"></i> Agregar video</button></div>
        <div class="media-grid" id="mediaGrid"></div></div>` : '<div class="alert alert-info" style="margin-bottom:16px"><i class="fa-solid fa-circle-info"></i>Guarda la casa primero; luego podrás subir fotos y videos.</div>'}

      <form id="hf">
        <div class="form-section"><h2>Información básica</h2><p class="muted">Lo que ven los huéspedes.</p>
          ${f('hName', 'Nombre de la casa', inp('hName', v.name, 'required maxlength="100"'))}
          <div class="grid-2">${f('hLoc', 'Ubicación (municipio, departamento)', inp('hLoc', v.location, 'maxlength="120"'))}${f('hBadge', 'Etiqueta en la portada (opcional)', inp('hBadge', v.badge, 'maxlength="30" placeholder="Destacado, Nuevo, Ideal familias…"'))}</div>
          ${f('hShort', 'Descripción corta', inp('hShort', v.short_desc, 'maxlength="200"'), 'Una frase para el listado.')}
          ${f('hDesc', 'Descripción completa', `<textarea id="hDesc" maxlength="6000" rows="7">${esc(v.description)}</textarea>`, 'Deja una línea en blanco para separar párrafos.')}
          <label class="check"><input type="checkbox" id="hActive" ${v.active ? 'checked' : ''}> <span>Publicada (visible y reservable en la web)</span></label>
        </div>
        <div class="form-section"><h2><i class="fa-solid fa-map-location-dot"></i> Ubicación y cómo llegar</h2>
          <p class="muted">El público solo ve la zona aproximada. Al huésped con reserva pagada le mostramos la ubicación exacta con botones de Google Maps y Waze, y se la enviamos por correo al confirmar y el día antes de llegar.</p>
          ${!isNew ? (v.latitude != null
            ? `<div class="alert alert-ok" style="margin-bottom:14px"><i class="fa-solid fa-circle-check"></i><span>Ubicación guardada. Los huéspedes ven la zona en la página de la casa y, al pagar, el mapa exacto con Google Maps y Waze.</span></div>`
            : `<div class="alert alert-warn" style="margin-bottom:14px"><i class="fa-solid fa-triangle-exclamation"></i><span><b>Falta la ubicación.</b> Mientras no la pongas, los huéspedes no verán mapa ni botones de "Cómo llegar". Pégala abajo y pulsa <b>Guardar cambios</b>.</span></div>`) : ''}
          ${f('hMap', 'Ubicación exacta de la casa', inp('hMap', v.map_url, 'maxlength="500" placeholder="Enlace de Google Maps o coordenadas: 10.4235, -73.5791"'),
            'En Google Maps: busca la casa, <b>mantén presionado</b> sobre la entrada hasta que salga un pin rojo, copia los números que aparecen arriba y pégalos aquí. También sirve el botón "Compartir" → copiar enlace.')}
          ${v.directions ? `<div class="map-frame"><iframe src="${esc(v.directions.embed)}" title="Vista previa" loading="lazy"></iframe></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px"><a class="btn btn-ghost btn-sm" target="_blank" href="${esc(v.directions.google)}"><i class="fa-brands fa-google"></i> Probar en Google Maps</a><a class="btn btn-ghost btn-sm" target="_blank" href="${esc(v.directions.waze)}"><i class="fa-brands fa-waze"></i> Probar en Waze</a></div>` : ''}
          ${f('hArrival', 'Indicaciones para llegar (se envían al huésped confirmado)', `<textarea id="hArrival" maxlength="4000" rows="5" placeholder="Ej: Desde Valledupar toma la vía a Pueblo Bello (45 min). Pasando el peaje, a 2 km gira a la derecha en la tienda La Esperanza. Portón verde con el letrero Casa Los Pinos. El último tramo es destapado, apto para carro normal. Al llegar llama al 300…">${esc(v.arrival_instructions || '')}</textarea>`,
            'Puedes incluir: referencias, estado de la vía, dónde parquear, a quién llamar al llegar, clave del portón o del wifi.')}
        </div>
        <div class="form-section"><h2><i class="fa-solid fa-vr-cardboard"></i> Recorrido virtual 360° (opcional)</h2>
          <p class="muted">Para que el huésped "camine" por la casa desde el celular. Pega el enlace de Matterport, Kuula, Momento360, Panoee o de Street View ("insertar mapa").</p>
          ${f('hTour', 'Enlace del recorrido', inp('hTour', v.tour_url || '', 'maxlength="500" placeholder="https://my.matterport.com/show/?m=…  o  https://kuula.co/share/collection/…"'))}
        </div>
        <div class="form-section"><h2>Capacidad</h2>
          <div class="grid-4">${f('hGuests', 'Huéspedes máx.', inp('hGuests', v.max_guests, 'type="number" min="1" max="100"'))}${f('hBedr', 'Habitaciones', inp('hBedr', v.bedrooms, 'type="number" min="0"'))}${f('hBeds', 'Camas', inp('hBeds', v.beds, 'type="number" min="0"'))}${f('hBath', 'Baños', inp('hBath', v.bathrooms, 'type="number" min="0"'))}</div>
        </div>
        <div class="form-section"><h2>Precios y reglas de reserva</h2><p class="muted">Valores en pesos colombianos, sin puntos.</p>
          <div class="grid-3">${f('hPrice', 'Precio por noche', inp('hPrice', v.price_night, 'type="number" min="10000" step="1000" required'))}
            ${f('hWeekend', 'Precio viernes y sábado', inp('hWeekend', v.price_weekend, 'type="number" min="10000" step="1000" placeholder="Igual"'), 'Déjalo vacío si es el mismo.')}
            ${f('hClean', 'Tarifa de limpieza (una vez)', inp('hClean', v.cleaning_fee, 'type="number" min="0" step="1000"'))}</div>
          <div class="grid-3">${f('hMin', 'Noches mínimas', inp('hMin', v.min_nights, 'type="number" min="1" max="60"'))}
            ${f('hDeposit', '% que se paga al reservar', `<select id="hDeposit">${[100, 50, 30].map(p => `<option value="${p}" ${v.deposit_percent === p ? 'selected' : ''}>${p}%${p === 100 ? ' (todo por adelantado)' : ''}</option>`).join('')}</select>`, 'El saldo lo paga el huésped en línea desde su enlace.')}
            ${f('hBuffer', 'Días de limpieza entre reservas', `<select id="hBuffer">${[0, 1, 2].map(p => `<option value="${p}" ${v.cleaning_buffer_days === p ? 'selected' : ''}>${p === 0 ? 'Ninguno (limpieza el mismo día)' : p === 1 ? '1 día libre después de cada salida' : '2 días libres'}</option>`).join('')}</select>`)}</div>
          <div class="grid-2">${f('hIn', 'Hora de llegada (check-in)', inp('hIn', v.checkin_time, 'type="time"'))}${f('hOut', 'Hora de salida (check-out)', inp('hOut', v.checkout_time, 'type="time"'))}</div>
          ${f('hRules', 'Reglas de la casa', `<textarea id="hRules" maxlength="4000" rows="4">${esc(v.house_rules)}</textarea>`)}
        </div>
        <div class="form-section"><h2>Comodidades</h2>
          <div class="amen-grid">${Object.entries(amenities).map(([k, [label, icon]]) => `<label><input type="checkbox" value="${k}" ${v.amenities.includes(k) ? 'checked' : ''}><i class="fa-solid ${icon}"></i> ${esc(label)}</label>`).join('')}</div>
        </div>
        ${!isNew ? `<div class="form-section"><h2>Temporadas y festivos</h2><p class="muted">Precios especiales para fechas concretas (Semana Santa, diciembre, puentes). Reemplazan el precio normal esas noches.</p>
          <div id="seasons"></div>
          <div class="grid-4" style="align-items:end;margin-top:10px">
            ${f('sName', 'Nombre', '<input id="sName" placeholder="Temporada diciembre">')}${f('sStart', 'Desde (noche)', '<input id="sStart" type="date">')}${f('sEnd', 'Hasta (última noche)', '<input id="sEnd" type="date">')}
            ${f('sPrice', 'Precio/noche', '<input id="sPrice" type="number" min="10000" step="1000">')}
          </div>
          <div class="grid-4" style="align-items:end">${f('sMin', 'Noches mín. (opcional)', '<input id="sMin" type="number" min="1">')}<div class="field"><button type="button" class="btn btn-ghost" id="sAdd"><i class="fa-solid fa-plus"></i> Agregar temporada</button></div></div>
        </div>` : ''}
        <div class="sticky-save">
          ${!isNew ? '<button type="button" class="btn btn-danger" id="hDel"><i class="fa-solid fa-trash"></i> Eliminar</button>' : ''}
          <button class="btn btn-primary btn-lg" id="hSave"><i class="fa-solid fa-floppy-disk"></i> ${isNew ? 'Crear casa' : 'Guardar cambios'}</button>
        </div>
      </form>`;

    $('#hf').addEventListener('submit', guard(async e => {
      e.preventDefault();
      const body = {
        name: $('#hName').value, location: $('#hLoc').value, badge: $('#hBadge').value, short_desc: $('#hShort').value, description: $('#hDesc').value,
        map_url: $('#hMap').value.trim(), arrival_instructions: $('#hArrival').value, tour_url: $('#hTour').value.trim(), active: $('#hActive').checked,
        max_guests: $('#hGuests').value, bedrooms: $('#hBedr').value, beds: $('#hBeds').value, bathrooms: $('#hBath').value,
        price_night: $('#hPrice').value, price_weekend: $('#hWeekend').value, cleaning_fee: $('#hClean').value || 0,
        min_nights: $('#hMin').value || 1, deposit_percent: $('#hDeposit').value, cleaning_buffer_days: $('#hBuffer').value,
        checkin_time: $('#hIn').value, checkout_time: $('#hOut').value, house_rules: $('#hRules').value,
        amenities: $$('.amen-grid input:checked').map(i => i.value),
      };
      const r = isNew ? await call('/api/admin/houses', { method: 'POST', body }) : await call(`/api/admin/houses/${h.id}`, { method: 'PUT', body });
      toast(isNew ? 'Casa creada. Ahora sube fotos y videos.' : 'Cambios guardados');
      if (isNew) location.hash = `casa/${r.house.id}`;
      else { const y = window.scrollY; await renderHouseEditor(String(h.id)); window.scrollTo(0, y); }
    }));

    if (isNew) return;

    $('#hDel').addEventListener('click', guard(async () => {
      if (!confirm(`¿Eliminar "${h.name}"? Si tiene reservas, solo se ocultará.`)) return;
      const r = await call(`/api/admin/houses/${h.id}`, { method: 'DELETE' });
      toast(r.deactivated ? 'La casa tiene reservas: se ocultó en lugar de borrarse.' : 'Casa eliminada'); location.hash = 'casas';
    }));

    // --- Temporadas
    const drawSeasons = list => {
      $('#seasons').innerHTML = list.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Temporada</th><th>Fechas</th><th>Precio</th><th>Mín.</th><th></th></tr></thead><tbody>
        ${list.map(s => `<tr><td>${esc(s.name)}</td><td>${D.short(s.start_date)} → ${D.short(s.end_date)}</td><td>${cop(s.price_night)}</td><td>${s.min_nights || '—'}</td><td><button class="icon-btn" data-sdel="${s.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="small muted">Sin temporadas especiales.</p>';
      $$('[data-sdel]').forEach(b => b.addEventListener('click', guard(async () => {
        await call(`/api/admin/seasons/${b.dataset.sdel}`, { method: 'DELETE' });
        drawSeasons(list.filter(s => String(s.id) !== b.dataset.sdel));
      })));
    };
    drawSeasons(h.seasons);
    $('#sAdd').addEventListener('click', guard(async () => {
      const r = await call(`/api/admin/houses/${h.id}/seasons`, { method: 'POST', body: { name: $('#sName').value, start_date: $('#sStart').value, end_date: $('#sEnd').value, price_night: $('#sPrice').value, min_nights: $('#sMin').value } });
      ['#sName', '#sStart', '#sEnd', '#sPrice', '#sMin'].forEach(s => { $(s).value = ''; });
      drawSeasons(r.seasons); toast('Temporada agregada');
    }));

    // --- Fotos y videos
    let media = h.media;
    const drawMedia = () => {
      $('#mediaGrid').innerHTML = media.map((m, i) => `<div class="media-item" draggable="true" data-id="${m.id}">
        ${m.kind === 'video' ? `<video src="${esc(m.src)}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(m.thumb)}" alt="">`}
        ${i === 0 && m.kind === 'image' ? '<span class="tag cover">Portada</span>' : m.kind !== 'image' ? `<span class="tag"><i class="fa-solid fa-video"></i> ${m.kind === 'youtube' ? 'YouTube' : 'Video'}</span>` : ''}
        <span class="grip"><i class="fa-solid fa-up-down-left-right"></i></span>
        <div class="tools"><span><button type="button" data-mv="-1" title="Mover antes"><i class="fa-solid fa-arrow-left"></i></button> <button type="button" data-mv="1" title="Mover después"><i class="fa-solid fa-arrow-right"></i></button></span>
          <span><button type="button" data-cover title="Usar como portada"><i class="fa-solid fa-star"></i></button> <button type="button" class="del" data-del title="Eliminar"><i class="fa-solid fa-trash"></i></button></span></div>
      </div>`).join('') || '<p class="small muted">Aún no hay fotos.</p>';
      $$('.media-item').forEach(el => {
        const id = Number(el.dataset.id);
        el.querySelector('[data-del]').addEventListener('click', guard(async () => {
          if (!confirm('¿Eliminar este archivo?')) return;
          media = (await call(`/api/admin/media/${id}`, { method: 'DELETE' })).media; drawMedia();
        }));
        el.querySelector('[data-cover]').addEventListener('click', () => { media = [media.find(m => m.id === id), ...media.filter(m => m.id !== id)]; saveOrder(); });
        el.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
          const i = media.findIndex(m => m.id === id); const j = i + Number(b.dataset.mv);
          if (j < 0 || j >= media.length) return;
          [media[i], media[j]] = [media[j], media[i]]; saveOrder();
        }));
        el.addEventListener('dragstart', e => { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', String(id)); });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drop-target'); });
        el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
        el.addEventListener('drop', e => {
          e.preventDefault(); e.stopPropagation(); el.classList.remove('drop-target');
          const from = Number(e.dataTransfer.getData('text/plain')); if (!from || from === id) return;
          const item = media.find(m => m.id === from); media = media.filter(m => m.id !== from);
          media.splice(media.findIndex(m => m.id === id), 0, item); saveOrder();
        });
      });
    };
    const saveOrder = guard(async () => { drawMedia(); media = (await call(`/api/admin/houses/${h.id}/media/order`, { method: 'POST', body: { ids: media.map(m => m.id) } })).media; });
    drawMedia();

    const uploadFiles = files => {
      if (!files.length) return;
      const form = new FormData(); [...files].forEach(f => form.append('files', f));
      const prog = $('#prog'); prog.classList.remove('hidden'); prog.firstElementChild.style.width = '0%';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/houses/${h.id}/media`);
      xhr.setRequestHeader('X-Requested-With', 'fetch');
      xhr.upload.onprogress = e => { if (e.lengthComputable) prog.firstElementChild.style.width = Math.round(e.loaded / e.total * 100) + '%'; };
      xhr.onload = () => {
        prog.classList.add('hidden');
        let r = {}; try { r = JSON.parse(xhr.responseText); } catch { /* */ }
        if (xhr.status >= 400) return toast(r.error || 'Error al subir', true);
        media = r.media; drawMedia();
        toast(`${r.added} archivo(s) subido(s)`);
        if (r.errors?.length) toast(r.errors.join(' '), true);
      };
      xhr.onerror = () => { prog.classList.add('hidden'); toast('Se perdió la conexión al subir', true); };
      xhr.send(form);
      toast('Subiendo… las fotos se optimizan automáticamente');
    };
    $('#files').addEventListener('change', e => { uploadFiles(e.target.files); e.target.value = ''; });
    const drop = $('#drop');
    drop.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); drop.classList.add('over'); } });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); drop.classList.remove('over'); uploadFiles(e.dataTransfer.files); });
    $('#ytAdd').addEventListener('click', guard(async e => {
      e.preventDefault();
      media = (await call(`/api/admin/houses/${h.id}/youtube`, { method: 'POST', body: { url: $('#ytUrl').value } })).media;
      $('#ytUrl').value = ''; drawMedia(); toast('Video agregado');
    }));
  }

  // ============================================================ Limpieza
  async function renderCleaning() {
    const [{ tasks, icalUrl, staff }, { houses }] = await Promise.all([call('/api/admin/cleaning'), call('/api/admin/houses')]);
    const byDate = {};
    for (const t of tasks) (byDate[t.date] ||= []).push(t);
    const today = D.today();
    view.innerHTML = `
      <div class="page-h"><h1>Limpieza</h1><div class="actions"><button class="btn btn-primary" id="newTask"><i class="fa-solid fa-plus"></i> Agregar limpieza</button></div></div>
      <div class="card card-pad" style="margin-bottom:18px">
        <p style="margin-bottom:10px">Cada salida de huéspedes (de la web, Airbnb o Booking) crea automáticamente una limpieza. Asigna a la persona encargada y márcala al terminar.</p>
        <details><summary class="small" style="cursor:pointer;font-weight:700">📱 Calendario de limpiezas para el celular de la persona encargada</summary>
          <p class="small muted" style="margin:10px 0">Copia este enlace y agrégalo en Google Calendar (Otros calendarios → Desde URL) o en el iPhone (Ajustes → Calendario → Cuentas → Agregar calendario suscrito). No muestra datos de los huéspedes.</p>
          ${copyField('cUrl', icalUrl)}</details>
      </div>
      <datalist id="staffList">${staff.split('\n').filter(Boolean).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
      ${Object.keys(byDate).length ? Object.entries(byDate).map(([date, list]) => `<div class="clean-day"><h3>${date === today ? 'Hoy · ' : date === D.add(today, 1) ? 'Mañana · ' : ''}${cap(D.long(date))}</h3>
        ${list.map(t => `<div class="clean-task ${t.status === 'hecha' ? 'done' : ''}" data-id="${t.id}">
          <div><b>${esc(t.house_name)}</b> ${t.same_day_turnover ? '<span class="pill danger">Llegan el mismo día</span>' : ''} ${t.status === 'hecha' ? '<span class="pill">Hecha</span>' : ''}
            <div class="small muted">Salen ${esc(t.checkout_time)} · ${t.next_arrival ? `Próxima llegada: ${t.next_arrival === t.date ? 'hoy' : D.medium(t.next_arrival)} desde ${esc(t.checkin_time)}` : 'Sin próxima llegada'} · ${esc(t.origin)}</div>
            ${t.notes ? `<div class="small" style="margin-top:4px"><i class="fa-regular fa-note-sticky"></i> ${esc(t.notes)}</div>` : ''}</div>
          <div class="who"><input class="input" list="staffList" placeholder="¿Quién limpia?" value="${esc(t.assignee)}" data-assign>
            ${t.status === 'hecha' ? '<button class="btn btn-ghost btn-sm" data-undo>Reabrir</button>' : '<button class="btn btn-primary btn-sm" data-done><i class="fa-solid fa-check"></i> Hecha</button>'}
            ${t.source_key ? '' : '<button class="icon-btn" data-cancel title="Eliminar"><i class="fa-solid fa-trash"></i></button>'}</div>
        </div>`).join('')}</div>`).join('') : '<p class="muted">No hay limpiezas en las próximas semanas.</p>'}`;
    copyBtn(view);
    $$('.clean-task').forEach(el => {
      const id = el.dataset.id;
      const upd = body => call(`/api/admin/cleaning/${id}`, { method: 'PUT', body });
      el.querySelector('[data-assign]').addEventListener('change', guard(async e => { await upd({ assignee: e.target.value }); toast('Encargado guardado'); }));
      el.querySelector('[data-done]')?.addEventListener('click', guard(async () => { await upd({ status: 'hecha', assignee: el.querySelector('[data-assign]').value }); renderCleaning(); }));
      el.querySelector('[data-undo]')?.addEventListener('click', guard(async () => { await upd({ status: 'pendiente' }); renderCleaning(); }));
      el.querySelector('[data-cancel]')?.addEventListener('click', guard(async () => { await upd({ status: 'cancelada' }); renderCleaning(); }));
    });
    $('#newTask').addEventListener('click', () => {
      const m = modal({ title: 'Agregar limpieza', body: `<div class="field"><label>Casa</label><select id="tH">${houses.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>
        <div class="grid-2"><div class="field"><label>Fecha</label><input type="date" id="tD" value="${today}"></div><div class="field"><label>Encargado</label><input id="tA" list="staffList"></div></div>
        <div class="field"><label>Notas</label><input id="tN" maxlength="500" placeholder="Limpieza profunda, lavar piscina…"></div>`,
        footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="tSave">Agregar</button>' });
      $('#tSave', m.el).addEventListener('click', guard(async () => {
        await call('/api/admin/cleaning', { method: 'POST', body: { house_id: Number($('#tH', m.el).value), date: $('#tD', m.el).value, assignee: $('#tA', m.el).value, notes: $('#tN', m.el).value } });
        m.close(); renderCleaning();
      }));
    });
  }

  // ============================================================ Sincronización
  async function renderSync() {
    const { houses } = await call('/api/admin/houses');
    view.innerHTML = `
      <div class="page-h"><h1>Airbnb / Booking</h1><div class="actions"><button class="btn btn-primary" id="syncAll"><i class="fa-solid fa-arrows-rotate"></i> Sincronizar ahora</button></div></div>
      <div class="card card-pad" style="margin-bottom:18px">
        <h2><i class="fa-solid fa-circle-info"></i> ¿Cómo funciona?</h2>
        <p class="small" style="color:var(--ink-2)">Usamos calendarios <b>iCal</b>, el estándar que aceptan Airbnb, Booking.com, VRBO y Google. Se conectan en <b>dos direcciones</b>:</p>
        <ul class="steps">
          <li><span><b>Airbnb → esta web:</b> copias el enlace de exportación de Airbnb y lo pegas aquí. Esta web lo lee cada ${me.syncMinutes || 15} minutos y justo antes de cobrar a un huésped, y bloquea esas fechas.</span></li>
          <li><span><b>Esta web → Airbnb:</b> copias el enlace de esta casa y lo pegas en Airbnb como "Importar calendario". Así las reservas de la web y tus bloqueos aparecen ocupados en Airbnb.</span></li>
        </ul>
        <div class="alert alert-warn" style="margin-top:12px"><i class="fa-solid fa-triangle-exclamation"></i><span>Airbnb lee los calendarios importados cada 2–3 horas aprox. (no lo controlamos nosotros). Si alguien reserva aquí y otra persona reserva en Airbnb dentro de ese lapso, el sistema lo detecta, marca la reserva como <b>conflicto</b> y te avisa por correo. Para reducir el riesgo, en Airbnb puedes activar "Sincronizar calendario" manualmente después de cada reserva web.</span></div>
      </div>
      ${houses.map(h => `<div class="form-section">
        <h2>${esc(h.name)}</h2>
        <p class="muted">Paso 1 — Pega este enlace en cada plataforma (Airbnb: Calendario → Disponibilidad → Conectar calendarios → Importar calendario; Booking: Tarifas y disponibilidad → Sincronizar calendarios).</p>
        ${h.feeds.length ? h.feeds.map(fd => `<div class="field"><label>Enlace para pegar en <b>${esc(fd.name)}</b></label>${copyField('ex' + fd.id, fd.export_url)}</div>`).join('') : ''}
        <div class="field"><label>${h.feeds.length ? 'Enlace general (para otras plataformas o Google Calendar)' : 'Enlace de esta casa'}</label>${copyField('exh' + h.id, h.ical_export_url)}</div>
        <p class="muted" style="margin-top:16px">Paso 2 — Calendarios que esta web lee (Airbnb: Calendario → Disponibilidad → Conectar calendarios → Exportar calendario → copia el enlace).</p>
        ${h.feeds.length ? `<div class="table-wrap" style="margin-bottom:12px"><table class="t"><thead><tr><th>Plataforma</th><th>Estado</th><th>Última lectura</th><th>Eventos</th><th></th></tr></thead><tbody>
          ${h.feeds.map(fd => `<tr><td><b>${esc(fd.name)}</b><div class="small muted" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(fd.url)}</div></td>
            <td>${fd.last_status === 'ok' ? '<span class="pill">OK</span>' : fd.last_status === 'error' ? `<span class="pill danger" title="${esc(fd.last_error)}">Error</span><div class="small" style="color:var(--danger)">${esc(fd.last_error)}</div>` : '<span class="pill gray">Pendiente</span>'}</td>
            <td class="small">${fd.last_sync_at ? esc(fd.last_sync_at) + ' UTC' : '—'}</td><td>${fd.event_count}</td>
            <td><button class="icon-btn" data-fdel="${fd.id}" title="Desconectar"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
        </tbody></table></div>` : ''}
        <div class="grid-3" style="grid-template-columns:180px 1fr auto;align-items:end">
          <div class="field"><label>Plataforma</label><select id="fn${h.id}"><option>Airbnb</option><option>Booking</option><option>VRBO</option><option>Otra</option></select></div>
          <div class="field"><label>Enlace .ics de la plataforma</label><input id="fu${h.id}" placeholder="https://www.airbnb.com.co/calendar/ical/….ics?s=…"></div>
          <div class="field"><button class="btn btn-primary" data-fadd="${h.id}"><i class="fa-solid fa-link"></i> Conectar</button></div>
        </div>
      </div>`).join('')}`;
    copyBtn(view);
    $('#syncAll').addEventListener('click', guard(async e => {
      e.currentTarget.disabled = true;
      const r = await call('/api/admin/sync', { method: 'POST' });
      const bad = r.results.filter(x => !x.ok).length;
      toast(bad ? `${bad} calendario(s) con error` : `Sincronizado (${r.results.length} calendarios)`, !!bad);
      renderSync();
    }));
    $$('[data-fadd]').forEach(b => b.addEventListener('click', guard(async () => {
      const id = b.dataset.fadd;
      b.disabled = true;
      try {
        const r = await call('/api/admin/feeds', { method: 'POST', body: { house_id: Number(id), name: $('#fn' + id).value, url: $('#fu' + id).value.trim() } });
        toast(r.result.ok ? `Conectado: ${r.result.count} eventos leídos` : `Guardado, pero no se pudo leer: ${r.result.error}`, !r.result.ok);
        renderSync();
      } finally { b.disabled = false; }
    })));
    $$('[data-fdel]').forEach(b => b.addEventListener('click', guard(async () => {
      if (!confirm('¿Desconectar este calendario? Sus fechas dejarán de bloquearse aquí.')) return;
      await call(`/api/admin/feeds/${b.dataset.fdel}`, { method: 'DELETE' }); renderSync();
    })));
  }

  // ============================================================ Reseñas
  async function renderReviews() {
    const { reviews } = await call('/api/admin/reviews');
    view.innerHTML = `<div class="page-h"><h1>Reseñas</h1></div>
      <p class="muted" style="margin-bottom:16px">El día de salida, el huésped recibe un correo con un enlace único para calificar su estadía. Puedes responder públicamente u ocultar una reseña inapropiada.</p>
      <div class="stack">${reviews.length ? reviews.map(r => `<div class="card card-pad" data-id="${r.id}">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>${esc(r.author)}</b> · ${esc(r.house_name)} <span class="small muted">· ${esc(r.code || '')} · ${esc(r.created_at.slice(0, 10))}</span></div>
          <span><span style="color:var(--accent)">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span> ${r.visible ? '' : '<span class="pill gray">Oculta</span>'}</span></div>
        <p style="margin:8px 0">${esc(r.comment)}</p>
        <div class="field"><label>Tu respuesta pública</label><textarea data-reply maxlength="2000" rows="2">${esc(r.host_reply)}</textarea></div>
        <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" data-save>Guardar respuesta</button><button class="btn btn-ghost btn-sm" data-toggle>${r.visible ? 'Ocultar' : 'Mostrar'}</button></div>
      </div>`).join('') : '<p class="muted">Aún no hay reseñas.</p>'}</div>`;
    $$('[data-id]').forEach(el => {
      const id = el.dataset.id; const r = reviews.find(x => String(x.id) === id);
      el.querySelector('[data-save]').addEventListener('click', guard(async () => { await call(`/api/admin/reviews/${id}`, { method: 'PUT', body: { host_reply: el.querySelector('[data-reply]').value } }); toast('Respuesta guardada'); }));
      el.querySelector('[data-toggle]').addEventListener('click', guard(async () => { await call(`/api/admin/reviews/${id}`, { method: 'PUT', body: { visible: !r.visible } }); renderReviews(); }));
    });
  }

  // ============================================================ Ajustes
  async function renderSettings() {
    const [{ settings: s, system }, em] = await Promise.all([call('/api/admin/settings'), call('/api/admin/email')]);
    const f = (k, label, ph = '') => `<div class="field"><label>${label}</label><input id="s_${k}" value="${esc(s[k])}" placeholder="${esc(ph)}"></div>`;
    view.innerHTML = `<div class="page-h"><h1>Ajustes</h1></div>
      <div class="form-section"><h2>Pagos y sistema</h2>
        <dl class="kv" style="max-width:640px">
          <dt>Pasarela</dt><dd>${system.paymentsMode === 'demo' ? '<span class="pill warn">MODO DEMO (sin dinero real)</span>' : `<span class="pill">Wompi · ${esc(system.wompiEnv)}</span>`}</dd>
          <dt>URL de eventos para Wompi</dt><dd class="small">${esc(system.webhookUrl)}</dd>
          <dt>Correos automáticos</dt><dd>${system.smtp ? '<span class="pill">Activos</span>' : '<span class="pill warn">Sin configurar</span>'}</dd>
          <dt>Sincronización iCal</dt><dd>cada ${system.syncMinutes} min</dd>
        </dl>
        <p class="small muted" style="margin-top:12px">Las llaves de Wompi y el correo se configuran en las variables de entorno del servidor (ver GUIA.md), no aquí, para que nunca queden expuestas.</p>
      </div>
      <form class="form-section" id="ef"><h2><i class="fa-solid fa-envelope"></i> Correo</h2>
        <p class="muted">Desde este correo salen las confirmaciones a los huéspedes y los pedidos de reseña. Puedes cambiarlo cuando quieras.</p>
        <div style="margin-bottom:14px">${em.active === 'panel' ? `<span class="pill"><i class="fa-solid fa-circle-check"></i> Enviando desde ${esc(em.activeUser)}</span>` : em.active === 'env' ? `<span class="pill info">Usando la configuración del servidor (${esc(em.activeUser)})</span>` : '<span class="pill warn">Aún no envía correos: falta la contraseña de aplicación</span>'}</div>
        <div class="grid-2">
          <div class="field"><label for="eUser">Correo que envía (Gmail)</label><input id="eUser" type="email" value="${esc(em.user)}" placeholder="tucorreo@gmail.com"></div>
          <div class="field"><label for="ePass">Contraseña de aplicación de Google</label><input id="ePass" type="password" autocomplete="new-password" placeholder="${em.hasPassword ? '•••• guardada (escribe otra para cambiarla)' : 'abcd efgh ijkl mnop'}"><span class="hint">No es tu contraseña normal de Gmail. Se guarda cifrada.</span></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="eName">Nombre que ven los huéspedes</label><input id="eName" value="${esc(em.fromName)}" maxlength="80"></div>
          <div class="field"><label for="eNotify">Correo que recibe los avisos de reservas</label><input id="eNotify" type="email" value="${esc(em.notifyEmail)}"><span class="hint">Puede ser el mismo u otro (p. ej. el de tu socio).</span></div>
        </div>
        <details style="margin-bottom:14px"><summary class="small" style="cursor:pointer;font-weight:700">¿Cómo saco la contraseña de aplicación de Gmail?</summary>
          <ol class="small" style="margin:10px 0 0 18px;color:var(--ink-2);display:grid;gap:4px">
            <li>Entra a <b>myaccount.google.com</b> con ese Gmail → <b>Seguridad</b>.</li>
            <li>Activa la <b>Verificación en dos pasos</b> (es obligatoria para esto).</li>
            <li>Busca <b>"Contraseñas de aplicaciones"</b> (o ve a myaccount.google.com/apppasswords).</li>
            <li>Escribe un nombre, por ejemplo "Casas Campestres", y pulsa <b>Crear</b>.</li>
            <li>Google muestra 16 letras: cópialas aquí y guarda. Si cambias la contraseña de tu Gmail, tendrás que crear otra.</li>
          </ol></details>
        <details style="margin-bottom:14px"><summary class="small" style="cursor:pointer;font-weight:700">Otro proveedor (Outlook, Zoho, Brevo…)</summary>
          <div class="grid-2" style="margin-top:10px"><div class="field"><label for="eHost">Servidor SMTP</label><input id="eHost" value="${esc(em.host)}"></div><div class="field"><label for="ePort">Puerto</label><input id="ePort" type="number" value="${em.port}"></div></div></details>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary">Guardar correo</button><button type="button" class="btn btn-ghost" id="eTest"><i class="fa-solid fa-paper-plane"></i> Enviar correo de prueba</button></div>
      </form>
      <form class="form-section" id="sf"><h2>Contacto y textos del sitio</h2>
        <div class="grid-2">${f('contact_phone', 'Teléfono')}${f('contact_email', 'Correo de contacto (se muestra en la web)')}</div>
        <div class="grid-3">${f('instagram', 'Instagram (URL)', 'https://instagram.com/…')}${f('facebook', 'Facebook (URL)')}${f('tiktok', 'TikTok (URL)')}</div>
        ${f('address', 'Dirección / zona')}
        <div class="field"><label>Texto "sobre nosotros" (pie de página)</label><textarea id="s_about" rows="2">${esc(s.about)}</textarea></div>
        <div class="field"><label>Términos y política de cancelación</label><textarea id="s_terms" rows="12">${esc(s.terms)}</textarea><span class="hint">El huésped debe aceptarlos antes de pagar. Revísalos con tu abogado o contador.</span></div>
        <button class="btn btn-primary">Guardar</button>
      </form>
      <form class="form-section" id="pf"><h2>Cambiar contraseña</h2>
        <div class="grid-3"><div class="field"><label>Contraseña actual</label><input type="password" id="pc" autocomplete="current-password"></div>
        <div class="field"><label>Nueva (mín. 10 caracteres)</label><input type="password" id="pn" autocomplete="new-password" minlength="10"></div>
        <div class="field"><label>Repite la nueva</label><input type="password" id="pn2" autocomplete="new-password"></div></div>
        <button class="btn btn-primary">Cambiar contraseña</button>
      </form>`;
    $('#ef').addEventListener('submit', guard(async e => {
      e.preventDefault();
      await call('/api/admin/email', { method: 'PUT', body: { user: $('#eUser').value.trim(), password: $('#ePass').value, fromName: $('#eName').value, notifyEmail: $('#eNotify').value.trim(), host: $('#eHost').value.trim(), port: $('#ePort').value } });
      toast('Correo guardado'); renderSettings();
    }));
    $('#eTest').addEventListener('click', guard(async e => {
      const btn = e.currentTarget; btn.disabled = true;
      try { const r = await call('/api/admin/email/test', { method: 'POST' }); toast(`Correo de prueba enviado a ${r.to}. Revisa tu bandeja (y Spam).`); }
      finally { btn.disabled = false; }
    }));
    $('#sf').addEventListener('submit', guard(async e => {
      e.preventDefault();
      const body = {}; for (const k of Object.keys(s)) body[k] = $('#s_' + k).value;
      await call('/api/admin/settings', { method: 'PUT', body }); toast('Ajustes guardados');
    }));
    $('#pf').addEventListener('submit', guard(async e => {
      e.preventDefault();
      if ($('#pn').value !== $('#pn2').value) return toast('Las contraseñas nuevas no coinciden', true);
      await call('/api/admin/password', { method: 'POST', body: { current: $('#pc').value, next: $('#pn').value } });
      alert('Contraseña cambiada. Inicia sesión de nuevo.'); location.href = '/admin/login.html';
    }));
  }

  // ============================================================ Inicio
  $('#logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); location.href = '/admin/login.html'; });
  (async () => {
    try {
      me = await call('/api/admin/me');
      const st = await call('/api/admin/settings');
      me.syncMinutes = st.system.syncMinutes;
      $('#whoami').textContent = me.username;
      route();
    } catch { /* redirigido al login */ }
  })();
})();
