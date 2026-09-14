import { World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";

export function shouldSkipFroggerRenderDueToInvulnerability(
  world: World<FroggerComponentRegistry>,
  entity: number
): boolean {
  const frogger = world.getComponent(entity, "Frogger");
  const health = world.getComponent(entity, "Health");
  const isInvulnerable =
    (frogger?.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) ||
    (health?.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0);

  return isInvulnerable && Math.floor(world.tick / 3) % 2 === 0;
}

export function isFroggerInvulnerable(
  world: World<FroggerComponentRegistry>,
  entity: number
): boolean {
  const frogger = world.getComponent(entity, "Frogger");
  const health = world.getComponent(entity, "Health");
  return (
    (frogger?.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) ||
    (health?.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0)
  );
}
