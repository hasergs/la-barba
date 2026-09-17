/**
 * Generador de iconos PWA sin dependencias externas.
 *
 * Codifica PNG (RGBA, 8 bits) a mano y dibuja un motivo de marca con
 * supersampling 2x para bordes suaves.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [11, 11, 15, 255];
const GOLD = [242, 181, 68, 255];
const ACCENT = [56, 224, 176, 255];

/** CRC32 (tabla) para los chunks PNG. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** ¿El punto está dentro del motivo de barba? */
function inBeard(x, y, s) {
  const cx = 0.5 * s;
  const top = 0.46 * s;
  const bottom = 0.9 * s;
  if (y < top || y > bottom) return false;
  const t = (y - top) / (bottom - top);
  const halfWidth = (0.21 * s) * Math.pow(1 - t, 0.8);
  const dx = Math.abs(x - cx);
  if (dx > halfWidth) return false;
  // Recorte del bigote: hueco elíptico bajo la nariz.
  const mx = (x - cx) / (0.15 * s);
  const my = (y - 0.55 * s) / (0.075 * s);
  if (mx * mx + my * my < 1) return false;
  return true;
}

/** ¿El punto está en el aro del rostro? */
function inRing(x, y, s) {
  const cx = 0.5 * s;
  const cy = 0.39 * s;
  const r = 0.235 * s;
  const thickness = 0.032 * s;
  const d = Math.hypot(x - cx, y - cy);
  return Math.abs(d - r) < thickness;
}

function renderColor(x, y, s) {
  if (inBeard(x, y, s)) return GOLD;
  if (inRing(x, y, s)) return GOLD;
  // Punto de acento (brillo) arriba a la derecha del aro.
  const ax = x - 0.69 * s;
  const ay = y - 0.205 * s;
  if (ax * ax + ay * ay < Math.pow(0.028 * s, 2)) return ACCENT;
  return BG;
}

function render(size, supersample = 2) {
  const big = size * supersample;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const color = renderColor(
            (x + (sx + 0.5) / supersample) * supersample,
            (y + (sy + 0.5) / supersample) * supersample,
            big,
          );
          r += color[0];
          g += color[1];
          b += color[2];
          a += color[3];
        }
      }
      const n = supersample * supersample;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, out);
}

const targets = [
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/apple-touch-icon.png', 180],
];

mkdirSync(resolve(ROOT, 'public'), { recursive: true });
for (const [relPath, size] of targets) {
  const file = resolve(ROOT, relPath);
  writeFileSync(file, render(size));
  console.log(`generado ${relPath} (${size}x${size})`);
}
