// One-off generator: writes 16/48/128 PNG icons (orange gradient rounded
// square with a white "F") matching the popup header logo. Zero-dep PNG
// encoder via zlib. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 5x7 pixel "F" glyph, scaled to fit each icon size.
const GLYPH = [
  '11110',
  '10000',
  '10000',
  '11110',
  '10000',
  '10000',
  '10000',
];

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.18);
  const margin = Math.round(size * 0.08);
  const cellCount = Math.max(GLYPH.length, GLYPH[0].length);
  const cell = (size - 2 * margin) / cellCount;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded-square mask
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
      const inside = dx * dx + dy * dy <= radius * radius;

      // Diagonal gradient #e67e22 -> #f39c12
      const t = (x / size + y / size) / 2;
      let r = Math.round(0xe6 + (0xf3 - 0xe6) * t);
      let g = Math.round(0x7e + (0x9c - 0x7e) * t);
      let b = Math.round(0x22 + (0x12 - 0x22) * t);

      // Glyph pixels in white
      const gx = Math.floor((x - margin) / cell);
      const gy = Math.floor((y - margin) / cell);
      if (
        inside &&
        gy >= 0 &&
        gy < GLYPH.length &&
        gx >= 0 &&
        gx < GLYPH[0].length &&
        GLYPH[gy][gx] === '1'
      ) {
        r = g = b = 255;
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = inside ? 255 : 0;
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
for (const size of [16, 48, 128]) {
  writeFileSync(new URL(`../icons/icon${size}.png`, import.meta.url), renderIcon(size));
  console.log(`icon${size}.png written`);
}
