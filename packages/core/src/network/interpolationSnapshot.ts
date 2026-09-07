import { TransformComponent } from "../ecs/CoreComponents";
import { WorldSnapshot, SerializedComponent } from "../snapshots/WorldSnapshot";

/**
 * Creates a TransformComponent object initialized with standard default values.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @param rotation - Rotation angle in radians (defaults to 0).
 * @returns Fully populated TransformComponent object.
 * @public
 */
export function toTransformComponent(x: number, y: number, rotation = 0): TransformComponent {
  return {
    type: "Transform",
    x,
    y,
    rotation,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: rotation,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false,
  };
}

/**
 * Entry representation for populating an interpolation snapshot entity transform.
 * @public
 */
export interface InterpolationSnapshotEntry {
  entityId: number;
  x: number;
  y: number;
  rotation?: number;
}

/**
 * Constructs a WorldSnapshot object for remote interpolation containing Transform component data for given entities.
 *
 * @param tick - Simulation tick number.
 * @param entries - Array of entity entries with position and optional rotation.
 * @returns WorldSnapshot prepared for RemoteInterpolationSystem processing.
 * @public
 */
export function buildInterpolationSnapshot(
  tick: number,
  entries: InterpolationSnapshotEntry[]
): WorldSnapshot {
  const snapshot: WorldSnapshot = {
    tick,
    entities: [],
    componentData: { Transform: {} },
    stateVersion: 0,
    structureVersion: 0,
    seed: 0,
    nextEntityId: 0,
    freeEntities: [],
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    snapshot.entities.push(entry.entityId);
    snapshot.componentData["Transform"][entry.entityId] = toTransformComponent(
      entry.x,
      entry.y,
      entry.rotation ?? 0
    ) as unknown as SerializedComponent;
  }

  return snapshot;
}
