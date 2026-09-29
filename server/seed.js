'use strict';
const fs = require('fs');
const path = require('path');
const { db, getSetting, setSetting } = require('./db');
const { randomToken } = require('./util');
const { importLocalImage } = require('./media');

const DEFAULT_TERMS = `POLÍTICA DE RESERVA Y CANCELACIÓN (edítala en el panel → Ajustes)

1. La reserva queda confirmada únicamente cuando el pago es aprobado por la pasarela de pagos (Wompi).
2. Cancelación con 15 días o más de anticipación a la llegada: reembolso del 100% del valor pagado.
3. Cancelación entre 14 y 7 días antes: reembolso del 50%.
4. Cancelación con menos de 7 días: no hay reembolso.
5. Horario de llegada y salida según lo indicado en cada casa.
6. El número de huéspedes no puede superar la capacidad indicada.
7. El huésped responde por daños ocasionados a la propiedad durante su estadía.
8. Tratamiento de datos: los datos personales se usan solo para gestionar la reserva, conforme a la Ley 1581 de 2012.`;

async function seed() {
  if (!getSetting('initialized')) {
    setSetting('contact_phone', '+57 300 380 6930');
    setSetting('contact_email', 'mutto546@gmail.com');
    setSetting('notify_email', 'mutto546@gmail.com');
    setSetting('smtp_host', 'smtp.gmail.com');
    setSetting('smtp_port', '587');
    setSetting('smtp_user', 'mutto546@gmail.com');
    setSetting('mail_from_name', 'Casas Campestres');
    setSetting('instagram', 'https://www.instagram.com/casa_lospinos1/');
    setSetting('address', 'Pueblo Bello, Cesar, Colombia');
    setSetting('about', 'Casas campestres para descansar en familia y con amigos, rodeados de naturaleza. Reservas y pagos 100% en línea y seguros.');
    setSetting('terms', DEFAULT_TERMS);
    setSetting('initialized', '1');
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM houses').get().n;
  if (count > 0) return;

  const seedDir = path.join(__dirname, '..', 'seed');
  const houses = [
    {
      slug: 'casa-pueblo-bello', name: 'Casa en Pueblo Bello', location: 'Pueblo Bello, Cesar', badge: 'Destacado',
      short_desc: 'Hermosa vista a la montaña, jacuzzi privado y zona de asados.',
      description: 'Escápate a la tranquilidad de Pueblo Bello, un lugar mágico rodeado de naturaleza. Esta hermosa casa ofrece todas las comodidades para una estancia inolvidable.\n\nDisfruta de las impresionantes vistas a la montaña desde la terraza, relájate en el jacuzzi privado y comparte momentos especiales en la zona de asados.',
      house_rules: 'No se permiten fiestas ni eventos sin autorización.\nHorario de silencio: 10:00 p. m. a 7:00 a. m.\nNo fumar dentro de la casa.',
      price_night: 300000, max_guests: 6, bedrooms: 3, beds: 4, bathrooms: 2,
      amenities: ['jacuzzi', 'asador', 'wifi', 'terraza', 'parqueadero', 'tv', 'cocina', 'ropa_cama', 'jardin'],
      images: ['casa1.png', 'casa2.png', 'casa3.png', 'casa4.png', 'casa5.png'],
    },
    {
      slug: 'casa-campo-lety', name: 'Casa campo Lety es Lety', location: 'Cesar, Colombia', badge: 'Recomendado',
      short_desc: 'Amplia finca ideal para familias, con piscina y zonas verdes.',
      description: 'Amplia finca ideal para familias y grupos, con piscina, jardín y zonas verdes para compartir.\n\n(Edita esta descripción desde el panel de administración.)',
      house_rules: 'No se permiten fiestas ni eventos sin autorización.\nUso de la piscina bajo responsabilidad de los adultos.',
      price_night: 450000, max_guests: 10, bedrooms: 5, beds: 7, bathrooms: 3,
      amenities: ['piscina', 'jardin', 'asador', 'wifi', 'parqueadero', 'cocina', 'ropa_cama'],
      images: ['casa8.png', 'casa6.png', 'casa7.png'],
    },
  ];

  let pos = 0;
  for (const h of houses) {
    const info = db.prepare(`INSERT INTO houses(slug, name, location, short_desc, description, house_rules, price_night, max_guests, bedrooms, beds, bathrooms,
      amenities, badge, position, ical_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(h.slug, h.name, h.location, h.short_desc, h.description, h.house_rules,
      h.price_night, h.max_guests, h.bedrooms, h.beds, h.bathrooms, JSON.stringify(h.amenities), h.badge, pos++, randomToken(24));
    let i = 0;
    for (const img of h.images) {
      const src = path.join(seedDir, img);
      if (!fs.existsSync(src)) continue;
      const m = await importLocalImage(src);
      db.prepare('INSERT INTO media(house_id, kind, file, thumb, width, height, position) VALUES(?,?,?,?,?,?,?)')
        .run(info.lastInsertRowid, 'image', m.file, m.thumb, m.width, m.height, i++);
    }
  }
  console.log('[seed] Se crearon las 2 casas iniciales con sus fotos.');
}

module.exports = { seed };
