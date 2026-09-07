import { IStateReplicator } from "./NetworkManager";

/**
 * Commands interface matching WorldCommandBuffer or World for removing entities.
 *
 * @public
 */
export interface EntityRemover {
  removeEntity(entity: number): void;
}

/**
 * Purges entities mapped in the state replicator that are no longer present
 * in the latest authoritative server snapshot.
 *
 * @param replicator - State replicator maintaining serverId -\> local entityId mappings.
 * @param currentServerEntities - Set of server entity IDs received in the current server state tick.
 * @param commands - World or CommandBuffer interface capable of issuing entity removal.
 * @public
 */
export function pruneStaleEntities(
  replicator: IStateReplicator<any>,
  currentServerEntities: Set<string>,
  commands: EntityRemover
): void {
  replicator.getMappings().forEach((entity: number, serverId: string) => {
    if (!currentServerEntities.has(serverId)) {
      commands.removeEntity(entity);
      replicator.removeMapping(serverId);
    }
  });
}
