'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const multer = require('multer');
const config = require('./config');
const { HttpError } = require('./util');

const tmpDir = path.join(config.dataDir, 'tmp'); // fuera de /uploads para que no sea público
fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 250 * 1024 * 1024, files: 20 },
});

function newName(ext) { return crypto.randomBytes(12).toString('hex') + ext; }

async function readHead(file, n = 16) {
  const fh = await fs.promises.open(file, 'r');
  try { const buf = Buffer.alloc(n); await fh.read(buf, 0, n, 0); return buf; } finally { await fh.close(); }
}

function videoExt(head) {
  if (head.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = head.slice(8, 12).toString('ascii');
    return brand.startsWith('qt') ? '.mov' : '.mp4';
  }
  if (head.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return '.webm';
  return null;
}

/**
 * Procesa un archivo subido. Las imágenes se re-codifican a WebP (se eliminan datos EXIF/GPS,
 * se reduce el peso y se neutraliza cualquier contenido malicioso). Los videos se validan por firma binaria.
 */
async function processUpload(file) {
  try {
    const head = await readHead(file.path);
    const vext = videoExt(head);
    if (vext) {
      if (file.size > 250 * 1024 * 1024) throw new HttpError(400, 'El video supera 250 MB.');
      const name = newName(vext);
      await fs.promises.rename(file.path, path.join(config.uploadsDir, name));
      return { kind: 'video', file: name };
    }
    if (file.size > 30 * 1024 * 1024) throw new HttpError(400, 'La imagen supera 30 MB.');
    let img;
    try { img = sharp(file.path, { failOn: 'error' }).rotate(); await img.metadata(); }
    catch { throw new HttpError(400, `"${file.originalname}" no es una imagen o video válido (usa JPG, PNG, WEBP, HEIC, MP4 o MOV).`); }
    const name = newName('.webp');
    const thumb = newName('.webp');
    const full = await sharp(file.path).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toFile(path.join(config.uploadsDir, name));
    await sharp(file.path).rotate().resize({ width: 720, height: 540, fit: 'cover' }).webp({ quality: 76 })
      .toFile(path.join(config.uploadsDir, thumb));
    return { kind: 'image', file: name, thumb, width: full.width, height: full.height };
  } finally {
    fs.promises.unlink(file.path).catch(() => {});
  }
}

async function importLocalImage(srcPath) {
  const name = newName('.webp'); const thumb = newName('.webp');
  const full = await sharp(srcPath).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(path.join(config.uploadsDir, name));
  await sharp(srcPath).rotate().resize({ width: 720, height: 540, fit: 'cover' }).webp({ quality: 76 }).toFile(path.join(config.uploadsDir, thumb));
  return { kind: 'image', file: name, thumb, width: full.width, height: full.height };
}

function removeFiles(m) {
  for (const f of [m.file, m.thumb]) {
    if (f && /^[a-f0-9]{24}\.\w+$/.test(f)) fs.promises.unlink(path.join(config.uploadsDir, f)).catch(() => {});
  }
}

function youtubeId(url) {
  const s = String(url || '').trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  throw new HttpError(400, 'Enlace de YouTube no válido.');
}

module.exports = { upload, processUpload, importLocalImage, removeFiles, youtubeId };
