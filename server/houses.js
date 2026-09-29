'use strict';
const { db } = require('./db');
const AMENITIES = require('./amenities');
const { approxEmbed } = require('./location');

function mediaFor(houseId) {
  return db.prepare('SELECT id, kind, file, thumb, url, caption, width, height, position FROM media WHERE house_id = ? ORDER BY position, id').all(houseId)
    .map(m => ({
      id: m.id, kind: m.kind, caption: m.caption, width: m.width, height: m.height,
      src: m.kind === 'youtube' ? `https://www.youtube-nocookie.com/embed/${m.url}` : `/uploads/${m.file}`,
      thumb: m.kind === 'image' ? `/uploads/${m.thumb}` : (m.kind === 'youtube' ? `https://i.ytimg.com/vi/${m.url}/hqdefault.jpg` : null),
      youtubeId: m.kind === 'youtube' ? m.url : undefined,
    }));
}

function ratingFor(houseId) {
  const r = db.prepare('SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE house_id = ? AND visible = 1').get(houseId);
  return { count: r.n, average: r.n ? Math.round(r.avg * 10) / 10 : null };
}

function publicHouse(h, { full = false } = {}) {
  const media = mediaFor(h.id);
  const amenities = JSON.parse(h.amenities || '[]').filter(k => AMENITIES[k]).map(k => ({ key: k, label: AMENITIES[k][0], icon: AMENITIES[k][1] }));
  const cover = media.find(m => m.kind === 'image');
  const base = {
    slug: h.slug, name: h.name, location: h.location, shortDesc: h.short_desc, badge: h.badge,
    priceNight: h.price_night, priceWeekend: h.price_weekend, maxGuests: h.max_guests,
    bedrooms: h.bedrooms, beds: h.beds, bathrooms: h.bathrooms,
    cover: cover ? cover.thumb : null, coverFull: cover ? cover.src : null,
    rating: ratingFor(h.id), amenities: amenities.slice(0, full ? 99 : 4),
  };
  if (!full) return { ...base, photos: media.filter(m => m.kind === 'image').slice(0, 5).map(m => m.thumb) };
  return {
    ...base,
    description: h.description, houseRules: h.house_rules, cleaningFee: h.cleaning_fee,
    minNights: h.min_nights, checkinTime: h.checkin_time, checkoutTime: h.checkout_time,
    depositPercent: h.deposit_percent, media,
    // Solo la zona aproximada: la ubicación exacta se entrega al huésped cuando su reserva está confirmada
    approxMap: h.latitude != null ? approxEmbed(h.latitude, h.longitude) : null,
    tourUrl: h.tour_url || null,
    reviews: db.prepare(`SELECT author, rating, comment, host_reply, created_at FROM reviews
       WHERE house_id = ? AND visible = 1 ORDER BY created_at DESC LIMIT 50`).all(h.id)
      .map(r => ({ author: r.author, rating: r.rating, comment: r.comment, hostReply: r.host_reply, date: r.created_at.slice(0, 10) })),
  };
}

module.exports = { mediaFor, ratingFor, publicHouse };
