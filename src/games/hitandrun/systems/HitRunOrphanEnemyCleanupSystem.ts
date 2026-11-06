/**
 * Removes structurally invalid enemy leftovers without advancing wave state.
 *
 * A completed spawn script is not evidence that remaining enemies are orphans:
 * valid enemies must remain alive until defeated through the combat pipeline.
 */
import { System, World, CoreComponentRegistry } from "@tiny-aster/core";

function isPlayer(world: World<CoreComponentRegistry>, entity: number): boolean {
  return world.hasComponent(entity, "BeltInput") ||
    world.hasComponent(entity, "PlatformerInput");
}

function killInvalidEnemy(world: World<CoreComponentRegistry>, entity: number): void {
  const health = world.getMutableComponent(entity, "Health") as
    | { current: number }
    | undefined;
  if (health) health.current = 0;
  if (!world.hasComponent(entity, "Dead")) {
    world.getCommandBuffer().addComponent(entity, { type: "Dead" });
  }
}

export class HitRunOrphanEnemyCleanupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entities = world.query("Health");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (isPlayer(world, entity) || world.hasComponent(entity, "Dead")) continue;

      const hasEnemy = world.hasComponent(entity, "Enemy") ||
        ((world.getComponent(entity, "Tag") as { tags?: string[] } | undefined)
          ?.tags?.includes("Enemy") ?? false);
      const faction = world.getComponent(entity, "Faction") as
        | { value?: string; faction?: string }
        | undefined;
      const isEnemyFaction = (faction?.value ?? faction?.faction) === "enemy";
      if (!hasEnemy && !isEnemyFaction) continue;

      const health = world.getComponent(entity, "Health") as
        | { current?: number }
        | undefined;
      if (!health || (health.current ?? 0) <= 0) continue;

      // Render dimensions and hurtbox presence are not universal lifecycle
      // contracts. The cleanup only rejects entities that cannot participate
      // in the collision pipeline at all; archetype-specific validation belongs
      // with the archetype/blueprint that declares those requirements.
      const hasCollider = world.hasComponent(entity, "Collider2D");
      if (!hasCollider) killInvalidEnemy(world, entity);
    }
  }
}
