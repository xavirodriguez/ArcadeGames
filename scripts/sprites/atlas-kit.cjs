/**
 * atlas-kit.cjs — shared scaffolding for the parametric sprite-atlas generators
 * (sea_dragon, ghost_galleon). Zero runtime dependencies (zlib + own CRC32).
 *
 * A generator script provides `paintCell(row, col, frameIndex)` on a logical
 * grid plus atlas geometry; this kit handles the pixel canvas, nearest-neighbor
 * upscale, margin audit, PNG encode and ASCII preview.
 *
 * Run from a generator: node build-<name>-atlas.cjs [--preview]
 */
"use strict";

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

// ------------------------------------------------------------------------
// Logical-grid pixel canvas (RGBA, top-left origin; painting order is
// wash -> base -> ink -> accents). setPx uses alpha-over-max blending per pixel.
// ------------------------------------------------------------------------
function makeCanvas(gridW, gridH) {
  return { w: gridW, h: gridH, px: new Uint8ClampedArray(gridW * gridH * 4) };
}

function setPx(c, x, y, color, alphaScale = 1) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= c.w || iy >= c.h) return;
  const o = (iy * c.w + ix) * 4;
  const a = color[3] * alphaScale;
  c.px[o] = color[0];
  c.px[o + 1] = color[1];
  c.px[o + 2] = color[2];
  c.px[o + 3] = Math.max(c.px[o + 3], a);
}

function alphaAt(c, x, y) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= c.w || iy >= c.h) return 0;
  return c.px[(iy * c.w + ix) * 4 + 3];
}

/** Bresenham-ish line through floating points, painting each stepped pixel. */
function drawLine(c, x0, y0, x1, y1, color, alphaScale = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    setPx(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color, alphaScale);
  }
}

/** Thick line painted as a small ellipse at each step. */
function drawThickLine(c, x0, y0, x1, y1, radius, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3 + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    fillEllipse(c, x, y, radius, radius, color, 1);
  }
}

function fillEllipse(c, cx, cy, rx, ry, color, alphaScale = 1) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / Math.max(rx, 0.35);
      const dy = (y + 0.5 - cy) / Math.max(ry, 0.35);
      if (dx * dx + dy * dy <= 1.05) setPx(c, x, y, color, alphaScale);
    }
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py) {
      const xc = (xj - xi) * (py - yi) / (yj - yi) + xi;
      if (px < xc) inside = !inside;
    }
  }
  return inside;
}

// ------------------------------------------------------------------------
// Nearest-neighbor upscale + audit
// ------------------------------------------------------------------------

/** Builds the upscaled RGBA atlas buffer from `paintCell(row, col, frameIndex)`. */
function buildAtlas({ paintCell, gridW, gridH, scale, cols, rows }) {
  const atlasW = gridW * scale * cols;
  const atlasH = gridH * scale * rows;
  const atlas = Uint8Array.from({ length: atlasW * atlasH * 4 }, () => 0);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const c = paintCell(row, col, col);
      const baseX = col * gridW, baseY = row * gridH;
      for (let y = 0; y < gridH; y++)
        for (let x = 0; x < gridW; x++) {
          const s = alphaAt(c, x, y) / 255;
          if (s === 0) continue;
          const doff = (((baseY + y) * scale) * atlasW + (baseX + x) * scale) * 4;
          const oi = (y * gridW + x) * 4;
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const o = doff + (dy * atlasW + dx) * 4;
              atlas[o] = c.px[oi];
              atlas[o + 1] = c.px[oi + 1];
              atlas[o + 2] = c.px[oi + 2];
              atlas[o + 3] = c.px[oi + 3];
            }
        }
    }
  }
  return Buffer.from(atlas);
}

/**
 * Verifies every used cell has content, unused cells are empty, and painted
 * bounding boxes respect the required margin (logical px).
 */
function auditAtlas({ paintCell, name, gridW, gridH, cols, rows, usedCount, isIntentionalBlank, margin, minPixels }) {
  const issues = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const c = paintCell(row, col, col);
      let pixelCount = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          if (alphaAt(c, x, y) > 0) {
            pixelCount++;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      const id = `${name} r${row}c${col}`;
      if (col >= usedCount(row)) {
        if (pixelCount !== 0) issues.push(`${id}: unused cell is not empty`);
        continue;
      }
      if (!isIntentionalBlank(row, col) && pixelCount < minPixels) {
        issues.push(`${id}: barely ${pixelCount} px painted (would look empty)`);
      }
      if (minX < margin || minY < margin || maxX >= gridW - margin || maxY >= gridH - margin) {
        issues.push(`${id}: bbox [${minX},${minY}..${maxX},${maxY}] violates ${margin}px margin`);
        if (process.env.DEBUG_EXCESS) {
          for (let y = 0; y < gridH; y++)
            for (let x = 0; x < gridW; x++) {
              if (alphaAt(c, x, y) > 0 && (x < margin || y < margin || x >= gridW - margin || y >= gridH - margin)) {
                console.error(`   ${id} offending pixel (${x},${y})`);
              }
            }
        }
      }
    }
  }
  if (issues.length) {
    console.error(`AUDIT FAIL (${name})`);
    for (const i of issues) console.error(" - " + i);
    process.exit(1);
  }
  console.log(`Audit OK (${name}): margins kept (>=${margin} logical px), all cells have content or are intentional blanks.`);
}

// ------------------------------------------------------------------------
// ASCII preview (palette probe is approximate; used only for eyeballing)
// ------------------------------------------------------------------------
function asciiFrame(c) {
  const rows = [];
  for (let y = 0; y < c.h; y++) {
    let line = "";
    for (let x = 0; x < c.w; x++) {
      const i = (y * c.w + x) * 4;
      const a = c.px[i + 3];
      if (a === 0) { line += "  "; continue; }
      const r = c.px[i], g = c.px[i + 1], b = c.px[i + 2];
      let ch;
      if (Math.abs(r - 43) < 60 && Math.abs(g - 33) < 40) ch = a > 220 ? "@@" : "~~";
      else if (Math.abs(r - 181) < 30 && Math.abs(g - 51) < 30) ch = a < 200 ? "rr" : "RR";
      else if (Math.abs(g - 127) < 40 && Math.abs(b - 122) < 40) ch = a < 200 ? "tt" : "TT";
      else if (Math.abs(r - 201) < 40 && Math.abs(b - 39) < 60) ch = "GG";
      else ch = "..";
      line += ch;
    }
    rows.push(line);
  }
  return rows.join("\n");
}

// ------------------------------------------------------------------------
// PNG encoding (RGBA8888, filter 0, deflate level 9)
// ------------------------------------------------------------------------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function writePng(atlasPx, atlasW, atlasH, file) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(atlasW, 0);
  ihdr.writeUInt32BE(atlasH, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = atlasW * 4;
  const raw = Buffer.alloc((stride + 1) * atlasH);
  for (let y = 0; y < atlasH; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    if (atlasPx.copy) {
      atlasPx.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    } else {
      Buffer.from(atlasPx).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

/** Shared CLI main: [--preview] dumps ASCII frames, always audit + write. */
function runAtlasGenerator(options) {
  const preview = process.argv.includes("--preview");
  if (preview) {
    for (let row = 0; row < options.rows; row++) {
      for (let col = 0; col < options.cols; col++) {
        if (col >= options.usedCount(row)) continue;
        console.log(`\n=== row ${row} frame ${col} ===`);
        console.log(asciiFrame(options.paintCell(row, col, col)));
      }
    }
  }
  auditAtlas(options);
  const atlasPx = buildAtlas(options);
  const out = path.join(__dirname, options.fileName);
  const size = writePng(atlasPx, options.gridW * options.scale * options.cols, options.gridH * options.scale * options.rows, out);
  console.log(`Wrote ${out} (${options.gridW * options.scale * options.cols}x${options.gridH * options.scale * options.rows}, ${size} bytes)`);
}

module.exports = {
  makeCanvas, setPx, alphaAt, drawLine, drawThickLine, fillEllipse, pointInPolygon,
  buildAtlas, auditAtlas, asciiFrame, writePng, runAtlasGenerator,
};
