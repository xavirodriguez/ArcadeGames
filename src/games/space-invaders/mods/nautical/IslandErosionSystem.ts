import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../../types/SpaceInvadersTypes";

/**
 * Island erosion phases for shield_block when nautical theme is active.
 * Visual scale + alpha follow remaining HP ratio (art bible: islands erode on hits).
 */
export type IslandErosionPhase = "intact" | "chipped" | "cracked" | "sinking" | "gone";

export function islandPhaseFromRatio(ratio: number): IslandErosionPhase {
  if (ratio <= 0) return "gone";
  if (ratio < 0.25) return "sinking";
  if (ratio < 0.5) return "cracked";
  if (ratio < 0.85) return "chipped";
  return "intact";
}

export function islandVisualScale(ratio: number): number {
  return 0.55 + 0.45 * Math.max(0, Math.min(1, ratio));
}

export function islandVisualAlpha(ratio: number): number {
  return 0.35 + 0.65 * Math.max(0, Math.min(1, ratio));
}

/**
 * Marks shield entities with visual erosion (opacity/size/visibility) when registered by NauticalMod.
 */
export class IslandErosionSystem extends System<SpaceInvadersComponentRegistry> {
  public update(
    world: World<SpaceInvadersComponentRegistry>,
    _deltaTime: number
  ): void {
    for (const entity of world.query("Shield")) {
      const shield = world.getComponent(entity, "Shield");
      if (!shield) continue;
      const maxHp = shield.maxHp || 1;
      const ratio = Math.max(0, (shield.hp ?? 0) / maxHp);
      const phase = islandPhaseFromRatio(ratio);
      const render = world.getComponent(entity, "Render");
      if (render) {
        const scale = islandVisualScale(ratio);
        const alpha = islandVisualAlpha(ratio);
        world.mutateComponent(entity, "Render", (r) => {
          if (phase === "gone") {
            r.opacity = 0;
            r.visible = false;
          } else {
            r.opacity = alpha;
            r.visible = true;
            if (typeof (r as { scale?: number }).scale === "number") {
              (r as { scale?: number }).scale = scale;
            }
            const baseSize = (r as { _islandBaseSize?: number })._islandBaseSize;
            if (baseSize == null && typeof r.size === "number") {
              (r as { _islandBaseSize?: number })._islandBaseSize = r.size;
            }
            const base = (r as { _islandBaseSize?: number })._islandBaseSize ?? r.size ?? 15;
            r.size = base * scale;
          }
        });
      }
    }
  }
}
