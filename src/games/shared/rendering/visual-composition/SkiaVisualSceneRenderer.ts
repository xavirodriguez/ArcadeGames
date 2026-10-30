import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import type { ResolvedVisualInstance, ResolvedVisualScene, VisualPoint } from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import {
  drawSpriteSkia,
  getSkiaSpriteLoadState,
  preloadSpriteSheetSkia
} from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";
import {
  forEachVisualSceneDrawItem,
  getVisualSceneAssetIds
} from "./VisualSceneDrawPlan";
import { getVisualPosition, type VisualSceneCamera, type VisualSceneViewportOffset } from "./VisualSceneTransform";

export type SkiaVisualSceneCamera = VisualSceneCamera;
export type SkiaVisualSceneOffset = VisualSceneViewportOffset;

export function getSkiaVisualPosition(
  instance: Pick<ResolvedVisualInstance, "position" | "space" | "parallaxFactor">,
  camera: SkiaVisualSceneCamera,
  viewportOffset: SkiaVisualSceneOffset = { x: 0, y: 0 }
): VisualPoint {
  return getVisualPosition(instance, camera, viewportOffset);
}

export function drawResolvedVisualSceneSkia(
  canvas: SkCanvas,
  scene: ResolvedVisualScene,
  camera: SkiaVisualSceneCamera,
  viewportWidth: number,
  _viewportHeight: number,
  viewportOffset: SkiaVisualSceneOffset = { x: 0, y: 0 },
  paint?: SkPaint
): boolean {
  return forEachVisualSceneDrawItem(
    scene, camera, viewportOffset, viewportWidth, item => {
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
      canvas.save();
      canvas.translate(item.position.x, item.position.y);
      if (item.rotation !== 0) canvas.rotate(item.rotation * 180 / Math.PI, 0, 0);
      if (item.scaleX !== item.scaleY) canvas.scale(item.scaleX, item.scaleY);
      const drawn = drawSpriteSkia(canvas, animator, 0, 0, paint, {
        destinationAnchor: item.anchor,
        opacity: item.opacity
      });
      canvas.restore();
      return drawn && getSkiaSpriteLoadState(item.assetId) === "ready";
    }
  );
}

/** Preload static and repeated-scene assets into Skia's existing image cache. */
export async function preloadResolvedVisualSceneSkia(scene: ResolvedVisualScene): Promise<void> {
  await Promise.all(getVisualSceneAssetIds(scene).map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetSkia(id);
  }));
}
