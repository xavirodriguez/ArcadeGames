import {
  StoryRuntime,
  MetaProgressionService,
  CampaignSaveManager,
  ArcadeOrchestrator,
  StoryGraph
} from "@tiny-aster/core";
import { executeCampaignSave, executeCampaignLoad } from "../useCampaignPersistence";

describe("useCampaignPersistence isolated unit test", () => {
  let runtime: StoryRuntime;
  let metaService: MetaProgressionService;
  let saveManager: CampaignSaveManager;
  let arcadeOrchestrator: ArcadeOrchestrator;

  const mockGraph: StoryGraph = {
    id: "persistence_test_graph",
    title: "Persistence Test Graph",
    entryNodeId: "intro_node",
    nodes: {
      intro_node: {
        id: "intro_node",
        type: "dialogue",
        title: "Intro Dialogue Node",
        dialogue: { id: "dlg_1", lines: [{ textKey: "Hello" }] }
      },
      gameplay_node: {
        id: "gameplay_node",
        type: "gameplay",
        title: "Stage 1",
        sceneToLoad: "asteroids"
      }
    }
  };

  beforeEach(() => {
    runtime = new StoryRuntime(mockGraph);
    metaService = new MetaProgressionService(undefined, undefined, false);
    saveManager = new CampaignSaveManager();
    arcadeOrchestrator = new ArcadeOrchestrator({ runtime });
  });

  it("successfully saves and loads campaign state via isolated persistence handlers", async () => {
    const slotId = "test_slot_123";
    const defaultGameId = "asteroids";
    const switchGame = jest.fn().mockResolvedValue(undefined);
    const setStatusMessage = jest.fn();
    const getLocalizedText = jest.fn((k) => k || "");

    // 1. Advance runtime state to gameplay node & set a flag
    runtime.setFlag("test_flag_persisted", true);
    runtime.navigateToNode("gameplay_node");

    // 2. Execute save via persistence handler
    const savedEnvelope = await executeCampaignSave({
      slotId,
      runtime,
      metaService,
      saveManager,
      activeGameId: "asteroids",
      activeGameSeed: 424242,
      setStatusMessage,
      getLocalizedText
    });

    expect(savedEnvelope).toBeDefined();
    expect(savedEnvelope?.slotId).toBe(slotId);
    expect(savedEnvelope?.activeGameId).toBe("asteroids");
    expect(savedEnvelope?.activeGameSeed).toBe(424242);
    expect(setStatusMessage).toHaveBeenCalledWith("campaign.save_success");

    // 3. Reset runtime to initial fresh runtime instance
    const freshRuntime = new StoryRuntime(mockGraph);
    expect(freshRuntime.getCurrentNodeId()).toBe("intro_node");
    expect(freshRuntime.getFlag("test_flag_persisted")).toBe(false);

    // 4. Execute load via persistence handler into fresh runtime
    const loadedEnvelope = await executeCampaignLoad({
      slotId,
      defaultGameId,
      runtime: freshRuntime,
      metaService,
      saveManager,
      arcadeOrchestrator,
      switchGame,
      setStatusMessage,
      getLocalizedText
    });

    expect(loadedEnvelope).toBeDefined();
    expect(loadedEnvelope?.activeGameId).toBe("asteroids");
    expect(loadedEnvelope?.activeGameSeed).toBe(424242);

    // Verify StoryRuntime state was restored on freshRuntime
    expect(freshRuntime.getCurrentNodeId()).toBe("gameplay_node");
    expect(freshRuntime.getFlag("test_flag_persisted")).toBe(true);

    // Verify switchGame was invoked with restored target game and seed
    expect(switchGame).toHaveBeenCalledWith("asteroids", 424242);
    expect(setStatusMessage).toHaveBeenCalledWith("campaign.load_success");
  });
});
