import { CampaignSaveManager } from "../src/story/CampaignSaveManager";
import { StoryRuntime } from "../src/story/StoryRuntime";
import { MetaProgressionService, MemoryStorageProvider } from "../src/story/MetaProgressionService";
import { StoryGraph } from "../src/story/StoryTypes";

describe("CampaignSaveManager & Integration", () => {
  const sampleGraph: StoryGraph = {
    id: "campaign_graph_1",
    title: "Campaign Graph 1",
    entryNodeId: "start",
    nodes: {
      start: {
        id: "start",
        type: "choice",
        title: "Start Node",
        choices: [
          {
            id: "choice_a",
            titleKey: "Option A",
            targetNodeId: "node_a",
            effects: [{ type: "setFlag", key: "flag_a", value: true }]
          }
        ]
      },
      node_a: {
        id: "node_a",
        type: "dialogue",
        title: "Node A",
        sceneToLoad: "space-invaders",
        isEndNode: true
      }
    }
  };

  it("verifies single storage write on saveCampaign and zero writes during recordRunCompletion", async () => {
    const storage = new MemoryStorageProvider();
    const setItemSpy = jest.spyOn(storage, "setItem");

    const runtime = new StoryRuntime(sampleGraph);
    const metaService = new MetaProgressionService(undefined, storage, false); // autoSave = false
    const manager = new CampaignSaveManager(storage);

    // 1. Record run completion during campaign -> 0 storage writes
    await metaService.recordRunCompletion("ending_alpha");
    expect(setItemSpy).toHaveBeenCalledTimes(0);

    // 2. Perform narrative choice
    runtime.selectChoice("choice_a");
    expect(runtime.getCurrentNode()?.id).toBe("node_a");

    // 3. Save campaign -> 1 single storage write
    const envelope = await manager.saveCampaign("slot_1", runtime, metaService, {
      totalPlaytimeSeconds: 120,
      minigamesPlayed: { "space-invaders": 1 }
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(envelope.slotId).toBe("slot_1");
    expect(envelope.narrative.story.currentNodeId).toBe("node_a");
    expect(envelope.meta.completedEndings).toContain("ending_alpha");
    expect(envelope.stats.minigamesPlayed["space-invaders"]).toBe(1);
  });

  it("performs full round-trip save and load restoring state into new runtime and meta service", async () => {
    const storage = new MemoryStorageProvider();
    const manager = new CampaignSaveManager(storage);

    // Runtime A setup
    const runtimeA = new StoryRuntime(sampleGraph);
    const metaA = new MetaProgressionService(undefined, storage, false);

    metaA.discoverMetaEvidence({
      id: "evidence_meta_1",
      titleKey: "Meta Log 1",
      category: "transmission",
      discoveredAtTimestamp: 1000
    });
    runtimeA.selectChoice("choice_a");

    await manager.saveCampaign("slot_roundtrip", runtimeA, metaA);

    // Runtime B setup (fresh instances)
    const runtimeB = new StoryRuntime(sampleGraph);
    const metaB = new MetaProgressionService(undefined, storage, false);

    expect(runtimeB.getCurrentNode()?.id).toBe("start");
    expect(metaB.getState().discoveredMetaEvidence).toHaveLength(0);

    const loadedEnvelope = await manager.loadCampaign("slot_roundtrip", runtimeB, metaB);

    expect(loadedEnvelope).not.toBeNull();
    expect(runtimeB.getCurrentNode()?.id).toBe("node_a");
    expect(runtimeB.getState().flags.flag_a).toBe(true);
    expect(metaB.getState().discoveredMetaEvidence).toHaveLength(1);
    expect(metaB.getState().discoveredMetaEvidence[0].id).toBe("evidence_meta_1");
  });
});
