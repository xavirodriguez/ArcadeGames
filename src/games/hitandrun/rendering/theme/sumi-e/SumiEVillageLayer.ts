/**
 * Sumi-e foreground settlement props.
 *
 * The nearest settlement silhouette reuses the shared tower artwork. Far and
 * middle distance remain owned by SumiETheme's procedural ink-wash parallax.
 * These props are deterministic presentation-only elements, not ECS entities.
 */
import { SpriteRegistry } from "../../../../shared/sprites/SpriteRegistry";
import { drawSpriteCanvas, preloadSpriteSheetCanvas } from "../../../../shared/sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../../../shared/sprites/SpriteAnimator";

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
let towerLoadRequested = false;

const TOWER_SPRITE: SpriteAnimatorComponent = {
  sheetId: "tower_basic_art",
  currentAnim: "idle",
  frameIndex: 0,
  timer: 0,
  flipX: false,
  scale: 1
};

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

/** Draw shared tower art as a foreground landmark; procedural distance layers stay untouched. */
export function drawSumiEVillageLayer(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): void {
  if (!towerLoadRequested) {
    towerLoadRequested = true;
    SpriteRegistry.init();
    void preloadSpriteSheetCanvas("tower_basic_art").catch(() => {
      // The backdrop remains usable if the optional sprite cannot be decoded.
    });
  }

  const placements = getSumiEVillageHousePlacements(viewportWidth, viewportHeight, cameraX);
  for (const prop of placements) {
    if (prop.x < -130 || prop.x > viewportWidth + 130) continue;
    ctx.save();
    ctx.globalAlpha *= prop.alpha;
    // The full-image tower artwork is centered; keep a modest foreground scale.
    TOWER_SPRITE.scale = prop.scale;
    drawSpriteCanvas(ctx, TOWER_SPRITE, prop.x, prop.baselineY, { anchor: "center", opacity: prop.alpha });
    ctx.restore();
  }
}
