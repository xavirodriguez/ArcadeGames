/**
 * Sumi-e foreground settlement props.
 *
 * The nearest settlement silhouette reuses the shared tower artwork. Far and
 * middle distance remain owned by SumiETheme's procedural ink-wash parallax.
 * These props are deterministic presentation-only elements, not ECS entities.
 */
import { resolveVisualScene, type ResolvedVisualScene } from "../../../../shared/rendering/visual-composition";
import { drawResolvedVisualSceneCanvas, preloadResolvedVisualSceneCanvas } from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import { createSumiEVillageCatalog, SUMI_E_VILLAGE_COMPOSITION } from "./SumiEVillageComposition";

export interface SumiEVillageHousePlacement {
  x: number;
  baselineY: number;
  scale: number;
  alpha: number;
  depth: number;
}

const FOREGROUND_SPACING = 360;
const FOREGROUND_OFFSET = 170;
const FOREGROUND_DEPTH = 0.58;
const FOREGROUND_SCALE = 0.19;
const FOREGROUND_ALPHA = 0.78;
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
  const scrollX = cameraX * FOREGROUND_DEPTH;
  const firstIndex = Math.floor((scrollX - FOREGROUND_OFFSET - 120) / FOREGROUND_SPACING);
  const lastIndex = Math.ceil((scrollX + viewportWidth - FOREGROUND_OFFSET + 120) / FOREGROUND_SPACING);
  const placements: SumiEVillageHousePlacement[] = [];

  for (let index = firstIndex; index <= lastIndex; index++) {
    placements.push({
      x: index * FOREGROUND_SPACING + FOREGROUND_OFFSET - scrollX,
      baselineY: viewportHeight * 0.69,
      scale: FOREGROUND_SCALE,
      alpha: FOREGROUND_ALPHA,
      depth: FOREGROUND_DEPTH
    });
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

  // The pilot uses a fixed 800×600 authoring canvas; adapt its origin to the
  // actual viewport while preserving authored spacing and camera parallax.
  const offsetX = (viewportWidth - 800) * 0.5;
  const offsetY = viewportHeight - 600;
  const viewportScene: ResolvedVisualScene = {
    ...scene,
    instances: scene.instances.map(instance => ({
      ...instance,
      position: { x: instance.position.x + offsetX, y: instance.position.y + offsetY }
    }))
  };
  drawResolvedVisualSceneCanvas(ctx, viewportScene, { x: cameraX, y: 0 });
}
