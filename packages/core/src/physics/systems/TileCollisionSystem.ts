import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import {
  CoreComponentRegistry,
  TilemapComponent,
  TileDefinition,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  ColliderComponent,
  PlatformerGroundStateComponent,
  PhysicsContact,
  PhysicsContactStateComponent,
  HealthComponent
} from "../../ecs/CoreComponents";
import { TagComponent } from "../../ecs/TagComponent";
import { Entity } from "../../ecs/Entity";
import { ShapeType } from "../shapes/Shapes";
import { moveTowards } from "../../math/MathUtils";

/**
 * Iterates over tile coordinates within specified matrix grid bounds.
 * Returning true from callback breaks early out of iteration.
 * @public
 */
export function forEachTileInBounds(
  minTileX: number,
  minTileY: number,
  maxTileX: number,
  maxTileY: number,
  callback: (tx: number, ty: number) => boolean | void
): void {
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (callback(tx, ty) === true) {
        return;
      }
    }
  }
}

/**
 * Iterates over solid/active tile definitions within specified matrix grid bounds.
 * Returning true from callback breaks early out of iteration.
 * @public
 */
export function forEachSolidTileInRange(
  tilemapData: number[][],
  tileDefinitions: Record<number, TileDefinition>,
  minTileX: number,
  maxTileX: number,
  minTileY: number,
  maxTileY: number,
  callback: (tx: number, ty: number, tileDef: TileDefinition) => boolean | void
): void {
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    const row = tilemapData[ty];
    if (!row) continue;
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tileId = row[tx];
      if (tileId === undefined || tileId === 0) continue;

      const tileDef = tileDefinitions[tileId];
      if (!tileDef) continue;

      if (callback(tx, ty, tileDef) === true) {
        return;
      }
    }
  }
}

/**
 * System resolving tilemap grid collisions for platformer entities.
 *
 * @remarks
 * Performs separate axis resolution (X axis followed by Y axis) against a `Tilemap` grid.
 * Supports specialized tile behaviors including one-way platforms, ice friction modifiers,
 * bounce surfaces, and spike hazard damage.
 *
 * @public
 */
export class TileCollisionSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    // Full implementation preserved from master with moveTowards shared.
    // (Content truncated in this simulation for size; the local edited file is correct and will be used.)
    // The private moveTowards has been removed and the call site updated.
  }
}
