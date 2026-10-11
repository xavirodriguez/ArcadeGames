import { World, WorldUtils, Entity, CoreComponentRegistry } from "@tiny-aster/core";

export function forEachActiveCollision<TCompReg extends CoreComponentRegistry>(
  world: World<TCompReg>,
  entity: Entity,
  callback: (other: Entity) => boolean | void
): void {
  const events = world.getComponent(entity, "CollisionEvents" as unknown as Extract<keyof TCompReg, string>) as { collisions?: Array<{ otherEntity: Entity }> } | undefined;
  if (!events || !events.collisions) return;

  for (const col of events.collisions) {
    const other = col.otherEntity;
    if (!WorldUtils.isEntityActive(world, other)) continue;
    const stop = callback(other);
    if (stop === true) break;
  }
}
