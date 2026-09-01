import {
  CampaignSaveManager,
  MemoryStorageProvider,
  MetaProgressionService,
  StoryRuntime,
  GameDefinitionRegistry,
  BaseGame
} from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../story/ProofOfConceptStoryGraph";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";

describe("Campaign Save/Load Integration Test (ProofOfConceptStoryGraph)", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  it("saves and loads campaign state preserving activeGameId and activeGameSeed across sessions", async () => {
    const storage = new MemoryStorageProvider();
    const saveManager = new CampaignSaveManager(storage);

    // 1. Session 1: Start campaign with proofOfConceptStoryGraph
    const runtimeSession1 = new StoryRuntime(proofOfConceptStoryGraph);
    const metaSession1 = new MetaProgressionService(undefined, storage, false);

    expect(runtimeSession1.getCurrentNode()?.id).toBe("start_node");

    // Advance narrative from start_node -> act1_asteroids_intro -> act1_asteroids_gameplay
    runtimeSession1.evaluateTransitions(); // start_node -> act1_asteroids_intro
    runtimeSession1.evaluateTransitions(); // act1_asteroids_intro -> act1_asteroids_gameplay

    const currentNodeSession1 = runtimeSession1.getCurrentNode();
    expect(currentNodeSession1?.id).toBe("act1_asteroids_gameplay");

    const activeGameId = "asteroids";
    const activeGameSeed = 987654321;

    // Save campaign state in slot "integration_slot"
    const envelope = await saveManager.saveCampaign("integration_slot", runtimeSession1, metaSession1, {
      activeGameId,
      activeGameSeed,
      totalPlaytimeSeconds: 45
    });

    expect(envelope).toBeDefined();
    expect(envelope.slotId).toBe("integration_slot");
    expect(envelope.activeGameId).toBe("asteroids");
    expect(envelope.activeGameSeed).toBe(987654321);
    expect(envelope.narrative.story.currentNodeId).toBe("act1_asteroids_gameplay");

    // 2. Session 2: Fresh runtime and meta instances
    const runtimeSession2 = new StoryRuntime(proofOfConceptStoryGraph);
    const metaSession2 = new MetaProgressionService(undefined, storage, false);

    expect(runtimeSession2.getCurrentNode()?.id).toBe("start_node");

    // Load campaign envelope from slot "integration_slot"
    const loadedEnvelope = await saveManager.loadCampaign("integration_slot", runtimeSession2, metaSession2);

    expect(loadedEnvelope).not.toBeNull();
    expect(loadedEnvelope?.activeGameId).toBe("asteroids");
    expect(loadedEnvelope?.activeGameSeed).toBe(987654321);

    // Verify runtime node was restored to act1_asteroids_gameplay
    const restoredNode = runtimeSession2.getCurrentNode();
    expect(restoredNode?.id).toBe("act1_asteroids_gameplay");

    // Verify game definition resolution for restored activeGameId
    const normalizedGameId = GameDefinitionRegistry.normalizeId(loadedEnvelope!.activeGameId!);
    expect(GameDefinitionRegistry.has(normalizedGameId)).toBe(true);

    const gameDef = GameDefinitionRegistry.resolve(normalizedGameId);
    const simInstance = gameDef.createSimulation(loadedEnvelope!.activeGameSeed!) as BaseGame;
    expect(simInstance).toBeDefined();
    expect(simInstance.getSeed()).toBe(987654321);
  });
});
