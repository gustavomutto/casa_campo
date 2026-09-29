'use strict';
// Crea un administrador o cambia su contraseña.
// Uso: npm run crear-admin -- <usuario> <contraseña>
const bcrypt = require('bcryptjs');
const { db } = require('../server/db');

const [user, pass] = process.argv.slice(2);
if (!user || !pass) {
  console.log('Uso: npm run crear-admin -- <usuario> <contraseña>');
  process.exit(1);
}
if (pass.length < 10) {
  console.log('La contraseña debe tener al menos 10 caracteres.');
  process.exit(1);
}
const hash = bcrypt.hashSync(pass, 12);
const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(user);
if (existing) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(existing.id);
  console.log(`Contraseña de "${user}" actualizada.`);
} else {
  db.prepare('INSERT INTO admins(username, password_hash) VALUES(?, ?)').run(user, hash);
  console.log(`Administrador "${user}" creado.`);
}
