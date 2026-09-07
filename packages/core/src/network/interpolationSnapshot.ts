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
  const transformMap: Record<number, SerializedComponent> = {};

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const comp = toTransformComponent(entry.x, entry.y, entry.rotation ?? 0);
    // Explicitly assign properties to satisfy SerializedComponent index signature without unsafe typecast
    const serialized: SerializedComponent = {
      type: comp.type,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation,
      scaleX: comp.scaleX,
      scaleY: comp.scaleY,
      worldX: comp.worldX,
      worldY: comp.worldY,
      worldRotation: comp.worldRotation,
      worldScaleX: comp.worldScaleX,
      worldScaleY: comp.worldScaleY,
      dirty: comp.dirty
    };
    transformMap[entry.entityId] = serialized;
  }

  const snapshot: WorldSnapshot = {
    tick,
    entities: entries.map((e) => e.entityId),
    componentData: { Transform: transformMap },
    stateVersion: 0,
    structureVersion: 0,
    seed: 0,
    nextEntityId: 0,
    freeEntities: [],
  };

  return snapshot;
}
