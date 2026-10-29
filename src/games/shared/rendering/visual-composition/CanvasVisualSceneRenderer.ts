import type { ResolvedVisualInstance, ResolvedVisualScene, VisualCoordinateSpace } from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import { drawSpriteCanvas, getSpriteLogicalSize, preloadSpriteSheetCanvas } from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";

export interface CanvasVisualSceneCamera {
  readonly x: number;
  readonly y: number;
}

function cameraFactor(space: VisualCoordinateSpace, parallaxFactor?: number): number {
  if (space === "screen") return 0;
  if (space === "world") return 1;
  return parallaxFactor ?? 0;
}

/** Resolve scene-space coordinates to Canvas viewport coordinates. */
export function getCanvasVisualPosition(
  instance: Pick<ResolvedVisualInstance, "position" | "space" | "parallaxFactor">,
  camera: CanvasVisualSceneCamera
): { x: number; y: number } {
  const factor = cameraFactor(instance.space, instance.parallaxFactor);
  return {
    x: instance.position.x - camera.x * factor,
    y: instance.position.y - camera.y * factor
  };
}

/** Honor semantic anchors while reusing the shared sprite drawer. */
function getDrawPoint(
  instance: ResolvedVisualInstance,
  point: { x: number; y: number }
): { x: number; y: number; anchor: "center" | "feet" } {
  if (instance.anchor === "bottom-center") return { ...point, anchor: "feet" };
  if (instance.anchor === "center") return { ...point, anchor: "center" };
  const size = getSpriteLogicalSize(instance.asset);
  if (!size) return { ...point, anchor: "center" };
  return {
    x: point.x + size.w * instance.scale.x * 0.5,
    y: point.y + size.h * instance.scale.y * 0.5,
    anchor: "center"
  };
}

/**
 * Draws the renderer-neutral scene IR using the existing sprite registry and
 * shared Canvas drawer. This adapter does not own image caches or ECS state.
 * Returns false if a sprite is unregistered or not yet decoded.
 */
export function drawResolvedVisualSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ResolvedVisualScene,
  camera: CanvasVisualSceneCamera
): boolean {
  let complete = true;
  for (const instance of scene.instances) {
    if (!SpriteRegistry.has(instance.asset)) {
      complete = false;
      continue;
    }
    const point = getCanvasVisualPosition(instance, camera);
    const target = getDrawPoint(instance, point);
    const animator: SpriteAnimatorComponent = {
      sheetId: instance.asset,
      currentAnim: "idle",
      frameIndex: 0,
      timer: 0,
      flipX: instance.flipX,
      scale: instance.scale.x === instance.scale.y ? instance.scale.x : 1
    };
    ctx.save();
    ctx.translate(target.x, target.y);
    if (instance.rotation !== 0) ctx.rotate(instance.rotation);
    if (instance.scale.x !== instance.scale.y) ctx.scale(instance.scale.x, instance.scale.y);
    const drawn = drawSpriteCanvas(ctx, animator, 0, 0, {
      anchor: target.anchor,
      opacity: instance.opacity
    });
    ctx.restore();
    if (!drawn) complete = false;
  }
  return complete;
}

/** Preload via the existing SpriteDrawer cache; this adapter owns no cache. */
export async function preloadResolvedVisualSceneCanvas(scene: ResolvedVisualScene): Promise<void> {
  const ids = [...new Set(scene.instances.map(instance => instance.asset))];
  await Promise.all(ids.map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetCanvas(id);
  }));
}
