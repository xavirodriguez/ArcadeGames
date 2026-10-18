/**
 * Removes unhittable leftover "enemies" that keep the section gate locked.
 * Typical cases: deferred spawn ghosts, zero-size renders (white dots),
 * entities missing Collider2D / Hurtbox so melee and bullets never connect.
 */

import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";

function isPlayer(world: World<CoreComponentRegistry>, e: number): boolean {
  return (
    world.hasComponent(e, "BeltInput") || world.hasComponent(e, "PlatformerInput")
  );
}

export class HitRunOrphanEnemyCleanupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const withHealth = world.query("Health");
    for (let i = 0; i < withHealth.length; i++) {
      const e = withHealth[i];
      if (isPlayer(world, e)) continue;
      if (world.hasComponent(e, "Dead")) continue;

      const hasEnemy =
        world.hasComponent(e, "Enemy") ||
        ((world.getComponent(e, "Tag") as { tags?: string[] } | undefined)?.tags?.includes(
          "Enemy"
        ) ??
          false);

      const faction = world.getComponent(e, "Faction") as
        | { value?: string; faction?: string }
        | undefined;
      const isEnemyFaction =
        (faction?.value ?? faction?.faction) === "enemy";

      if (!hasEnemy && !isEnemyFaction) continue;

      const health = world.getComponent(e, "Health") as
        | { current?: number }
        | undefined;
      if (!health || (health.current ?? 0) <= 0) continue;

      const render = world.getComponent(e, "Render") as
        | { size?: number; visible?: boolean }
        | undefined;
      const size = render?.size ?? 0;
      const hasCollider = world.hasComponent(e, "Collider2D");
      const hasHurtbox = world.hasComponent(e, "Hurtbox");

      // White dots / broken spawns: tiny or missing hit geometry
      const isOrphan =
        !hasCollider ||
        size > 0 && size < 5 ||
        (hasEnemy && !hasHurtbox && size < 8);

      if (!isOrphan) continue;

      // Soft-kill so gate count drops; cleanup removes entity next pass
      const mut = world.getMutableComponent(e, "Health") as
        | { current: number }
        | undefined;
      if (mut) mut.current = 0;
      if (!world.hasComponent(e, "Dead")) {
        world.getCommandBuffer().addComponent(e, { type: "Dead" });
      }
    }
  }
}
