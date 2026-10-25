/**
 * sea_dragon.png generator — "Aquí hay dragones" sea dragon (Space Invaders bonus-ship proposal).
 *
 * Reproducible procedure: a parametric ink-silhouette painter over a 40x32 logical grid,
 * nearest-neighbor upscaled x2 into a uniform 80x64 cell atlas (8 columns x 3 rows = 640x192).
 *
 *   row 0: fly    (6 frames, loop — serpentine undulation + bat-wing flap cycle)
 *   row 1: hit    (3 frames, one-shot — parchment wash flash, ink cross-stroke, recoil)
 *   row 2: death  (6 frames, one-shot — silhouette breaks into ink droplets and washes out)
 *
 * Run: node build-sea-dragon-atlas.cjs            -> writes sea_dragon.png (RGBA, true alpha)
 *      node build-sea-dragon-atlas.cjs --preview  -> ASCII preview before the PNG write
 *
 * Palette follows src/games/space-invaders/ARTWORK_theme_alternativo.md §4:
 *   ink #2B2118 (silhouette), red #B5332E wash (wings/hostile), teal #2E7F7A wash (belly/sea),
 *   gold #C9A227 (eye, horns, tail fin), parchment #E8D9B5 (hit-flash wash). No fire.
 * Shared scaffolding lives in ./atlas-kit.cjs.
 */
"use strict";

const {
  makeCanvas, setPx, drawLine, drawThickLine, fillEllipse, pointInPolygon,
  runAtlasGenerator,
} = require("./atlas-kit.cjs");

// ------------------------------------------------------------------------
// Atlas / logical grid geometry
// ------------------------------------------------------------------------
const GRID_W = 40;            // logical frame width (game world units)
const GRID_H = 32;            // logical frame height
const SCALE = 2;              // per-axis nearest-neighbor upscale for the PNG
const COLS = 8;               // atlas columns
const ROWS = 3;               // atlas rows: fly | hit | death
const FLY_FRAMES = 6;
const HIT_FRAMES = 3;
const DEATH_FRAMES = 6;

// Clear margin (logical px) required around the silhouette inside each cell,
// so neighboring frames can never bleed into each other.
const MARGIN = 2;

// ------------------------------------------------------------------------
// Palette (ARTWORK §4.1 + wash variants with real alpha)
// ------------------------------------------------------------------------
const INK = [43, 33, 24, 255];
const RED = [181, 51, 46, 255];
const RED_WASH = [181, 51, 46, 150];
const TEAL_WASH = [46, 127, 122, 135];
const GOLD = [201, 162, 39, 255];
const PARCHMENT = [232, 217, 181, 255];
const PARCHMENT_WASH = [232, 217, 181, 215];

// ------------------------------------------------------------------------
// Dragon geometry: serpentine spine + bat wings + ryū head accents
// ------------------------------------------------------------------------

/** Serpentine spine, x from tail to head. Returns {y, t} for the given x. */
function spine(x, phase) {
  const xTail = 6, xHead = 34;
  const t = Math.min(1, Math.max(0, (x - xTail) / (xHead - xTail)));
  const amp = 4.6 - 3.0 * t;                 // tail swings more, head steadier
  const cycles = 1.6;
  const y = 18 + amp * Math.sin((t * cycles - phase * 0.5) * Math.PI * 2 - Math.PI / 2);
  return { y, t };
}
/** Body half thickness (in px, asymmetric split top/bottom around spine). */
function bodyHalf(y /* spine y */, t) {
  const base = 1.4 + 2.6 * Math.sin(Math.PI * Math.min(1, t * 1.25)) + 0.8 * t; // 1.4 .. ~4.4
  return base;
}

/** Paint the dragon body silhouette (ink) plus teal belly wash. */
function paintBody(c, phase) {
  for (let x = 6; x <= 34; x += 0.5) {
    const s = spine(x, phase);
    const half = bodyHalf(0, s.t);
    const top = s.y - half, bottom = s.y + half;
    // Ink silhouette core
    for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
      if (y >= top - 0.25 && y <= bottom + 0.25) setPx(c, x, y, INK);
    }
    // Teal wash hugging the lower edge (inside the last px of the silhouette)
    if (bottom <= c.h - 1) setPx(c, x, bottom, TEAL_WASH);
    if (bottom + 1 <= c.h) setPx(c, x, bottom + 1, TEAL_WASH);
  }
}

/** Bat wing with three fingers and a scalloped trailing edge. Flap raises/lowers it above the body. */
function paintWing(c, phase) {
  const shoulderX = 20, shoulderY = spine(20, phase).y - 2.5;
  const lift = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2); // 1 = raised, 0 = flat
  const clampY = (y) => Math.max(2.2, Math.min(y, GRID_H - 3.2));
  const tips = [
    [shoulderX + 10, clampY(shoulderY - (2 + 9.0 * lift))],   // forward finger (long)
    [shoulderX + 5.5, clampY(shoulderY - (1 + 10.0 * lift))], // middle finger (highest)
    [shoulderX - 1.5, clampY(shoulderY - (2 + 5.5 * lift))],  // rear finger (short)
  ];
  // Membrane fill (red wash): polygon shoulder -> tip A -> tip B -> tip C
  const poly = [[shoulderX, shoulderY], ...tips];
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  for (let y = Math.min(...ys) - 1; y <= Math.max(...ys) + 1; y++)
    for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, poly)) setPx(c, x, y, RED_WASH);
    }
  // Finger bones (ink)
  for (const [tx, ty] of tips) drawLine(c, shoulderX, shoulderY, tx, ty, INK);
  // Scalloped trailing edge: shallow dips between consecutive tips
  for (let i = 0; i < 2; i++) {
    const a = tips[i], b = tips[i + 1];
    drawLine(c, a[0], a[1], b[0] * 0.55 + a[0] * 0.45, b[1] * 0.55 + a[1] * 0.45, INK, 0.95);
  }
  // Leading edge shoulder -> forward finger (slightly heavier)
  drawLine(c, shoulderX, shoulderY, tips[0][0], tips[0][1], INK, 1);
  drawLine(c, shoulderX + 0.4, shoulderY + 0.6, tips[0][0] - 1.5, tips[0][1] + 1.6, INK, 0.85);
  // Shoulder joint accent
  fillEllipse(c, shoulderX, shoulderY, 1.5, 1.5, INK);
  // Gold claw on the middle finger tip
  setPx(c, tips[1][0] + 0.5, tips[1][1] - 1, GOLD);
}

/** Head with horns, gold eye, whiskers and ink wedge snout. */
function paintHead(c, phase) {
  const hx = 33, hy = spine(33, phase).y - 0.5;
  // Skull
  fillEllipse(c, hx, hy, 4.0, 2.6, INK);
  // Snout wedge pointing right
  for (let i = 0; i <= 3; i++) {
    const xx = hx + 2 + i * 0.8;
    drawThickLine(c, xx, hy + 0.4, xx, hy + 0.4, 1.15 - i * 0.22, INK);
  }
  // Jaw hint below
  drawLine(c, hx + 1, hy + 2.4, hx + 4.0, hy + 1.0, INK);
  // Horns sweeping back-up, gold with ink root
  drawLine(c, hx - 1.5, hy - 2.2, hx - 3.2, hy - 4.6, GOLD);
  drawLine(c, hx - 0.5, hy - 2.6, hx - 1.6, hy - 5.2, GOLD);
  setPx(c, hx - 3.3, hy - 4.9, INK); setPx(c, hx - 1.7, hy - 5.5, INK);
  // Eye — gold, single readable pixel
  setPx(c, hx + 1, hy - 1, GOLD);
  // Whiskers (Japanese ryū accent) trailing back from the snout
  drawLine(c, hx + 3.4, hy - 0.6, hx - 0.2, hy - 3.6, GOLD, 0.85);
  drawLine(c, hx + 3.6, hy + 0.6, hx + 0.2, hy + 2.8, INK, 0.85);
  // Chest fore-claw
  const chestY = spine(27, phase).y;
  drawLine(c, 27, chestY + 3, 26, chestY + 5, INK);
  drawLine(c, 27, chestY + 3, 28, chestY + 5.2, INK);
}

/** Gold tail fin + flutter, drawn at the tail tip. */
function paintTail(c, phase) {
  const s = spine(6, phase);
  const flutter = 1.4 * Math.sin((phase) * Math.PI * 2 + 2.2);
  drawLine(c, 6, s.y, 3.8, s.y - 2.2 + flutter, GOLD, 0.95);
  drawLine(c, 6, s.y, 3.8, s.y + 2.0 + flutter, GOLD, 0.95);
  setPx(c, 3.6, s.y, INK);
}


/** Composite one fly frame. */
function paintFlyFrame(c, f) {
  const phase = f / FLY_FRAMES;
  paintBody(c, phase);
  paintWing(c, phase);
  paintTail(c, phase);
  paintHead(c, phase);
}

// ------------------------------------------------------------------------
// Hit frames: parchment wash flash, ink cross-stroke, recoil
// ------------------------------------------------------------------------

/** Ghost of a fly silhouette in a flat color (no edges, no accents) — used by hit flash. */
function paintSilhouetteColor(c, phase, color, alphaScale = 1) {
  for (let x = 6; x <= 34; x += 0.5) {
    const s = spine(x, phase);
    const half = bodyHalf(0, s.t);
    for (let y = Math.floor(s.y - half); y <= Math.ceil(s.y + half); y++) {
      setPx(c, x, y, color, alphaScale);
    }
  }
  const hx = 33, hy = spine(33, phase).y - 0.5;
  fillEllipse(c, hx, hy, 4.0, 2.6, color, alphaScale);
  for (let i = 0; i <= 3; i++) {
    drawThickLine(c, hx + 2 + i * 0.8, hy + 0.4, hx + 2 + i * 0.8, hy + 0.4, 1.15 - i * 0.22, color);
  }
}

function paintHitFrame(c, f) {
  const pose = f + 1; // temporal offset so the hit reads as a jolt inside the loop
  const phase = (pose % FLY_FRAMES) / FLY_FRAMES;
  if (f === 0) {
    // Parchment wash flash over the full silhouette (art bible §11.6 hit state)
    paintSilhouetteColor(c, phase, PARCHMENT_WASH);
    paintBodyEdges(c, phase);
  } else if (f === 1) {
    paintBody(c, phase); paintWing(c, phase); paintTail(c, phase); paintHead(c, phase);
    // Tachón de tinta cruzado sobre el costado (art bible: un trazo extra en cruz)
    drawLine(c, 24, spine(24, phase).y - 4.5, 26, spine(25, phase).y + 4.5, PARCHMENT, 1);
    drawLine(c, 22, spine(22, phase).y - 0.5, 29, spine(23, phase).y + 1.5, PARCHMENT, 1);
  } else {
    // Recoil: pose íntegra con borde rojo en la línea dorsal (lavado hostil)
    paintBody(c, phase); paintWing(c, phase); paintTail(c, phase); paintHead(c, phase);
    for (let x = 5; x <= 34; x += 0.5) {
      const s = spine(x, phase);
      const half = bodyHalf(0, s.t);
      setPx(c, x, s.y - half, RED);
    }
  }
}

function paintBodyEdges(c, phase) {
  for (let x = 6; x <= 34; x += 0.5) {
    const s = spine(x, phase);
    const half = bodyHalf(0, s.t);
    setPx(c, x, s.y - half, INK, 0.9);
    setPx(c, x, s.y + half, INK, 0.9);
  }
  const hx = 33;
  for (let a = 0; a < Math.PI * 2; a += 0.35) {
    setPx(c, Math.min(GRID_W - MARGIN, hx + 3.9 * Math.cos(a)), spine(33, phase).y - 0.5 + 2.6 * Math.sin(a), INK, 0.9);
  }
}

// ------------------------------------------------------------------------
// Death frames: silhouette breaks into ink blobs, washes dissolve
// ------------------------------------------------------------------------

const DEATH_PIECES = [
  { x: 34, y: 17.0, vx: 2.2, vy: 3.2, r: 3.4 },   // head
  { x: 27, y: 17.6, vx: 1.2, vy: 5.0, r: 3.0 },   // chest
  { x: 21, y: 18.0, vx: -1.6, vy: 6.0, r: 3.4 },  // mid body
  { x: 14, y: 17.2, vx: -2.8, vy: 4.6, r: 2.7 },  // belly
  { x: 9, y: 17.6, vx: -3.6, vy: 2.8, r: 2.4 },   // tail
  { x: 20, y: 8.5, vx: 2.4, vy: -1.6, r: 2.8 },   // upper wing mass
  { x: 24, y: 5.0, vx: 0.8, vy: -0.8, r: 2.2 },   // wing tip
];

function paintDeathFrame(c, f) {
  const t = f / (DEATH_FRAMES - 1);
  const fade = 1 - t;
  const gravityPull = 10 * t * t * 0.5;
  for (const p of DEATH_PIECES) {
    const x = p.x + p.vx * t * 0.9;
    const y = p.y + p.vy * t * 0.9 + gravityPull;
    fillEllipse(c, x, y, p.r * (0.6 + 0.4 * fade), p.r * (0.6 + 0.4 * fade), INK, fade);
    if (f > 0 && f !== DEATH_FRAMES - 1) {
      fillEllipse(c, x - p.r * 0.4, y + p.r * 0.5, p.r * 0.55, p.r * 0.5, TEAL_WASH, fade);
    }
  }
  // Scattered ink droplets (deterministic, seeded by frame)
  for (let d = 0; d < 7; d++) {
    const seed = d * 2.39996 + f * 1.7;
    const dx = 8 + ((seed * 7.3) % 26);
    const dy = Math.min(27.6, 8 + ((seed * 3.1) % 20) + t * 4);
    fillEllipse(c, dx, dy, 0.7 + (d % 3) * 0.3, 0.7 + (d % 3) * 0.3, INK, fade);
  }
  // Gold eye sinking below the head blob
  if (f < DEATH_FRAMES - 2) {
    setPx(c, 35 + 2.2 * t * 0.9, 17.0 + 3.2 * t * 0.9, GOLD, fade);
  }
}

// ------------------------------------------------------------------------
// Assemble the atlas (shared kit)
// ------------------------------------------------------------------------

function paintCell(row, col, frameIndex) {
  const c = makeCanvas(GRID_W, GRID_H);
  if ((row === 0 && col >= FLY_FRAMES) || (row === 1 && col >= HIT_FRAMES) || (row === 2 && col >= DEATH_FRAMES)) {
    return c; // unused cells stay fully transparent
  }
  if (row === 0) paintFlyFrame(c, frameIndex);
  else if (row === 1) paintHitFrame(c, frameIndex);
  else paintDeathFrame(c, frameIndex);
  return c;
}

function usedCount(row) {
  return row === 0 ? FLY_FRAMES : row === 1 ? HIT_FRAMES : DEATH_FRAMES;
}

runAtlasGenerator({
  name: "sea_dragon",
  fileName: "sea_dragon.png",
  paintCell,
  gridW: GRID_W,
  gridH: GRID_H,
  scale: SCALE,
  cols: COLS,
  rows: ROWS,
  usedCount,
  isIntentionalBlank: (row, col) => row === 2 && col === DEATH_FRAMES - 1,
  margin: MARGIN,
  minPixels: 30,
});
