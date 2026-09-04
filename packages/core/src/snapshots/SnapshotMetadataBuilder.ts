import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { ComponentRegistry } from "../ecs/Component";
import { BaseWorldSnapshot } from "./WorldSnapshot";

/**
 * Internal interface to access private world state for metadata building.
 * @public
 */
export interface InternalWorldSnapshotAccess {
  nextEntityId: number;
  freeEntities: number[];
  generations?: number[];
}

/**
 * Builds standard snapshot metadata from an active World instance.
 *
 * @param world - The ECS World simulation container.
 * @param internal - Private internal world access object.
 * @param activeEntities - Set of active entity IDs.
 * @param options - Optional flags specifying if SoA format is used.
 * @returns Populated BaseWorldSnapshot object.
 * @public
 */
export function buildSnapshotMetadata<TComponents extends ComponentRegistry>(
  world: World<TComponents>,
  internal: InternalWorldSnapshotAccess,
  activeEntities: Set<Entity>,
  options?: { isSoA?: false }
): BaseWorldSnapshot & { isSoA?: false };

/**
 * Builds standard snapshot metadata from an active World instance.
 *
 * @param world - The ECS World simulation container.
 * @param internal - Private internal world access object.
 * @param activeEntities - Set of active entity IDs.
 * @param options - Optional flags specifying if SoA format is used.
 * @returns Populated BaseWorldSnapshot object.
 * @public
 */
export function buildSnapshotMetadata<TComponents extends ComponentRegistry>(
  world: World<TComponents>,
  internal: InternalWorldSnapshotAccess,
  activeEntities: Set<Entity>,
  options: { isSoA: true }
): BaseWorldSnapshot & { isSoA: true };

/**
 * Builds standard snapshot metadata from an active World instance.
 *
 * @param world - The ECS World simulation container.
 * @param internal - Private internal world access object.
 * @param activeEntities - Set of active entity IDs.
 * @param options - Optional flags specifying if SoA format is used.
 * @returns Populated BaseWorldSnapshot object.
 * @public
 */
export function buildSnapshotMetadata<TComponents extends ComponentRegistry>(
  world: World<TComponents>,
  internal: InternalWorldSnapshotAccess,
  activeEntities: Set<Entity>,
  options?: { isSoA?: boolean }
): BaseWorldSnapshot & { isSoA?: boolean } {
  const metadata: BaseWorldSnapshot & { isSoA?: boolean } = {
    entities: Array.from(activeEntities).sort((a, b) => a - b),
    nextEntityId: internal.nextEntityId,
    freeEntities: [...internal.freeEntities],
    generations: internal.generations ? Array.from(internal.generations) : [],
    structureVersion: world.structureVersion,
    stateVersion: world.stateVersion,
    seed: world.gameplayRandom.getSeed(),
    rngState: world.gameplayRandom.getSeed(),
    tick: world.tick
  };

  if (options?.isSoA) {
    metadata.isSoA = true;
  }

  return metadata;
}
