/**
 * Sea dragon visuals ("dragón marino") for Space Invaders — Aquí hay dragones mod.
 *
 * Art bible: src/games/space-invaders/ARTWORK_theme_alternativo.md §12.2/§12.3 —
 * bat-winged sea dragon as the rare bonus ship proposal: ≈34 u ink silhouette,
 * gold/red washes, gold eye, no fire. Japanese accent: ryū horns, whiskers and tail fin.
 *
 * Asset pipeline: the sheet is registered in the shared SpriteRegistry as `sea_dragon`
 * (see src/games/shared/sprites/). These ShapeDrawers bridge that registry into the
 * Space Invaders rendering contract for Canvas and Skia. No gameplay entity currently
 * spawns with shape `sea_dragon`; the drawers are wired through NauticalMod.registerDrawers
 * so a bonus-ship spawner can simply set render.shape = "sea_dragon" and get Canvas/Skia parity.
 */
import { ShapeDrawer, World } from "@tiny-aster/core";
import type { RenderComponent } from "@tiny-aster/core";
import type { Asset } from "expo-asset";
import type { SkCanvas } from "../../shared/rendering/SkiaContext";
import { Skia } from "../../shared/rendering/SkiaContext";
import {
  SpriteAnimatorComponent,
  createSpriteAnimator,
  drawSpriteCanvas,
  drawSpriteSkia,
  getSkiaImage,
  isCanvasSpriteReady,
  playAnimation,
  preloadSpriteSheetCanvas,
  setSkiaImage,
  updateSpriteAnimator,
} from "../../shared/sprites";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

import { AQUI_HAY_DRAGONES_PALETTE } from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";

/** Sprite sheet id registered in the shared SpriteRegistry. */
export const SEA_DRAGON_SPRITE_ID = "sea_dragon";

/** Render shape id that resolves to these drawers (via NauticalMod.registerDrawers). */
export const SEA_DRAGON_SHAPE = "sea_dragon";

/**
 * GameLoop fixed timestep (packages/core/src/loop/GameLoop.ts default step).
 * ECS `tick` is the number of fixed updates, so time is exactly tickDelta / 60.
 */
export const SEA_DRAGON_SECONDS_PER_TICK = 1 / 60;

/** Upper bound for the per-draw animation step, mirroring config MAX_DELTA_TIME. */
const MAX_ANIMATION_STEP_SECONDS = 0.2;

/**
 * Logical frame size consumed from the sheet (world units). The silhouette is
 * ≈34 u long within a 40×32 frame; matching the ufo blueprint's 15 u collider
 * circle. Kept as manifest constants so future spawner code can size against them.
 */
export const SEA_DRAGON_FRAME_SIZE = { width: 40, height: 32 } as const;
export const SEA_DRAGON_BASE_SIZE = 15;

// ---------------------------------------------------------------------------
// Static asset (Metro require kept lazy so headless/test imports stay safe)
// ---------------------------------------------------------------------------

/** Static module handle of the PNG; resolved by Metro on web and native. */
export function getSeaDragonAssetModule(): number | string | { uri: string; width: number; height: number } {
  return require("../../../../assets/sprites/enemies/sea_dragon.png");
}

/** Bundled asset handle, mirroring SamuraiVisualAssets.loadSamuraiSpritesheetAsset. */
export function createSeaDragonAsset(): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(getSeaDragonAssetModule());
}

// ---------------------------------------------------------------------------
// Deterministic animation driven from the ECS tick (presentation-only state;
// never stored in gameplay/snapshot state, mirroring ComboHUDRenderSystem usage)
// ---------------------------------------------------------------------------

interface SeaDragonAnimatorState {
  animator: SpriteAnimatorComponent;
  lastTick: number;
}

const animatorStates = new WeakMap<World<SpaceInvadersComponentRegistry>, SeaDragonAnimatorState>();

function getAnimatorState(world: World<SpaceInvadersComponentRegistry>): SeaDragonAnimatorState {
  let state = animatorStates.get(world);
  if (!state) {
    state = {
      animator: createSpriteAnimator(SEA_DRAGON_SPRITE_ID, "fly"),
      lastTick: world.tick,
    };
    animatorStates.set(world, state);
  }
  return state;
}

/**
 * Advances the sea dragon animator to the given tick and switches clips from
 * render flags: `hitFlashFrames > 0` plays the one-shot hit clip; once the hit
 * flash clears the animation returns to the looping `fly` clip. Pure function
 * of (state, render, tick) so both renderers frame-lock to the same frame.
 */
export function advanceSeaDragonAnimation(
  state: SeaDragonAnimatorState,
  render: RenderComponent | undefined,
  tick: number
): SpriteAnimatorComponent {
  const clampedTick = Math.max(tick, state.lastTick);
  const dt = Math.min(MAX_ANIMATION_STEP_SECONDS, (clampedTick - state.lastTick) * SEA_DRAGON_SECONDS_PER_TICK);
  updateSpriteAnimator(state.animator, dt);

  const flashing = render !== undefined && render.hitFlashFrames > 0;
  if (flashing && state.animator.currentAnim !== "hit") {
    playAnimation(state.animator, "hit");
  } else if (!flashing && state.animator.currentAnim === "hit") {
    playAnimation(state.animator, "fly");
  }

  state.lastTick = tick;
  return state.animator;
}

// ---------------------------------------------------------------------------
// Skia image load (Skia needs an explicit SkImage; Canvas lazily loads itself)
// ---------------------------------------------------------------------------

let skiaLoadPromise: Promise<void> | undefined;

/**
 * Starts the async Skia decode of the sea dragon sheet with expo-asset, exactly
 * once. While the image is not ready the drawers render the procedural fallback
 * silhouette, so no first-frame pop-in ever flashes.
 */
export function preloadSeaDragonSkiaImage(): Promise<void> {
  if (skiaLoadPromise) return skiaLoadPromise;
  if (getSkiaImage(SEA_DRAGON_SPRITE_ID)) return Promise.resolve();
  if (!Skia) return Promise.resolve();

  skiaLoadPromise = (async () => {
    try {
      const asset = createSeaDragonAsset();
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) return;
      const data = await Skia!.Data.fromURI(uri);
      const image = data ? Skia!.Image.MakeImageFromEncoded(data) : null;
      if (image) setSkiaImage(SEA_DRAGON_SPRITE_ID, image);
    } catch {
      // Asset pipeline unavailable (headless / tests): keep the fallback silhouette.
    }
  })();
  return skiaLoadPromise;
}

// ---------------------------------------------------------------------------
// Procedural fallback silhouette (shared geometry, two backend painters)
// ---------------------------------------------------------------------------

/**
 * Palette of the Aquí hay dragones art bible (§4.1), shared from the theme
 * concept pack so renderers never hardcode color literals.
 */
export const SEA_DRAGON_FALLBACK_PALETTE = {
  ink: AQUI_HAY_DRAGONES_PALETTE.ink,
  red: AQUI_HAY_DRAGONES_PALETTE.red,
  teal: AQUI_HAY_DRAGONES_PALETTE.teal,
  gold: AQUI_HAY_DRAGONES_PALETTE.gold,
} as const;

interface FallbackPath {
  /** Absolute points around the (0,0) entity origin, in logical units. */
  points: ReadonlyArray<readonly [number, number]>;
  closed: boolean;
  color: string;
  alpha: number;
  /** Stroke width in logical units; omitted = fill. */
  strokeWidth?: number;
}

/**
 * Minimal ink silhouette keeping the entity visible if the sheet cannot load.
 * Centered on the origin, ≈34 u long, same palette as the sprite.
 */
function buildSeaDragonFallbackGeometry(scaleX: number): FallbackPath[] {
  const s = Math.max(0.35, Math.min(scaleX, 2));
  const p = (x: number, y: number): readonly [number, number] => [x * s, y * s];
  return [
    {
      // Bat wing membrane (red wash)
      points: [p(6, -2), p(13, -11), p(8, -13), p(1, -10)],
      closed: true, color: SEA_DRAGON_FALLBACK_PALETTE.red, alpha: 0.6,
    },
    {
      // Wing fingers (ink strokes)
      points: [p(6, -1), p(13, -11)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.ink, alpha: 0.9, strokeWidth: 1.2,
    },
    {
      points: [p(6, -1), p(8, -13)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.ink, alpha: 0.9, strokeWidth: 1.2,
    },
    {
      points: [p(6, -1), p(1, -10)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.ink, alpha: 0.9, strokeWidth: 1,
    },
    {
      // Serpentine body: sweep tail -> head in two ink strokes
      points: [p(-16, -1), p(-9, 3), p(-2, 0), p(6, 2)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.ink, alpha: 1, strokeWidth: 4.6,
    },
    {
      // Belly wash (teal)
      points: [p(-13, 3), p(2, 3.4)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.teal, alpha: 0.55, strokeWidth: 1.6,
    },
    {
      // Head wedge
      points: [p(11, 0), p(15, -2.4), p(17, -1.2), p(15, 1.6)], closed: true, color: SEA_DRAGON_FALLBACK_PALETTE.ink, alpha: 1,
    },
    {
      // Horns (gold)
      points: [p(14, -2.6), p(11.4, -5.6)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.gold, alpha: 1, strokeWidth: 1.2,
    },
    {
      points: [p(13.2, -2.2), p(12.2, -6.2)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.gold, alpha: 1, strokeWidth: 1.2,
    },
    {
      // Whisker (gold)
      points: [p(16.6, -1), p(13.4, -4.4)], closed: false, color: SEA_DRAGON_FALLBACK_PALETTE.gold, alpha: 0.85, strokeWidth: 0.9,
    },
    {
      // Tail fin (gold)
      points: [p(-16, -1), p(-19.5, -3.4), p(-18.6, 1.4)], closed: true, color: SEA_DRAGON_FALLBACK_PALETTE.gold, alpha: 0.95,
    },
  ];
}

/** Uniform size → scale mapping; the same fórmula drives the fallback silhouette. */
function fallbackScaleFor(render: RenderComponent): number {
  return Math.max(0.35, Math.min((render.size ?? SEA_DRAGON_BASE_SIZE) / SEA_DRAGON_BASE_SIZE, 2));
}

function drawSeaDragonFallbackCanvas(ctx: CanvasRenderingContext2D, render: RenderComponent): void {
  const scale = fallbackScaleFor(render);
  const baseAlpha = Math.max(0, Math.min(1, render.opacity));
  ctx.save();
  for (const path of buildSeaDragonFallbackGeometry(scale)) {
    if (path.points.length < 2) continue;
    ctx.globalAlpha = baseAlpha * path.alpha;
    ctx.beginPath();
    ctx.moveTo(path.points[0][0], path.points[0][1]);
    for (const [x, y] of path.points.slice(1)) ctx.lineTo(x, y);
    if (path.closed) ctx.closePath();
    if (path.strokeWidth !== undefined) {
      ctx.lineWidth = path.strokeWidth;
      ctx.strokeStyle = path.color;
      ctx.stroke();
    } else {
      ctx.fillStyle = path.color;
      ctx.fill();
    }
  }
  // Gold eye, drawn beside the head wedge
  ctx.globalAlpha = baseAlpha;
  ctx.fillStyle = SEA_DRAGON_FALLBACK_PALETTE.gold;
  ctx.fillRect(13.4 * scale, -2.4 * scale, 1.2 * scale, 1.2 * scale);
  ctx.restore();
}

function drawSkiaSeaDragonFallback(canvas: SkCanvas, render: RenderComponent): void {
  if (!Skia) return;
  const scale = fallbackScaleFor(render);
  const maxAlpha = Math.max(0, Math.min(1, render.opacity));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.save();
  for (const path of buildSeaDragonFallbackGeometry(scale)) {
    if (path.points.length < 2) continue;
    const skPath = Skia.Path.Make();
    skPath.moveTo(path.points[0][0], path.points[0][1]);
    for (const [x, y] of path.points.slice(1)) skPath.lineTo(x, y);
    if (path.closed) skPath.close();
    paint.setAlphaf(Math.max(0, Math.min(1, path.alpha * maxAlpha)));
    paint.setColor(Skia.Color(path.color));
    if (path.strokeWidth !== undefined) {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(path.strokeWidth);
      canvas.drawPath(skPath, paint);
    } else {
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(skPath, paint);
    }
  }
  const eyePaint = Skia.Paint();
  eyePaint.setAntiAlias(true);
  eyePaint.setAlphaf(Math.max(0, Math.min(1, render.opacity)));
  eyePaint.setColor(Skia.Color(SEA_DRAGON_FALLBACK_PALETTE.gold));
  canvas.drawRect(Skia.XYWHRect(13.4 * scale, -2.4 * scale, 1.2 * scale, 1.2 * scale), eyePaint);
  canvas.restore();
}

// ---------------------------------------------------------------------------
// Canvas preload kick-off (one attempt per session; the shared drawer also
// reflexively retries on cache miss, so images always converge once decoded)
// ---------------------------------------------------------------------------

let canvasPreloadStarted = false;

function kickOffCanvasPreload(): void {
  if (canvasPreloadStarted || typeof Image === "undefined") return;
  canvasPreloadStarted = true;
  preloadSpriteSheetCanvas(SEA_DRAGON_SPRITE_ID).catch(() => {
    canvasPreloadStarted = false;
  });
}

// ---------------------------------------------------------------------------
// ShapeDrawer implementations (entity-local space: the renderer has already
// translated to the entity transform, like every other Space Invaders drawer)
// ---------------------------------------------------------------------------

/** Reads the entity render flags used for drawing; null while unusable. */
function readRender(world: World<SpaceInvadersComponentRegistry>, entity: number): RenderComponent | null {
  const render = world.getComponent(entity, "Render");
  if (!render || !render.visible) return null;
  return render;
}

export const drawSeaDragonSpriteCanvas: ShapeDrawer<
  CanvasRenderingContext2D,
  SpaceInvadersComponentRegistry
> = {
  draw(ctx, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const state = getAnimatorState(world);
    const animator = advanceSeaDragonAnimation(state, render, world.tick);
    if (isCanvasSpriteReady(SEA_DRAGON_SPRITE_ID)) {
      drawSpriteCanvas(ctx, animator, 0, 0, {
        anchor: "center",
        opacity: render.opacity,
      });
      return;
    }
    // Browser asset still decoding (or headless): start the load and stay visible.
    kickOffCanvasPreload();
    drawSeaDragonFallbackCanvas(ctx, render);
  },
};

export const drawSkiaSeaDragonSprite: ShapeDrawer<
  SkCanvas,
  SpaceInvadersComponentRegistry
> = {
  draw(canvas, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const state = getAnimatorState(world);
    const animator = advanceSeaDragonAnimation(state, render, world.tick);
    void preloadSeaDragonSkiaImage();
    if (!getSkiaImage(SEA_DRAGON_SPRITE_ID)) {
      drawSkiaSeaDragonFallback(canvas, render);
      return;
    }
    drawSpriteSkia(canvas, animator, 0, 0, undefined, {
      anchor: "center",
      opacity: render.opacity,
    });
  },
};

/** Convenience pair for NauticalMod.registerDrawers / initializeRenderer hooks. */
export const SEA_DRAGON_DRAWERS = {
  canvas: drawSeaDragonSpriteCanvas,
  skia: drawSkiaSeaDragonSprite,
} as const;
