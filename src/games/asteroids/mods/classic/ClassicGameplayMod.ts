import type { AsteroidsGameplayMod } from "../gameplayTypes";
import { spawnLayeredExplosion } from "../../../shared/rendering/SharedVFX";

/** Classic keeps the existing explosion feedback and does not override asteroid geometry. */
export const classicGameplayMod: AsteroidsGameplayMod = {
  id: "classic",

  spawnDestructionEffect(world, x, y, size) {
    const explosionType = size === "ship" ? "ship" : size === "large" ? "enemy" : "small";
    spawnLayeredExplosion(world, x, y, { type: explosionType });
  }
};
