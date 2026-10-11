import { World, Entity } from "@tiny-aster/core";

/**
 * Ensures an entity carries a LocalPlayer component in network sync descriptors.
 * @param world - World instance.
 * @param entity - Entity ID.
 * @public
 */
export function markLocalPlayerEntity(world: World, entity: Entity): void {
  const commands = world.getCommandBuffer();
  if (!world.hasComponent(entity, "LocalPlayer" as never)) {
    commands.addComponent(entity, { type: "LocalPlayer" } as never);
  }
}

/**
 * Reusable no-op synchronization handler for entity sync descriptors.
 * @public
 */
export const NO_OP_SYNC = (): void => {};
