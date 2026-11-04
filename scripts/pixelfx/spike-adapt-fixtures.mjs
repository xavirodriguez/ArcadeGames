#!/usr/bin/env node
/**
 * Spike: validate adaptPixelFXExport against real-shaped PixelFX --sheet JSON fixtures.
 * Run: node scripts/pixelfx/spike-adapt-fixtures.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../src/games/shared/pixelfx/__fixtures__");

function adaptPixelFXExport(sheetId, imagePath, json, originTag) {
  const framesRaw = Array.isArray(json.frames) ? json.frames : Object.values(json.frames);
  if (framesRaw.length === 0) throw new Error(`no frames for ${sheetId}`);

  const first = framesRaw[0].frame;
  const frameWidth = first.w;
  const frameHeight = first.h;
  const fps = json.meta.pixelfx?.fps ?? 12;
  const frameDuration = 1 / fps;
  const loop = json.meta.pixelfx?.loop ?? false;

  const rawPivot = json.meta.pixelfx?.pivot;
  let pivotX, pivotY;
  if (Array.isArray(rawPivot) && rawPivot.length >= 2) {
    pivotX = rawPivot[0];
    pivotY = rawPivot[1];
  } else if (rawPivot && typeof rawPivot === "object" && "x" in rawPivot) {
    pivotX = rawPivot.x;
    pivotY = rawPivot.y;
  } else {
    pivotX = frameWidth / 2;
    pivotY = frameHeight / 2;
  }

  const anchor = { x: pivotX / frameWidth, y: pivotY / frameHeight };
  const frames = framesRaw.map((f) => ({ x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h }));

  return {
    id: sheetId,
    imagePath,
    frameWidth,
    frameHeight,
    frameDuration,
    loop,
    anchor,
    frames,
    actTiming: json.meta.pixelfx?.act,
    origin: originTag,
    filter: "nearest",
    durationSeconds: frames.length * frameDuration,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function runFixture(name, expected) {
  const json = JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), "utf8"));
  const meta = adaptPixelFXExport(
    `pixelfx/${name}`,
    `assets/pixelfx/${name}.png`,
    json,
    `pixelfx:${json.meta.pixelfx.id}`
  );

  console.log(`\n=== ${name} ===`);
  console.log(`  frames:        ${meta.frames.length}`);
  console.log(`  frameSize:     ${meta.frameWidth}×${meta.frameHeight}`);
  console.log(`  fps:           ${1 / meta.frameDuration}`);
  console.log(`  duration:      ${meta.durationSeconds.toFixed(3)}s`);
  console.log(`  anchor:        (${meta.anchor.x.toFixed(4)}, ${meta.anchor.y.toFixed(4)})`);
  console.log(`  loop:          ${meta.loop}`);
  console.log(`  filter:        ${meta.filter}`);
  console.log(`  actTiming:     ${meta.actTiming ? JSON.stringify(meta.actTiming) : "none"}`);

  assert(meta.frames.length === expected.frameCount, `frameCount ${meta.frames.length} != ${expected.frameCount}`);
  assert(meta.frameWidth === expected.frameW, `frameW`);
  assert(meta.frameHeight === expected.frameH, `frameH`);
  assert(Math.abs(meta.anchor.x - expected.anchorX) < 1e-6, `anchorX ${meta.anchor.x} != ${expected.anchorX}`);
  assert(Math.abs(meta.anchor.y - expected.anchorY) < 1e-6, `anchorY ${meta.anchor.y} != ${expected.anchorY}`);
  assert(Math.abs(meta.durationSeconds - expected.duration) < 0.02, `duration ${meta.durationSeconds} != ${expected.duration}`);
  assert(meta.filter === "nearest", "filter");
  assert(meta.loop === false, "loop");
  assert(meta.anchor.x >= 0 && meta.anchor.x <= 1, "anchor.x in [0,1]");
  assert(meta.anchor.y >= 0 && meta.anchor.y <= 1, "anchor.y in [0,1]");

  console.log("  OK");
  return meta;
}

const hit = runFixture("hit-flash", {
  frameCount: 16,
  frameW: 80,
  frameH: 64,
  anchorX: 40 / 80,
  anchorY: 54 / 64,
  duration: 16 / 30,
});

const pow = runFixture("cartoon-pow", {
  frameCount: 32,
  frameW: 184,
  frameH: 144,
  anchorX: 92 / 184,
  anchorY: 72 / 144,
  duration: 32 / 30,
});

console.log("\n=== Scale guidance (logical world size) ===");
console.log(`  hit-flash native ${hit.frameWidth}×${hit.frameHeight} → scale ~0.9 → ~72×58 world px`);
console.log(`  cartoon-pow native ${pow.frameWidth}×${pow.frameHeight} → scale ~0.45 → ~83×65 world px (do NOT use 1.0)`);
console.log("\nSpike adapter: ALL ASSERTIONS PASSED");
