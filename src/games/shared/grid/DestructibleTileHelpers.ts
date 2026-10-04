import { World, CoreComponentRegistry, TilemapComponent, Entity } from "@tiny-aster/core";

/**
 * Event detail payload emitted when a destructible tile is destroyed.
 * @public
 */
export interface TileDestroyedEvent {
  /** Entity ID of the mutated Tilemap. */
  entity: Entity;
  /** Row index of destroyed tile. */
  row: number;
  /** Column index of destroyed tile. */
  col: number;
  /** Tile ID before destruction. */
  destroyedTileId: number;
  /** Replacement tile ID after destruction (defaults to 0 for empty). */
  replacementTileId: number;
}

/**
 * Mutates a tilemap matrix at `(row, col)`, replacing `destroyedTileId` with `replacementTileId`,
 * and emits a deterministic `tile:destroyed` event on the world's EventBus.
 *
 * @param world - Simulation world.
 * @param tilemapEntity - Target Tilemap entity ID.
 * @param row - Target tile row index.
 * @param col - Target tile column index.
 * @param replacementTileId - Tile ID to replace destroyed tile with (defaults to 0).
 * @returns `true` if a non-empty tile was destroyed and mutated; `false` otherwise.
 * @public
 */
export function destroyTile(
  world: World<CoreComponentRegistry>,
  tilemapEntity: Entity,
  row: number,
  col: number,
  replacementTileId = 0
): boolean {
  const tilemap = world.getComponent(tilemapEntity, "Tilemap") as TilemapComponent | undefined;
  if (!tilemap || !tilemap.data) {
    return false;
  }

  const rowData = tilemap.data[row];
  if (!rowData) {
    return false;
  }

  const currentTileId = rowData[col];
  if (currentTileId === undefined || currentTileId === replacementTileId) {
    return false;
  }

  // Mutate tilemap matrix
  rowData[col] = replacementTileId;

  // Emit deterministic tile:destroyed event
  const eventBus = world.getEventBus();
  if (eventBus) {
    eventBus.emit("tile:destroyed" as any, {
      entity: tilemapEntity,
      row,
      col,
      destroyedTileId: currentTileId,
      replacementTileId,
    });
  }

  return true;
}
