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

/**
 * Standardized score / game status mutation payload received from server snapshots.
 * @public
 */
export interface ServerGameStateFields {
  score?: number | string;
  gameOver?: boolean;
  wave?: number | string;
  bombs?: number | string;
  lives?: number | string;
}

/**
 * Mutates common game state singleton fields from server snapshot payload.
 * @param state - Mutated state object.
 * @param fields - Server payload containing state fields.
 * @public
 */
export function applyServerGameStateFields<T extends object>(
  state: T,
  fields: ServerGameStateFields
): void {
  const target = state as Record<string, unknown>;
  if (fields.score !== undefined) {
    target.score = Number(fields.score);
  }
  if (fields.gameOver !== undefined) {
    target.isGameOver = !!fields.gameOver;
  }
  if (fields.wave !== undefined) {
    target.wave = Number(fields.wave);
  }
  if (fields.bombs !== undefined) {
    target.bombs = Number(fields.bombs);
  }
  if (fields.lives !== undefined) {
    target.lives = Number(fields.lives);
  }
}
