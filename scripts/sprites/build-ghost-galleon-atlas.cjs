/**
 * ghost_galleon.png generator — "Aquí hay dragones" ghost galleon (Space Invaders bonus ship).
 *
 * Reproducible procedure: a parametric ink painter over a 40x32 logical grid,
 * nearest-neighbor upscaled x2 into a uniform 80x64 cell atlas (8 columns x 3 rows = 640x192).
 *
 *   row 0: sail   (8 frames, loop — slow heave bob + ragged sail tatters + red pennants)
 *   row 1: hit    (3 frames, one-shot — parchment wash flash, cross-stroke, red rim recoil)
 *   row 2: death  (6 frames, one-shot — the wreck breaks apart and the wash dissolves)
 *
 * Run: node build-ghost-galleon-atlas.cjs            -> writes ghost_galleon.png (RGBA, true alpha)
 *      node build-ghost-galleon-atlas.cjs --preview  -> ASCII preview before the PNG write
 *
 * Palette follows src/games/space-invaders/ARTWORK_theme_alternativo.md §4:
 *   ink #2B2118 (hull/masts), parchment #E8D9B5 (ghostly sails), red #B5332E (pennants/rim),
 *   teal #2E7F7A (waterline + ghost washes), gold #C9A227 (lanterns, crow's nests). No fire.
 * Shared scaffolding lives in ./atlas-kit.cjs.
 */
"use strict";

const { makeCanvas, setPx, drawLine, fillEllipse, runAtlasGenerator } = require("./atlas-kit.cjs");

// ------------------------------------------------------------------------
// Atlas / logical grid geometry
// ------------------------------------------------------------------------
const GRID_W = 40;            // logical frame width (game world units)
const GRID_H = 32;            // logical frame height
const SCALE = 2;              // per-axis nearest-neighbor upscale for the PNG
const COLS = 8;               // atlas columns
const ROWS = 3;               // atlas rows: sail | hit | death
const SAIL_FRAMES = 8;
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
const TEAL_GHOST = [46, 127, 122, 80];
const GOLD = [201, 162, 39, 255];
const PARCHMENT_WASH = [232, 217, 181, 215];
const PARCHMENT_FADE = [232, 217, 181, 140];

/** Ghost sail cloth: teal wash reads on the parchment chart where parchment itself vanishes. */
const SAIL_CLOTH = [46, 127, 122, 118];

// ------------------------------------------------------------------------
// Ship geometry — deck + bilge curves, masts, ghostly sails
// ------------------------------------------------------------------------

/** Heave bob (frames drift ±0.8 px) and roll shear for top structures. */
function framePose(f, frames) {
  const t = (f / frames) * Math.PI * 2;
  return { oy: 0.8 * Math.sin(t), roll: 0.6 * Math.cos(t), t };
}

/** Deck (top edge) and bilge (bottom edge) of the hull at logical x ∈ [4,35]. */
function hullEdges(x) {
  const t = Math.min(1, Math.max(0, (x - 4) / 31));
  const deck = 20.5 - 1.0 * Math.sin(Math.PI * t);   // mid slightly raised
  const bilge = 24.4 + 0.9 * Math.sin(Math.PI * t);  // mid deeper
  return { deck, bilge, t };
}

/** Paint hull ink silhouette + waterline teal wash + gold lanterns. */
function paintHull(c, oy) {
  for (let x = 4; x <= 35; x += 0.5) {
    const e = hullEdges(x);
    const top = e.deck + oy, bottom = e.bilge + oy;
    for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
      if (y >= top - 0.25 && y <= bottom + 0.25) setPx(c, x, y, INK);
    }
    // Waterline wash hugging the bilge
    if (bottom + 1 <= GRID_H - MARGIN) {
      setPx(c, x, bottom, TEAL_WASH);
      setPx(c, x, bottom + 1, TEAL_WASH);
      // Ghost wisp trailing the waterline (dashes)
      if (Math.abs(Math.sin(x * 0.7)) > 0.72) setPx(c, x, bottom + 1, TEAL_GHOST);
    }
    // Deck rim highlight so the silhouette edge reads at small size
    setPx(c, x, top, INK, 0.95);
  }
  // Bow & stern gold lanterns (single readable pixels)
  const bow = hullEdges(35), stern = hullEdges(4);
  setPx(c, 35.5, bow.deck + oy - 1.2, GOLD);
  setPx(c, 3.5, stern.deck + oy - 1.2, GOLD);
  // Stern aftcastle (raised quarterdeck, left side)
  for (let y = Math.floor(stern.deck + oy - 1.6); y <= Math.ceil(stern.deck + oy); y++) {
    for (let x = 4; x <= 9; x += 0.5) setPx(c, x, y, INK);
  }
  drawLine(c, 4, stern.deck + oy - 1.6, 9, stern.deck + oy - 1.6, INK, 0.95);
}

/** Masts with gold crow's nests; top structures shear with roll. */
function paintMasts(c, oy, roll) {
  for (const mx of [13, 27]) {
    const e = hullEdges(mx);
    const topY = mx === 13 ? 5.0 : 7.0;
    drawLine(c, mx, e.deck + oy, mx + roll * 0.2, topY + oy, INK, 0.95);
    drawLine(c, mx + 0.6, e.deck + oy, mx + 0.6 + roll * 0.2, topY + oy, INK, 0.85);
    // Crow's nest + masthead
    fillEllipse(c, mx + roll * 0.4 + 0.3, topY + oy + 1.2, 1.2, 0.9, INK);
    setPx(c, mx + roll * 0.5 + 0.3, topY + oy - 0.6, GOLD);
  }
}

/** Ghostly ragged sail between two yards; pennants flap on the mastheads. */
function paintSail(c, cx, width, topY, height, oy, roll, tatterSeed) {
  const x0 = cx - width / 2, x1 = cx + width / 2;
  const shear = roll * 0.10;
  for (let y = 0; y <= height; y += 0.5) {
    const v = y / height;
    for (let x = x0; x <= x1; x += 0.5) {
      // Cloth sway: horizontal drift grows toward the bottom
      const xx = x + shear * y;
      const yy = topY + y + oy;
      if (y <= height - 1.2) {
        setPx(c, xx, yy, SAIL_CLOTH);
      }
      // Vertical stagelines (two faint sail seams) keep it inky
      if (y < height && (Math.abs(x - cx) < 0.25)) setPx(c, xx, yy, INK, 0.55);
      // Ragged tatters along the bottom edge (pattern shifts with the frame seed)
      const tatterPhase = Math.floor(x + tatterSeed) % 3;
      if (y >= height - 0.6 && tatterPhase !== 0) {
        // 1-2 dangling pixels below the seam where the cloth is torn
        if (tatterPhase === 1 || y >= height - 0.2) setPx(c, xx, yy + tatterPhase * 0.6, SAIL_CLOTH, 0.9);
      }
    }
    // Side edges (ink, semi-transparent ghost outline)
    setPx(c, x0 + shear * y + (y < height - 1.2 ? 0 : tatterSeed % 3) * 0, topY + y + oy, INK, 0.8);
    setPx(c, x1 + shear * y, topY + y + oy, INK, 0.8);
  }
  // Yard arms (horizontal spars)
  drawLine(c, x0 - 0.8 + roll * 0.05, topY + oy, x1 + 0.8 + roll * 0.05, topY + oy, INK, 0.95);
  drawLine(c, x0 - 0.8, topY + height + oy, x1 + 0.8, topY + height + oy, INK, 0.9);
  // Red pennant flying from the yard tip
  const flap = ((tatterSeed % 2) ^ (Math.floor(tatterSeed * 0.5) % 2)) === 0 ? 0 : -0.6;
  setPx(c, x1 + 1.6 + flap, topY + oy - 0.4, RED);
  setPx(c, x1 + 2.6 + flap, topY + oy - 0.9, RED, 0.9);
}

/** Composite one sail frame. */
function paintSailFrame(c, f) {
  const pose = framePose(f, SAIL_FRAMES);
  paintHull(c, pose.oy);
  paintSail(c, 13, 9, 6.8, 11.2, pose.oy, pose.roll, f * 2 + 1);
  paintSail(c, 27, 7, 8.8, 8.2, pose.oy, pose.roll, f * 2 + 3);
  paintMasts(c, pose.oy, pose.roll);
  for (const fy of [-1.2, -0.6]) {
    // faint ghost glimmer just above the deck, drifting with the heave
    fillEllipse(c, 19.5, 17.5 + pose.oy + fy * 0.4, 2.2, 0.5, TEAL_GHOST, 0.5);
  }
}

// ------------------------------------------------------------------------
// Hit frames: parchment wash flash, cross-stroke, red rim recoil
// ------------------------------------------------------------------------

/** Flat-color ghost of the whole ship (no accents) for the hit flash. */
function paintShipSilhouette(c, oy, roll, color, alphaScale = 1) {
  for (let x = 4; x <= 35; x += 0.5) {
    const e = hullEdges(x);
    for (let y = Math.floor(e.deck + oy); y <= Math.ceil(e.bilge + oy); y++) {
      setPx(c, x, y, color, alphaScale);
    }
  }
  // Masts + sail masses (simple blocks, no tatters)
  paintSailSilhouette(c, 13, 9, 6.8, 11.2, oy, roll, color, alphaScale);
  paintSailSilhouette(c, 27, 7, 8.8, 8.2, oy, roll, color, alphaScale);
}

function paintSailSilhouette(c, cx, width, topY, height, oy, roll, color, alphaScale) {
  const x0 = cx - width / 2, x1 = cx + width / 2;
  const shear = roll * 0.10;
  for (let y = 0; y <= height; y += 0.5) {
    for (let x = x0; x <= x1; x += 0.5) {
      setPx(c, x + shear * y, topY + y + oy, color, alphaScale);
    }
  }
}

function paintHitFrame(c, f) {
  const pose = framePose(Math.min(f + 4, SAIL_FRAMES - 1), SAIL_FRAMES);
  if (f === 0) {
    // Hostile wash flash over the full ship + ink edges (art bible §11.6 hit state)
    paintShipSilhouette(c, pose.oy, pose.roll, RED_WASH);
    paintHullEdges(c, pose.oy);
  } else if (f === 1) {
    paintSailFrame(c, Math.min(f + 4, SAIL_FRAMES - 1));
    // Cross-stroke gash across the hull
    drawLine(c, 14, 20.0 + pose.oy, 26, 25.0 + pose.oy, PARCHMENT_WASH, 1);
    drawLine(c, 19, 19.2 + pose.oy, 22, 26.0 + pose.oy, PARCHMENT_WASH, 1);
  } else {
    paintSailFrame(c, Math.min(f + 4, SAIL_FRAMES - 1));
    // Recoil: hostile red rim along the waterline and deck
    for (let x = 4; x <= 35; x += 0.5) {
      const e = hullEdges(x);
      setPx(c, x, e.bilge + pose.oy, RED);
      setPx(c, x, e.deck + pose.oy, RED, 0.9);
    }
  }
}

function paintHullEdges(c, oy) {
  for (let x = 4; x <= 35; x += 0.5) {
    const e = hullEdges(x);
    setPx(c, x, e.deck + oy, INK, 0.9);
    setPx(c, x, e.bilge + oy, INK, 0.9);
  }
}

// ------------------------------------------------------------------------
// Death frames: the wreck breaks apart, washes dissolve
// ------------------------------------------------------------------------

const DEATH_PIECES = [
  { x: 31, y: 21.0, vx: 2.6, vy: 3.0, r: 3.2, kind: "hull" },    // bow chunk
  { x: 22, y: 22.0, vx: 1.0, vy: 4.6, r: 3.4, kind: "hull" },    // mid hull
  { x: 8, y: 20.0, vx: -3.0, vy: 3.4, r: 3.0, kind: "hull" },    // stern chunk
  { x: 13, y: 11.0, vx: -1.2, vy: -1.8, r: 3.9, kind: "sail" },  // main sail + mast
  { x: 27, y: 11.5, vx: 1.8, vy: -1.2, r: 3.2, kind: "sail" },   // fore sail + mast
];

function paintDeathFrame(c, f) {
  if (f >= DEATH_FRAMES - 1) return; // last cell intentionally blank (wreck dissolves)
  const t = f / (DEATH_FRAMES - 1);
  const fade = 1 - t;
  const gravityPull = 7 * t * t * 0.5;
  for (const p of DEATH_PIECES) {
    const x = p.x + p.vx * t * 0.9;
    const y = p.y + Math.min(p.vy, 3.8) * t * 0.9 + gravityPull;
    if (p.kind === "hull") {
      fillEllipse(c, x, y, p.r * (0.6 + 0.4 * fade), p.r * (0.55 + 0.35 * fade), INK, fade);
      if (f > 0) fillEllipse(c, x - p.r * 0.35, y + p.r * 0.5, p.r * 0.5, p.r * 0.4, TEAL_WASH, fade);
    } else {
      // Ghostly sail shreds: teal blob with ink spar
      fillEllipse(c, x, y, p.r * (0.55 + 0.45 * fade), p.r * (0.45 + 0.35 * fade), TEAL_WASH, fade);
      drawLine(c, x - 0.4, y - p.r * 0.8, x - 0.4, y + p.r * 1.1, INK, fade * 0.9);
    }
  }
  // Gold lanterns sink below the drifting hull chunks
  if (f < DEATH_FRAMES - 2) {
    setPx(c, 35 + 2.0 * t * 0.9, 21 + 3.4 * t * 0.9, GOLD, fade);
    setPx(c, 3 - 2.4 * t * 0.9, 20 + 3.8 * t * 0.9, GOLD, fade);
  }
  // Scattered ink droplets (deterministic, seeded by frame)
  for (let d = 0; d < 7; d++) {
    const seed = d * 2.11337 + f * 1.9;
    const dx = 7 + ((seed * 7.7) % 27);
    const dy = Math.min(27.4, 6 + ((seed * 3.3) % 17) + t * 3);
    fillEllipse(c, dx, dy, 0.7 + (d % 3) * 0.3, 0.7 + (d % 3) * 0.3, INK, fade);
  }
}

// ------------------------------------------------------------------------
// Assemble the atlas (shared kit)
// ------------------------------------------------------------------------

function paintCell(row, col, frameIndex) {
  const c = makeCanvas(GRID_W, GRID_H);
  if ((row === 0 && col >= SAIL_FRAMES) || (row === 1 && col >= HIT_FRAMES) || (row === 2 && col >= DEATH_FRAMES)) {
    return c; // unused cells stay fully transparent
  }
  if (row === 0) paintSailFrame(c, frameIndex);
  else if (row === 1) paintHitFrame(c, frameIndex);
  else paintDeathFrame(c, frameIndex);
  return c;
}

function usedCount(row) {
  return row === 0 ? SAIL_FRAMES : row === 1 ? HIT_FRAMES : DEATH_FRAMES;
}

runAtlasGenerator({
  name: "ghost_galleon",
  fileName: "ghost_galleon.png",
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
