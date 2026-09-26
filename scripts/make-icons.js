#!/usr/bin/env node
/**
 * Renders the marketplace PNG icons from code, because this machine has no
 * SVG rasterizer (no ImageMagick / rsvg / inkscape). Run `npm run icons`
 * after changing the design.
 *
 * Design: a bookmark on a rounded amber square — "saved for later", which is
 * exactly what a stash is. Amber matches --pstash-accent in tokens.css.
 */
const { deflateSync } = require("zlib");
const { writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");

const BG = [245, 158, 11, 255]; // #f59e0b
const FG = [26, 18, 5, 255]; // #1a1205 — same pairing as --pstash-accent-fg
const SS = 3; // supersampling factor per axis

/** Signed "insideness" of a rounded rectangle, in the 0..1 unit square. */
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r || (x >= x0 + r && x <= x1 - r) || (y >= y0 + r && y <= y1 - r);
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/** The bookmark: a rounded rect with a V notched out of its bottom edge. */
function inBookmark(x, y) {
  const x0 = 0.3, x1 = 0.7, y0 = 0.2, y1 = 0.8;
  if (!inRoundedRect(x, y, x0, y0, x1, y1, 0.045)) return false;
  return !inTriangle(x, y, x0, y1 + 0.002, x1, y1 + 0.002, (x0 + x1) / 2, y1 - 0.2);
}

function renderPng(size) {
  const px = Buffer.alloc(size * size * 4);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let bgHits = 0;
      let fgHits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (col + (sx + 0.5) / SS) / size;
          const y = (row + (sy + 0.5) / SS) / size;
          if (!inRoundedRect(x, y, 0.02, 0.02, 0.98, 0.98, 0.2)) continue;
          bgHits++;
          if (inBookmark(x, y)) fgHits++;
        }
      }

      const samples = SS * SS;
      const coverage = bgHits / samples;
      const glyph = fgHits / samples;
      const offset = (row * size + col) * 4;

      if (coverage === 0) continue;
      // Composite the glyph over the plate, then the plate over transparency.
      for (let c = 0; c < 3; c++) {
        px[offset + c] = Math.round(BG[c] * (1 - glyph) + FG[c] * glyph);
      }
      px[offset + 3] = Math.round(255 * coverage);
    }
  }

  return encodePng(px, size, size);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // Each scanline is prefixed with its filter type; 0 means "none".
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row++) {
    raw[row * (stride + 1)] = 0;
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = join(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const file = join(outDir, `icon${size}.png`);
  writeFileSync(file, renderPng(size));
  console.log(`wrote icons/icon${size}.png`);
}
