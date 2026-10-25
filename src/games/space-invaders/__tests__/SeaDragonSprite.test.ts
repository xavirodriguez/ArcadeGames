import * as fs from "fs";
import * as path from "path";
import type { RenderComponent } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import type { SkCanvas } from "../../shared/rendering/SkiaContext";
import { SpriteRegistry, SpriteAnimatorComponent, playAnimation, updateSpriteAnimator } from "../../shared/sprites";
import {
  SEA_DRAGON_BASE_SIZE,
  SEA_DRAGON_SECONDS_PER_TICK,
  SEA_DRAGON_SHAPE,
  SEA_DRAGON_SPRITE_ID,
  advanceSeaDragonAnimation,
  drawSkiaSeaDragonSprite,
  drawSeaDragonSpriteCanvas,
  preloadSeaDragonSkiaImage,
} from "../rendering/SeaDragonVisuals";
import { nauticalMod } from "../mods/registry";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

SpriteRegistry.init();

const SHEET = SpriteRegistry.get(SEA_DRAGON_SPRITE_ID);

function createRender(): RenderComponent {
  return {
    type: "Render",
    shape: SEA_DRAGON_SHAPE,
    size: SEA_DRAGON_BASE_SIZE,
    color: "#2B2118",
    visible: true,
    opacity: 1,
    order: 20,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0,
  };
}

function createAnimatorState(): { animator: SpriteAnimatorComponent; lastTick: number } {
  return {
    animator: {
      sheetId: SEA_DRAGON_SPRITE_ID,
      currentAnim: "fly",
      frameIndex: 0,
      timer: 0,
      flipX: false,
      scale: 1,
    },
    lastTick: 0,
  };
}

const PNG_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "assets",
  "sprites",
  "enemies",
  "sea_dragon.png"
);

describe("Sea dragon sprite sheet registration ('dragón marino')", () => {
  it("registers the sheet in the shared SpriteRegistry with the measured animations", () => {
    expect(SHEET).toBeDefined();
    expect(SHEET?.frameWidth).toBe(40);
    expect(SHEET?.frameHeight).toBe(32);
    expect(Object.keys(SHEET?.animations ?? {})).toEqual(["fly", "hit", "death"]);
    expect(SHEET?.animations.fly.frames.length).toBe(6);
    expect(SHEET?.animations.hit.frames.length).toBe(3);
    expect(SHEET?.animations.death.frames.length).toBe(6);
    expect(SHEET?.animations.fly.frameDuration).toBe(0.16);
    expect(SHEET?.animations.fly.loop).toBe(true);
    expect(SHEET?.animations.hit.loop).toBe(false);
    expect(SHEET?.animations.death.loop).toBe(false);
  });

  it("reads a real 640x192 RGBA PNG on disk and keeps every frame inside the sheet", () => {
    expect(fs.existsSync(PNG_PATH)).toBe(true);
    const bytes = fs.readFileSync(PNG_PATH);
    expect(bytes.readUInt32BE(0)).toBe(0x89504e47);
    expect(bytes[24]).toBe(8); // IHDR bit depth
    expect(bytes[25]).toBe(6); // IHDR colorType RGBA → real alpha channel
    const [width, height] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    expect([width, height]).toEqual([640, 192]);
    expect(bytes.length).toBeLessThan(100_000); // sane asset size

    for (const animation of Object.values(SHEET!.animations)) {
      for (const frame of animation.frames) {
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.x + frame.w).toBeLessThanOrEqual(width);
        expect(frame.y + frame.h).toBeLessThanOrEqual(height);
        expect([frame.w, frame.h]).toEqual([SHEET!.frameWidth, SHEET!.frameHeight]);
      }
    }
  });

  it("matches the atlas layout: uniform 80x64 cells, rows fly | hit | death", () => {
    expect(SHEET!.animations.fly.frames[0]).toEqual({ x: 0, y: 0, w: 40, h: 32 });
    expect(SHEET!.animations.fly.frames[5]).toEqual({ x: 200, y: 0, w: 40, h: 32 });
    expect(SHEET!.animations.hit.frames[0]).toEqual({ x: 0, y: 32, w: 40, h: 32 });
    expect(SHEET!.animations.death.frames[0]).toEqual({ x: 0, y: 64, w: 40, h: 32 });
    expect(SHEET!.animations.death.frames[5]).toEqual({ x: 200, y: 64, w: 40, h: 32 });
  });
});

describe("Sea dragon animator behaviour", () => {
  it("advances deterministically from the ECS tick (both renderers frame-lock)", () => {
    const render = createRender();
    const state = createAnimatorState();
    let animator = state.animator;
    // 90 ticks at 1/60 s = 1.5 s; fly frameDuration 0.16 s → 9 completed frames
    // (1.5 / 0.16 = 9.375) → (9 % 6) = 3, residual timer = 0.375 * 0.16 = 0.06 s.
    // A point exactly on a frame boundary (e.g. 96 ticks = 10.0 frames) depends
    // on float accumulation, so the test parks deliberately off-boundary.
    for (let tick = 1; tick <= 90; tick++) {
      animator = advanceSeaDragonAnimation(state, render, tick);
    }
    expect(animator.currentAnim).toBe("fly");
    expect(animator.frameIndex).toBe(3);
    expect(animator.timer).toBeCloseTo(0.06, 6);
    // Same tick again → no drift, same frame.
    expect(advanceSeaDragonAnimation(state, render, 90).frameIndex).toBe(3);
  });

  it("switches to the hit clip on hit flash and returns to fly when the flash clears", () => {
    const state = createAnimatorState();
    const flashing = createRender();
    flashing.hitFlashFrames = 5;

    const hit = advanceSeaDragonAnimation(state, flashing, 10);
    expect(hit.currentAnim).toBe("hit");
    expect(hit.frameIndex).toBe(0);
    advanceSeaDragonAnimation(state, flashing, 11);
    advanceSeaDragonAnimation(state, flashing, 12);

    const cleared = createRender();
    cleared.hitFlashFrames = 0;
    const after = advanceSeaDragonAnimation(state, cleared, 13);
    expect(after.currentAnim).toBe("fly");
    expect(after.frameIndex).toBe(0);
  });

  it("completes the one-shot clips without leaking into the next loop", () => {
    const animator: SpriteAnimatorComponent = {
      sheetId: SEA_DRAGON_SPRITE_ID,
      currentAnim: "hit",
      frameIndex: 0,
      timer: 0,
      flipX: false,
      scale: 1,
    };
    let finished = false;
    for (let step = 0; step < 40 && !finished; step++) {
      finished = updateSpriteAnimator(animator, SEA_DRAGON_SECONDS_PER_TICK) || finished;
    }
    expect(finished).toBe(true);
    expect(animator.frameIndex).toBe(2); // holds the last hit frame
    playAnimation(animator, "fly");
    expect(animator.frameIndex).toBe(0);
  });
});

describe("Sea dragon drawers and mod registration", () => {
  it("registers the sea dragon shape for Canvas and Skia through the nautical mod", () => {
    const registered: Array<{ backend: string; shape: string }> = [];
    nauticalMod.registerDrawers?.((backend, shape) => {
      registered.push({ backend, shape });
    });
    expect(registered).toContainEqual({ backend: "canvas", shape: SEA_DRAGON_SHAPE });
    expect(registered).toContainEqual({ backend: "skia", shape: SEA_DRAGON_SHAPE });
  });

  it("draws the procedural fallback silhouette on Canvas while the sheet is not cached", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, createRender());

    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      globalAlpha: 1,
      beginPath: () => calls.push("beginPath"),
      closePath: () => calls.push("closePath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
      fill: () => calls.push("fill"),
      fillRect: () => calls.push("fillRect"),
      drawImage: () => calls.push("drawImage"),
    };
    drawSeaDragonSpriteCanvas.draw(ctx as never as CanvasRenderingContext2D, world, entity);

    expect(calls).toContain("save");
    expect(calls).toContain("fillRect"); // gold eye painted by the fallback silhouette
    expect(calls).not.toContain("drawImage"); // nothing decoded in this environment
  });

  it("skips drawing entirely when the Render component is missing or invisible", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.createEntity(); // no Render component

    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
    };
    drawSeaDragonSpriteCanvas.draw(ctx as never as CanvasRenderingContext2D, world, 0);
    expect(calls).toEqual([]);

    const hidden = world.createEntity();
    const hiddenRender = createRender();
    hiddenRender.visible = false;
    world.addComponent(hidden, hiddenRender);
    drawSeaDragonSpriteCanvas.draw(ctx as never as CanvasRenderingContext2D, world, hidden);
    expect(calls).toEqual([]);
  });

  it("never throws on Skia without a decoded SkImage (headless guard)", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, createRender());

    const canvas = {
      save: () => undefined,
      restore: () => undefined,
      drawImageRect: () => undefined,
      drawPath: () => undefined,
      drawRect: () => undefined,
    };
    expect(() => {
      void preloadSeaDragonSkiaImage();
      drawSkiaSeaDragonSprite.draw(canvas as never as SkCanvas, world, entity);
    }).not.toThrow();
  });
});
