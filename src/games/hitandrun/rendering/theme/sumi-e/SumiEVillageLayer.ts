/**
 * Sumi-e foreground settlement props.
 *
 * The nearest settlement silhouette reuses the shared tower artwork. Far and
 * middle distance remain owned by SumiETheme's procedural ink-wash parallax.
 * These props are deterministic presentation-only elements, not ECS entities.
 */
import { resolveVisualScene } from "../../../../shared/rendering/visual-composition";
import { drawResolvedVisualSceneCanvas, preloadResolvedVisualSceneCanvas } from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import { createSumiEVillageCatalog, SUMI_E_VILLAGE_COMPOSITION } from "./SumiEVillageComposition";

export interface SumiEVillageHousePlacement {
  x: number;
  baselineY: number;
  scale: number;
  alpha: number;
  depth: number;
}

const VILLAGE_LAYERS = [
  { spacing: 520, offset: 90, depth: 0.18, scale: 0.34, alpha: 0.34 },
  { spacing: 430, offset: 240, depth: 0.36, scale: 0.52, alpha: 0.54 },
  { spacing: 360, offset: 170, depth: 0.58, scale: 0.72, alpha: 0.78 }
] as const;
let resolvedVillage: ResolvedVisualScene | null = null;
let villageLoadRequested = false;

function getResolvedVillage(): ResolvedVisualScene | null {
  if (resolvedVillage) return resolvedVillage;
  const result = resolveVisualScene(SUMI_E_VILLAGE_COMPOSITION, createSumiEVillageCatalog());
  if (!result.ok) return null;
  resolvedVillage = result.value;
  return resolvedVillage;
}

/** Pure placement calculation: stable across frames and independent of RNG. */
export function getSumiEVillageHousePlacements(
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): SumiEVillageHousePlacement[] {
  const placements: SumiEVillageHousePlacement[] = [];
  for (const layer of VILLAGE_LAYERS) {
    const scrollX = cameraX * layer.depth;
    const firstIndex = Math.floor((scrollX - layer.offset - 120) / layer.spacing);
    const lastIndex = Math.ceil((scrollX + viewportWidth - layer.offset + 120) / layer.spacing);
    for (let index = firstIndex; index <= lastIndex; index++) {
      placements.push({
        x: index * layer.spacing + layer.offset - scrollX,
        baselineY: viewportHeight * (0.56 + layer.depth * 0.22),
        scale: layer.scale,
        alpha: layer.alpha,
        depth: layer.depth
      });
    }
  }
  return placements;
}

/** Draw the fixed declarative pilot over the existing procedural ink-wash backdrop. */
export function drawSumiEVillageLayer(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): void {
  const scene = getResolvedVillage();
  if (!scene) return;

  if (!villageLoadRequested) {
    villageLoadRequested = true;
    void preloadResolvedVisualSceneCanvas(scene).catch(() => {
      // Keep the procedural backdrop available if optional sprite art fails.
    });
  }

  // Offset the fixed 800×600 authoring frame at draw time. Avoid allocating a
  // replacement scene and seven replacement instance objects on every frame.
  const viewportOffsetX = (viewportWidth - 800) * 0.5;
  const viewportOffsetY = viewportHeight - 600;
  drawResolvedVisualSceneCanvas(
    ctx,
    scene,
    { x: cameraX, y: 0 },
    { x: viewportOffsetX, y: viewportOffsetY }
  );
}
