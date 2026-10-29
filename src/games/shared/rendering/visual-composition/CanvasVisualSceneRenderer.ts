import type { ResolvedVisualInstance, ResolvedVisualScene, VisualCoordinateSpace } from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import { drawSpriteCanvas, preloadSpriteSheetCanvas } from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";

export interface CanvasVisualSceneCamera {
  readonly x: number;
  readonly y: number;
}

/** Maps declarative anchors to the shared sprite drawer's supported anchors. */
function spriteAnchor(anchor: ResolvedVisualInstance["anchor"]): "center" | "feet" {
  return anchor === "center" ? "center" : "feet";
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

/**
 * Draws the renderer-neutral scene IR using the existing sprite registry and
 * shared Canvas drawer. This adapter does not own image caches or ECS state.
 * Returns false if the sprite sheet is not registered; the shared drawer keeps
 * its existing asynchronous preload behavior for registered sheets.
 */
export function drawResolvedVisualSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ResolvedVisualScene,
  camera: CanvasVisualSceneCamera
): boolean {
  let complete = true;
  for (const instance of scene.instances) {
    const sheet = SpriteRegistry.get(instance.asset);
    if (!sheet) {
      complete = false;
      continue;
    }
    const point = getCanvasVisualPosition(instance, camera);
    const animator: SpriteAnimatorComponent = {
      sheetId: instance.asset,
      currentAnim: "idle",
      frameIndex: 0,
      timer: 0,
      flipX: instance.flipX,
      scale: 1
    };
    ctx.save();
    ctx.translate(point.x, point.y);
    if (instance.rotation !== 0) ctx.rotate(instance.rotation);
    if (instance.scale.x !== instance.scale.y) {
      ctx.scale(instance.scale.x, instance.scale.y);
    } else {
      animator.scale = instance.scale.x;
    }
    const drawn = drawSpriteCanvas(ctx, animator, 0, 0, {
      anchor: spriteAnchor(instance.anchor),
      opacity: instance.opacity
    });
    ctx.restore();
    if (!drawn) complete = false;
  }
  return complete;
}

/** Explicit preload helper; asset loading remains owned by SpriteDrawer. */
export async function preloadResolvedVisualSceneCanvas(scene: ResolvedVisualScene): Promise<void> {
  const ids = [...new Set(scene.instances.map(instance => instance.asset))];
  await Promise.all(ids.map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetCanvas(id);
  }));
}
