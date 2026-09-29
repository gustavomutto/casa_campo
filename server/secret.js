'use strict';
// Cifrado de datos sensibles guardados en la base (p. ej. la contraseña de aplicación del correo).
// La llave viene de SECRET_KEY o, si no existe, se genera una vez en DATA_DIR/.secret-key.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

let key = null;
function getKey() {
  if (key) return key;
  if (process.env.SECRET_KEY) {
    key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();
  } else {
    const file = path.join(config.dataDir, '.secret-key');
    if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
    key = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  }
  return key;
}

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

function decrypt(blob) {
  if (!blob) return '';
  try {
    const [v, iv, tag, data] = blob.split(':');
    if (v !== 'v1') return '';
    const d = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch { return ''; }
}

module.exports = { encrypt, decrypt };
