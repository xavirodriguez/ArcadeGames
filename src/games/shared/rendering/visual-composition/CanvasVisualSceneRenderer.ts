import type { ResolvedVisualInstance, ResolvedVisualScene, VisualCoordinateSpace } from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import { drawSpriteCanvas, getCanvasSpriteLoadState, preloadSpriteSheetCanvas } from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";

export interface CanvasVisualSceneCamera {
  /** Camera origin in world coordinates. */
  readonly x: number;
  readonly y: number;
  /** Uniform world zoom; screen-space props are not zoomed. */
  readonly zoom?: number;
  /** Final viewport-pixel translation, applied after world zoom. */
  readonly visualOffsetX?: number;
  readonly visualOffsetY?: number;
}

export interface CanvasVisualSceneOffset { readonly x: number; readonly y: number }

function cameraFactor(space: VisualCoordinateSpace, parallaxFactor?: number): number {
  if (space === "screen") return 0;
  if (space === "world") return 1;
  return parallaxFactor ?? 0;
}

/** Resolve scene-space coordinates to Canvas viewport coordinates. */
export function getCanvasVisualPosition(
  instance: Pick<ResolvedVisualInstance, "position" | "space" | "parallaxFactor">,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 }
): { x: number; y: number } {
  const zoom = camera.zoom ?? 1;
  const factor = cameraFactor(instance.space, instance.parallaxFactor);
  const offsetX = (camera.visualOffsetX ?? 0) + viewportOffset.x;
  const offsetY = (camera.visualOffsetY ?? 0) + viewportOffset.y;
  if (instance.space === "screen") return { x: instance.position.x + offsetX, y: instance.position.y + offsetY };
  return {
    x: (instance.position.x - camera.x * factor) * zoom + offsetX,
    y: (instance.position.y - camera.y * factor) * zoom + offsetY
  };
}

/** Draw through the existing registry/drawer; this adapter never owns resources. */
export function drawResolvedVisualSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ResolvedVisualScene,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 }
): boolean {
  let complete = true;
  const zoom = camera.zoom ?? 1;
  for (const instance of scene.instances) {
    if (!SpriteRegistry.has(instance.asset)) { complete = false; continue; }
    const point = getCanvasVisualPosition(instance, camera, viewportOffset);
    const screenSpace = instance.space === "screen";
    const scaleX = instance.scale.x * (screenSpace ? 1 : zoom);
    const scaleY = instance.scale.y * (screenSpace ? 1 : zoom);
    const animator: SpriteAnimatorComponent = {
      sheetId: instance.asset, currentAnim: "idle", frameIndex: 0, timer: 0,
      flipX: instance.flipX, scale: scaleX === scaleY ? scaleX : 1
    };
    ctx.save();
    ctx.translate(point.x, point.y);
    if (instance.rotation !== 0) ctx.rotate(instance.rotation);
    if (scaleX !== scaleY) ctx.scale(scaleX, scaleY);
    const drawn = drawSpriteCanvas(ctx, animator, 0, 0, { destinationAnchor: instance.anchor, opacity: instance.opacity });
    ctx.restore();
    if (!drawn || getCanvasSpriteLoadState(instance.asset) !== "ready") complete = false;
  }
  return complete;
}

/** Preload via the existing SpriteDrawer cache; composition owns no resources. */
export async function preloadResolvedVisualSceneCanvas(scene: ResolvedVisualScene): Promise<void> {
  const ids = [...new Set(scene.instances.map(instance => instance.asset))];
  await Promise.all(ids.map(async id => { if (SpriteRegistry.has(id)) await preloadSpriteSheetCanvas(id); }));
}
