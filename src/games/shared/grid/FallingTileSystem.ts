import { System } from "@tiny-aster/core";
import { World, CoreComponentRegistry, TilemapComponent } from "@tiny-aster/core";

/**
 * Event detail emitted when a tile falls due to gravity.
 * @public
 */
export interface TileFallEvent {
  /** Original coordinate of the tile before falling. */
  fromRow: number;
  fromCol: number;
  /** Destination coordinate of the tile after falling. */
  toRow: number;
  toCol: number;
  /** Tile ID value that fell. */
  tileId: number;
}

/**
 * Pure function applying one step of cascading tile gravity to a 2D tile matrix.
 *
 * @remarks
 * **Deterministic Bottom-to-Top Scanning**: Scans rows from bottom (`rows - 2` down to `0`)
 * so lower tiles fall into empty spaces first.
 *
 * @param data - 2D matrix of tile IDs (`data[row][col]`).
 * @param emptyTileId - ID representing empty/passable cell (defaults to 0).
 * @returns Array of `TileFallEvent` records for tiles that moved during this step.
 * @public
 */
export function stepTileGravity(
  data: number[][],
  emptyTileId = 0
): TileFallEvent[] {
  const rows = data.length;
  if (rows <= 1) return [];
  const cols = data[0]?.length ?? 0;

  const fallenEvents: TileFallEvent[] = [];

  // Snapshot initial matrix state before this step to ensure max 1-cell fall per step
  const snapshot = data.map((r) => [...r]);

  // Deterministic column-first, bottom-to-top row scan
  for (let col = 0; col < cols; col++) {
    for (let row = rows - 2; row >= 0; row--) {
      const tileId = snapshot[row]?.[col];
      if (tileId === undefined || tileId === emptyTileId) {
        continue;
      }

      // Check space directly below in initial snapshot
      const targetRow = row + 1;
      const belowTileId = snapshot[targetRow]?.[col];

      if (belowTileId === emptyTileId) {
        // Fall one cell down
        data[targetRow][col] = tileId;
        data[row][col] = emptyTileId;

        fallenEvents.push({
          fromRow: row,
          fromCol: col,
          toRow: targetRow,
          toCol: col,
          tileId,
        });
      }
    }
  }

  return fallenEvents;
}

/**
 * System executing deterministic bottom-to-top cascading tile gravity on active Tilemap entities.
 *
 * @public
 */
export class FallingTileSystem extends System<CoreComponentRegistry> {
  private emptyTileId: number;

  constructor(options?: { emptyTileId?: number }) {
    super();
    this.emptyTileId = options?.emptyTileId ?? 0;
  }

  /**
   * Executes one step of tile gravity across all active tilemaps in the world.
   *
   * @param world - Simulation world.
   * @param _deltaTime - Frame duration in seconds (unused; tile gravity is step-based).
   */
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const tilemapEntities = world.query("Tilemap");
    const len = tilemapEntities.length;

    for (let i = 0; i < len; i++) {
      const entity = tilemapEntities[i];
      const tilemap = world.getComponent(entity, "Tilemap") as TilemapComponent | undefined;
      if (!tilemap || !tilemap.data) continue;

      const events = stepTileGravity(tilemap.data, this.emptyTileId);

      if (events.length > 0) {
        const eventBus = world.getEventBus();
        if (eventBus) {
          for (let j = 0; j < events.length; j++) {
            eventBus.emit("tile:fallen" as any, {
              entity,
              ...events[j],
            });
          }
        }
      }
    }
  }
}
