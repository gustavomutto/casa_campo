'use strict';
// Ubicación de las casas: coordenadas, enlaces de Google Maps / Waze y recorridos virtuales 360°.
const { HttpError } = require('./util');

function valid(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** Extrae coordenadas de "10.4235, -73.5791" o de un enlace largo de Google Maps. */
function parseCoords(text) {
  const s = decodeURIComponent(String(text || ''));
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,            // pin exacto dentro de la URL
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,                  // centro del mapa
    /^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*$/, // coordenadas sueltas
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && valid(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

/** Acepta coordenadas o enlaces de Google Maps (incluidos los cortos maps.app.goo.gl, que se siguen en el servidor). */
async function resolveLocation(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let c = parseCoords(s);
  if (c) return c;
  let url;
  try { url = new URL(s); } catch { throw new HttpError(400, 'Pega un enlace de Google Maps o coordenadas como: 10.4235, -73.5791'); }
  const hostOk = /(^|\.)google\.[a-z.]+$|^goo\.gl$|^maps\.app\.goo\.gl$/i.test(url.hostname);
  if (url.protocol !== 'https:' || !hostOk) throw new HttpError(400, 'El enlace debe ser de Google Maps.');
  // Enlace corto: seguimos las redirecciones (máx. 5) hasta la URL larga, que trae las coordenadas
  let current = url.toString();
  for (let i = 0; i < 5; i++) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(current, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const loc = res.headers.get('location');
      if (!loc) break;
      current = new URL(loc, current).toString();
      c = parseCoords(current);
      if (c) return c;
    } catch { break; } finally { clearTimeout(t); }
  }
  throw new HttpError(400, 'No pude leer las coordenadas de ese enlace. En Google Maps mantén presionado el punto exacto de la casa, copia los números que aparecen (ej: 10.4235, -73.5791) y pégalos aquí.');
}

function directionLinks(lat, lng) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    embed: osmEmbed(lat, lng, 0.012, true),
  };
}

function osmEmbed(lat, lng, d, marker) {
  const bbox = [lng - d * 1.6, lat - d, lng + d * 1.6, lat + d].map(n => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker ? `&marker=${lat},${lng}` : ''}`;
}

/** Zona aproximada para el público (sin revelar la casa exacta antes de reservar). */
function approxEmbed(lat, lng) {
  const r = n => Math.round(n * 50) / 50; // redondeo a ~2 km
  return osmEmbed(r(lat), r(lng), 0.03, false);
}

const TOUR_HOSTS = ['my.matterport.com', 'kuula.co', 'www.kuula.co', 'momento360.com', 'tour.panoee.com', 'www.google.com'];
function validateTourUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  let u; try { u = new URL(s); } catch { throw new HttpError(400, 'Enlace del recorrido virtual inválido.'); }
  if (u.protocol !== 'https:' || !TOUR_HOSTS.includes(u.hostname)) {
    throw new HttpError(400, 'El recorrido virtual debe ser de Matterport, Kuula, Momento360, Panoee o Google Street View (enlace para insertar).');
  }
  if (u.hostname === 'www.google.com' && !u.pathname.startsWith('/maps/embed')) throw new HttpError(400, 'De Google usa el enlace "Insertar mapa" de Street View.');
  return u.toString();
}

module.exports = { parseCoords, resolveLocation, directionLinks, approxEmbed, validateTourUrl, TOUR_HOSTS };
