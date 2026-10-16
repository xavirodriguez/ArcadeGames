import { World, Entity } from "@tiny-aster/core";

/**
 * Ensures an entity carries a LocalPlayer component in network sync descriptors.
 * @param world - World instance.
 * @param entity - Entity ID.
 * @public
 */
/**
 * Queries the active world for the primary Player entity.
 * @param world - World instance.
 * @returns Player entity ID or undefined if not found.
 * @public
 */
export function queryPlayerEntity(world: World): Entity | undefined {
  return world.query("Player")[0];
}

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

/**
 * Helper collecting interpolation snapshot entries for entity groups in server state payloads.
 * @public
 */
export function collectGroupInterpolationEntries(
  groupObj: Record<string, { x: number; y: number; angle?: number; rotation?: number; alive?: boolean }> | undefined,
  prefix: string,
  replicator: { getLocalId(serverId: string): number | undefined },
  requireAlive = false
): Array<{ entityId: number; x: number; y: number; rotation?: number }> {
  const entries: Array<{ entityId: number; x: number; y: number; rotation?: number }> = [];
  if (groupObj && typeof groupObj === "object") {
    Object.entries(groupObj).forEach(([id, p]) => {
      if (!p) return;
      if (requireAlive && p.alive === false) return;
      const entityId = replicator.getLocalId(`${prefix}_${id}`);
      if (entityId !== undefined) {
        const rotation = p.rotation ?? p.angle;
        entries.push(rotation !== undefined ? { entityId, x: p.x, y: p.y, rotation } : { entityId, x: p.x, y: p.y });
      }
    });
  }
  return entries;
}
