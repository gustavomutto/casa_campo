/* Calendario de rango de fechas estilo Airbnb (llegada / salida) */
(function () {
  'use strict';
  const { D, esc } = window.CC;
  const DOW = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  class RangeCalendar {
    constructor(root, opts) {
      this.root = root;
      this.o = Object.assign({ months: 2, unavailable: [], occupied: [], bufferDays: 0, minNights: 1, today: D.today(), maxAdvance: 540 }, opts);
      this.unavailable = new Set(this.o.unavailable);
      this.occupied = new Set(this.o.occupied);
      this.start = this.o.start || null;
      this.end = this.o.end || null;
      const base = this.start || this.o.today;
      this.view = base.slice(0, 8) + '01';
      this.maxDate = D.add(this.o.today, this.o.maxAdvance);
      this.render();
    }

    setData({ unavailable, occupied, bufferDays, minNights }) {
      if (unavailable) this.unavailable = new Set(unavailable);
      if (occupied) this.occupied = new Set(occupied);
      if (bufferDays !== undefined) this.o.bufferDays = bufferDays;
      if (minNights !== undefined) this.o.minNights = minNights;
      this.render();
    }

    canCheckin(d) { return d >= this.o.today && d <= this.maxDate && !this.unavailable.has(d); }

    // Última fecha de salida posible desde una llegada (la primera noche ocupada)
    maxCheckout(start) {
      let d = start;
      for (let i = 0; i < 62; i++) { d = D.add(d, 1); if (this.unavailable.has(d)) return d; }
      return d;
    }

    canCheckout(d) {
      if (!this.start || d <= this.start) return false;
      if (D.diff(this.start, d) < this.o.minNights) return false;
      if (d > this.maxCheckout(this.start)) return false;
      for (let i = 0; i < this.o.bufferDays; i++) if (this.occupied.has(D.add(d, i))) return false;
      return true;
    }

    click(d) {
      if (this.o.readOnly) return;
      if (!this.start || this.end) {
        if (!this.canCheckin(d)) return;
        this.start = d; this.end = null;
      } else if (d <= this.start) {
        if (this.canCheckin(d)) this.start = d;
      } else if (this.canCheckout(d)) {
        this.end = d;
      } else if (this.canCheckin(d)) {
        this.start = d;
      }
      this.render();
      this.o.onChange && this.o.onChange(this.start, this.end);
    }

    clear() { this.start = this.end = null; this.render(); this.o.onChange && this.o.onChange(null, null); }

    month(first) {
      const d0 = D.parse(first);
      const t0 = d0.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const title = t0.charAt(0).toUpperCase() + t0.slice(1);
      const offset = (d0.getUTCDay() + 6) % 7;
      const days = D.diff(first, D.fmt(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1))));
      let cells = DOW.map(x => `<div class="dow">${x}</div>`).join('');
      for (let i = 0; i < offset; i++) cells += '<div></div>';
      const choosingOut = this.start && !this.end;
      for (let i = 0; i < days; i++) {
        const d = D.add(first, i);
        const cls = ['cal-day'];
        let disabled;
        if (this.o.readOnly) disabled = d < this.o.today || this.unavailable.has(d);
        else if (choosingOut && d > this.start) disabled = !this.canCheckout(d);
        else disabled = !this.canCheckin(d);
        if (choosingOut && d > this.start && !disabled && this.unavailable.has(d)) cls.push('checkout-only');
        if (d === this.o.today) cls.push('today');
        if (this.start && d === this.start) cls.push('start', this.end ? '' : 'only');
        if (this.end && d === this.end) cls.push('end');
        if (this.start && this.end && d > this.start && d < this.end) cls.push('in-range');
        const label = D.long(d) + (disabled ? ' (no disponible)' : '');
        cells += `<button type="button" class="${cls.join(' ')}" data-d="${d}" ${disabled ? 'disabled' : ''} aria-label="${esc(label)}">${i + 1}</button>`;
      }
      return `<div class="cal-month"><h4>${esc(title)}</h4><div class="cal-grid">${cells}</div></div>`;
    }

    render() {
      const months = [];
      let m = this.view;
      for (let i = 0; i < this.o.months; i++) {
        months.push(this.month(m));
        const d = D.parse(m); m = D.fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
      }
      const canPrev = this.view > this.o.today.slice(0, 8) + '01';
      this.root.innerHTML = `<div class="cal">
        <div class="cal-head">
          <button type="button" class="icon-btn" data-nav="-1" ${canPrev ? '' : 'disabled'} aria-label="Mes anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <span class="small muted">${this.o.readOnly ? '' : (this.start && !this.end ? 'Elige la fecha de salida' : 'Elige la fecha de llegada')}</span>
          <button type="button" class="icon-btn" data-nav="1" aria-label="Mes siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="cal-months ${this.o.months === 1 ? 'single' : ''}">${months.join('')}</div>
      </div>`;
      this.root.querySelectorAll('.cal-day:not(:disabled)').forEach(b => b.addEventListener('click', () => this.click(b.dataset.d)));
      this.root.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
        const d = D.parse(this.view);
        this.view = D.fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(b.dataset.nav), 1)));
        this.render();
      }));
    }
  }

  window.RangeCalendar = RangeCalendar;
})();
