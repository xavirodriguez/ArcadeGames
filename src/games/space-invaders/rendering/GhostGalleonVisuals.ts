/**
 * Ghost galleon drawers for Space Invaders Nautical mod (bonus ship / UFO).
 * Sheet id: ghost_galleon (SpriteRegistry). Animations: sail / hit / death.
 */
import type { Asset } from "expo-asset";
import type { RenderComponent, ShapeDrawer, World } from "@tiny-aster/core";
import type { SkCanvas } from "../../shared/rendering/SkiaContext";
import {
  createSpriteAnimator,
  drawSpriteCanvas,
  drawSpriteSkia,
  getSkiaImage,
  isCanvasSpriteReady,
  playAnimation,
  preloadSpriteSheetCanvas,
  setSkiaImage,
  updateSpriteAnimator,
  type SpriteAnimatorComponent,
} from "../../shared/sprites";
import type { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { AQUI_HAY_DRAGONES_PALETTE } from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";

export const GHOST_GALLEON_SPRITE_ID = "ghost_galleon";
export const GHOST_GALLEON_SHAPE = "ghost_galleon";
export const GHOST_GALLEON_SECONDS_PER_TICK = 1 / 60;
export const GHOST_GALLEON_BASE_SIZE = 15;
const MAX_ANIMATION_STEP_SECONDS = 0.2;

export function getGhostGalleonAssetModule() {
  return require("../../../../assets/sprites/enemies/ghost_galleon.png");
}

export function createGhostGalleonAsset(): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(getGhostGalleonAssetModule());
}

interface AnimatorState {
  animator: SpriteAnimatorComponent;
  lastTick: number;
}

const animatorStates = new WeakMap<World<SpaceInvadersComponentRegistry>, AnimatorState>();

function getAnimatorState(world: World<SpaceInvadersComponentRegistry>): AnimatorState {
  let state = animatorStates.get(world);
  if (!state) {
    state = {
      animator: createSpriteAnimator(GHOST_GALLEON_SPRITE_ID, "sail"),
      lastTick: world.tick,
    };
    animatorStates.set(world, state);
  }
  return state;
}

export function advanceGhostGalleonAnimation(
  state: AnimatorState,
  render: RenderComponent | undefined,
  tick: number
): SpriteAnimatorComponent {
  const clampedTick = Math.max(tick, state.lastTick);
  const dt = Math.min(
    MAX_ANIMATION_STEP_SECONDS,
    (clampedTick - state.lastTick) * GHOST_GALLEON_SECONDS_PER_TICK
  );
  updateSpriteAnimator(state.animator, dt);
  const flashing = render !== undefined && render.hitFlashFrames > 0;
  if (flashing && state.animator.currentAnim !== "hit") {
    playAnimation(state.animator, "hit");
  } else if (!flashing && state.animator.currentAnim === "hit") {
    playAnimation(state.animator, "sail");
  }
  state.lastTick = tick;
  return state.animator;
}

let skiaLoadPromise: Promise<void> | undefined;
export function preloadGhostGalleonSkiaImage(): Promise<void> {
  if (skiaLoadPromise) return skiaLoadPromise;
  if (getSkiaImage(GHOST_GALLEON_SPRITE_ID)) return Promise.resolve();
  skiaLoadPromise = (async () => {
    try {
      const { Skia } = require("@shopify/react-native-skia") as {
        Skia?: { Data: { fromURI: (u: string) => Promise<unknown> }; Image: { MakeImageFromEncoded: (d: unknown) => unknown } };
      };
      if (!Skia) return;
      const asset = createGhostGalleonAsset();
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) return;
      const data = await Skia.Data.fromURI(uri);
      const image = data ? Skia.Image.MakeImageFromEncoded(data) : null;
      if (image) setSkiaImage(GHOST_GALLEON_SPRITE_ID, image as never);
    } catch {
      /* headless / tests */
    }
  })();
  return skiaLoadPromise;
}

function drawFallbackCanvas(ctx: CanvasRenderingContext2D, render: RenderComponent): void {
  const s = Math.max(8, (render.size ?? GHOST_GALLEON_BASE_SIZE) * 0.9);
  ctx.fillStyle = AQUI_HAY_DRAGONES_PALETTE.ink;
  ctx.globalAlpha = render.opacity ?? 1;
  ctx.fillRect(-s, -s * 0.35, s * 2, s * 0.7);
  ctx.fillStyle = AQUI_HAY_DRAGONES_PALETTE.red;
  ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.15, s * 0.55);
  ctx.globalAlpha = 1;
}

let canvasPreloadStarted = false;
function kickOffCanvasPreload(): void {
  if (canvasPreloadStarted || typeof Image === "undefined") return;
  canvasPreloadStarted = true;
  preloadSpriteSheetCanvas(GHOST_GALLEON_SPRITE_ID).catch(() => {
    canvasPreloadStarted = false;
  });
}

function readRender(
  world: World<SpaceInvadersComponentRegistry>,
  entity: number
): RenderComponent | null {
  const render = world.getComponent(entity, "Render");
  if (!render || !render.visible) return null;
  return render;
}

export const drawGhostGalleonSpriteCanvas: ShapeDrawer<
  CanvasRenderingContext2D,
  SpaceInvadersComponentRegistry
> = {
  draw(ctx, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const state = getAnimatorState(world);
    const animator = advanceGhostGalleonAnimation(state, render, world.tick);
    if (isCanvasSpriteReady(GHOST_GALLEON_SPRITE_ID)) {
      drawSpriteCanvas(ctx, animator, 0, 0, { anchor: "center", opacity: render.opacity });
      return;
    }
    kickOffCanvasPreload();
    drawFallbackCanvas(ctx, render);
  },
};

export const drawSkiaGhostGalleonSprite: ShapeDrawer<
  SkCanvas,
  SpaceInvadersComponentRegistry
> = {
  draw(canvas, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const state = getAnimatorState(world);
    const animator = advanceGhostGalleonAnimation(state, render, world.tick);
    void preloadGhostGalleonSkiaImage();
    if (!getSkiaImage(GHOST_GALLEON_SPRITE_ID)) return;
    drawSpriteSkia(canvas, animator, 0, 0, undefined, {
      anchor: "center",
      opacity: render.opacity,
    });
  },
};

export const GHOST_GALLEON_DRAWERS = {
  canvas: drawGhostGalleonSpriteCanvas,
  skia: drawSkiaGhostGalleonSprite,
} as const;
