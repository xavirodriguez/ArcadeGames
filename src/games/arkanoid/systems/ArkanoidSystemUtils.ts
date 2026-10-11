import { World, WorldUtils, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidStateComponent } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

export interface ArkanoidSystemContext {
  state?: ArkanoidStateComponent;
  config: ArkanoidConfig;
}

/**
 * Resolves shared system context for Arkanoid systems.
 * Returns undefined if paused.
 * @public
 */
export function resolveArkanoidSystemContext(
  world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
  requireActiveState = true
): ArkanoidSystemContext | undefined {
  if (world.getResource("IsPaused") === true) return undefined;

  const state = world.getSingleton("ArkanoidState");
  if (requireActiveState && (!state || state.isGameOver)) return undefined;

  const config =
    world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

  return { state, config };
}

/**
 * Iterates active collisions for an entity, executing callback for each active target entity.
 * @public
 */
export function forEachActiveCollision(
  world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
  entity: Entity,
  callback: (other: Entity) => void | boolean
): void {
  const events = world.getComponent(entity, "CollisionEvents");
  if (!events) return;

  for (let i = 0; i < events.collisions.length; i++) {
    const other = events.collisions[i].otherEntity;
    if (!WorldUtils.isEntityActive(world, other)) continue;

    const stop = callback(other);
    if (stop === true) break;
  }
}
