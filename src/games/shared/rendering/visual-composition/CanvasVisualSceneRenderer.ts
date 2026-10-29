import type { ResolvedVisualInstance, ResolvedVisualScene, VisualPoint } from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import {
  drawSpriteCanvas,
  getCanvasSpriteLoadState,
  preloadSpriteSheetCanvas
} from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";
import {
  forEachVisualSceneDrawItem,
  getVisualSceneAssetIds
} from "./VisualSceneDrawPlan";
import { getVisualPosition, type VisualSceneCamera, type VisualSceneViewportOffset } from "./VisualSceneTransform";

export type CanvasVisualSceneCamera = VisualSceneCamera;
export type CanvasVisualSceneOffset = VisualSceneViewportOffset;

/** Public compatibility helper; Canvas and Skia share the implementation. */
export function getCanvasVisualPosition(
  instance: Pick<ResolvedVisualInstance, "position" | "space" | "parallaxFactor">,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 }
): VisualPoint {
  return getVisualPosition(instance, camera, viewportOffset);
}

export function drawResolvedVisualSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ResolvedVisualScene,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 },
  viewportSize: { readonly width: number; readonly height: number } = {
    width: ctx.canvas.width,
    height: ctx.canvas.height
  }
): boolean {
  return forEachVisualSceneDrawItem(
    scene, camera, viewportOffset, viewportSize.width, item => {
      if (!SpriteRegistry.has(item.assetId)) return false;
      const scale = item.scaleX === item.scaleY ? item.scaleX : 1;
      const animator: SpriteAnimatorComponent = {
        sheetId: item.assetId,
        currentAnim: "idle",
        frameIndex: 0,
        timer: 0,
        flipX: item.flipX,
        scale
      };
      ctx.save();
      ctx.translate(item.position.x, item.position.y);
      if (item.rotation !== 0) ctx.rotate(item.rotation);
      if (item.scaleX !== item.scaleY) ctx.scale(item.scaleX, item.scaleY);
      const drawn = drawSpriteCanvas(ctx, animator, 0, 0, {
        destinationAnchor: item.anchor,
        opacity: item.opacity
      });
      ctx.restore();
      return drawn && getCanvasSpriteLoadState(item.assetId) === "ready";
    }
  );
}

/** Preload static and repeated-scene assets through the shared Canvas cache. */
export async function preloadResolvedVisualSceneCanvas(scene: ResolvedVisualScene): Promise<void> {
  await Promise.all(getVisualSceneAssetIds(scene).map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetCanvas(id);
  }));
}
