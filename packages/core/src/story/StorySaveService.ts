import { StoryRuntime } from "./StoryRuntime";
import { NarrativeSaveGame } from "./StoryTypes";
import { IMetaStorageProvider, MemoryStorageProvider } from "./MetaProgressionService";

export const NARRATIVE_SAVE_VERSION = 1;

/**
 * Service managing serialized narrative state snapshots, checkpoint saves, and persistence
 * using an `IMetaStorageProvider` storage adapter.
 *
 * @public
 */
export class StorySaveService {
  private storage: IMetaStorageProvider;

  constructor(storage?: IMetaStorageProvider) {
    this.storage = storage ?? new MemoryStorageProvider();
  }

  /**
   * Constructs a `NarrativeSaveGame` snapshot from active `StoryRuntime` state.
   */
  public createSaveGame(
    runtime: StoryRuntime,
    contentVersion: string = "1.0.0",
    checkpointId?: string
  ): NarrativeSaveGame {
    const relEngine = runtime.getRelationshipEngine();
    const relExport = relEngine ? relEngine.exportState() : undefined;

    return {
      saveVersion: NARRATIVE_SAVE_VERSION,
      contentVersion,
      story: runtime.getState(),
      evidence: runtime.getDiscoveredEvidence(),
      relationships: relExport?.relationships,
      memories: relExport?.memories,
      timestamp: new Date().toISOString(),
      checkpointId: checkpointId || runtime.getState().currentNodeId || undefined
    };
  }

  /**
   * Saves active `StoryRuntime` state to storage under specified slot identifier.
   */
  public async saveGame(
    slotId: string,
    runtime: StoryRuntime,
    contentVersion: string = "1.0.0",
    checkpointId?: string
  ): Promise<NarrativeSaveGame> {
    const saveData = this.createSaveGame(runtime, contentVersion, checkpointId);
    await this.storage.setItem(`@narrative_save_${slotId}`, JSON.stringify(saveData));
    return saveData;
  }

  /**
   * Loads narrative save game snapshot from storage and restores state onto `StoryRuntime`.
   */
  public async loadGame(slotId: string, runtime: StoryRuntime): Promise<boolean> {
    try {
      const raw = await this.storage.getItem(`@narrative_save_${slotId}`);
      if (!raw) return false;

      const saveData: NarrativeSaveGame = JSON.parse(raw);
      if (!saveData || !saveData.story) return false;

      runtime.setState(saveData.story);

      // Restore evidence if present
      if (saveData.evidence && Array.isArray(saveData.evidence)) {
        for (const evId of saveData.evidence) {
          runtime.discoverEvidence(evId);
        }
      }

      // Restore relationship engine if bound and saved
      const relEngine = runtime.getRelationshipEngine();
      if (relEngine && (saveData.relationships || saveData.memories)) {
        relEngine.importState({
          relationships: saveData.relationships,
          memories: saveData.memories
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Saves a checkpoint on `StoryRuntime` and optionally navigates to node.
   */
  public saveCheckpoint(runtime: StoryRuntime, nodeId: string): void {
    const graph = runtime.getGraph();
    if (graph && graph.nodes[nodeId]) {
      runtime.navigateToNode(nodeId);
    }
  }
}
