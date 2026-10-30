/**
 * Sumi-e settlement props.
 * Repeated positions come from the renderer-neutral scene IR and current camera.
 */
import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import type { ResolvedVisualScene } from "../../../../shared/rendering/visual-composition";
import { resolveVisualScene } from "../../../../shared/rendering/visual-composition";
import {
  drawResolvedVisualSceneCanvas,
  preloadResolvedVisualSceneCanvas
} from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import {
  drawResolvedVisualSceneSkia,
  preloadResolvedVisualSceneSkia
} from "../../../../shared/rendering/visual-composition/SkiaVisualSceneRenderer";
import { createSumiEVillageCatalog, SUMI_E_VILLAGE_COMPOSITION } from "./SumiEVillageComposition";

let resolvedVillage: ResolvedVisualScene | null = null;
let villageResolutionAttempted = false;
let canvasPreloadRequested = false;
let skiaPreloadRequested = false;

function getResolvedVillage(): ResolvedVisualScene | null {
  if (villageResolutionAttempted) return resolvedVillage;
  villageResolutionAttempted = true;
  const result = resolveVisualScene(SUMI_E_VILLAGE_COMPOSITION, createSumiEVillageCatalog());
  if (!result.ok) {
    console.error("[HitRun/SumiE] Invalid village composition", result.issues);
    return null;
  }
  resolvedVillage = result.value;
  return resolvedVillage;
}

function getViewportOffset(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  return {
    x: (viewportWidth - 800) * 0.5,
    y: viewportHeight - 600
  };
}

export interface SumiEVillageHousePlacement {
  scale: number;
  alpha: number;
  depth: number;
  x: number;
  y: number;
}

/** Legacy helper exported for unit test compatibility. */
export function getSumiEVillageHousePlacements(
  _viewportWidth: number,
  _viewportHeight: number,
  cameraX: number
): SumiEVillageHousePlacement[] {
  const scene = getResolvedVillage();
  if (!scene) return [];
  const placements: SumiEVillageHousePlacement[] = [];
  const baseDepths = [0.18, 0.36, 0.58];
  const baseScales = [0.34, 0.52, 0.72];

  scene.repeaters?.forEach((repeater, index) => {
    const scale = baseScales[index] ?? repeater.scale.x;
    const depth = baseDepths[index] ?? (repeater.space === "parallax" ? repeater.parallaxFactor ?? 0.36 : 0.36);
    const count = 4;
    for (let i = 0; i < count; i++) {
      const x = repeater.start.x + i * repeater.spacing - cameraX * depth;
      placements.push({
        scale,
        alpha: repeater.opacity,
        depth,
        x,
        y: repeater.start.y
      });
    }
  });

  return placements;
}

/** Draw repeated scenery using the shared Canvas sprite cache. */
export function drawSumiEVillageLayer(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): void {
  const scene = getResolvedVillage();
  if (!scene) return;
  if (!canvasPreloadRequested) {
    canvasPreloadRequested = true;
    void preloadResolvedVisualSceneCanvas(scene).catch(() => {
      // Keep the procedural ink-wash backdrop visible when optional art fails.
    });
  }
  drawResolvedVisualSceneCanvas(
    ctx,
    scene,
    { x: cameraX, y: 0 },
    getViewportOffset(viewportWidth, viewportHeight),
    { width: viewportWidth, height: viewportHeight }
  );
}

/** Native Skia equivalent; Canvas image objects never cross this boundary. */
export function drawSumiEVillageLayerSkia(
  canvas: SkCanvas,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  paint?: SkPaint
): void {
  const scene = getResolvedVillage();
  if (!scene) return;
  if (!skiaPreloadRequested) {
    skiaPreloadRequested = true;
    void preloadResolvedVisualSceneSkia(scene).catch(() => {
      // Keep the native procedural backdrop visible when optional art fails.
    });
  }
  drawResolvedVisualSceneSkia(
    canvas,
    scene,
    { x: cameraX, y: 0 },
    viewportWidth,
    viewportHeight,
    getViewportOffset(viewportWidth, viewportHeight),
    paint
  );
}
