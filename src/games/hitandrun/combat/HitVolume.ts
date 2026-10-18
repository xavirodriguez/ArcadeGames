import type { World, CoreComponentRegistry, Entity } from "@tiny-aster/core";
import type { BeltElevationComponent } from "../belt/BeltElevationComponent";

export interface DepthZOverlapOptions {
  halfDepth?: number;
  attackerZHeight?: number;
  targetZHeight?: number;
}

/** Default belt depth tolerance — lanes span ~280–520; 60px covers adjacent lanes. */
export const DEFAULT_HALF_DEPTH = 60;

/**
 * Pure function that evaluates belt-scroll depth (Y) and elevation height (Z)
 * collision eligibility between attacker and target entities.
 *
 * Rule 1: Depth difference |yAttacker - yTarget| must be <= halfDepth.
 * Rule 2: Elevation height ranges must overlap.
 */
export function depthZOverlap(
  attacker: Entity,
  target: Entity,
  world: World<CoreComponentRegistry>,
  options: DepthZOverlapOptions = {}
): boolean {
  const halfDepth = options.halfDepth ?? DEFAULT_HALF_DEPTH;

  const tAttacker = world.getComponent(attacker, "Transform");
  const tTarget = world.getComponent(target, "Transform");

  if (!tAttacker || !tTarget) return false;

  const yAttacker = tAttacker.worldY ?? tAttacker.y;
  const yTarget = tTarget.worldY ?? tTarget.y;

  if (Math.abs(yAttacker - yTarget) > halfDepth) {
    return false;
  }

  const eAttacker = world.getComponent(attacker, "BeltElevation") as
    | BeltElevationComponent
    | undefined;
  const eTarget = world.getComponent(target, "BeltElevation") as
    | BeltElevationComponent
    | undefined;

  const zA = eAttacker?.z ?? 0;
  const zB = eTarget?.z ?? 0;

  const heightA = options.attackerZHeight ?? 28;
  let heightB = options.targetZHeight;
  if (heightB === undefined) {
    const renderTarget = world.getComponent(target, "Render");
    heightB = renderTarget?.size ?? 24;
  }

  const zMinA = zA;
  const zMaxA = zA + heightA;
  const zMinB = zB;
  const zMaxB = zB + heightB;

  const maxMin = Math.max(zMinA, zMinB);
  const minMax = Math.min(zMaxA, zMaxB);

  return maxMin <= minMax;
}
