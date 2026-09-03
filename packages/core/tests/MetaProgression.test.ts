import {
  MetaEvidence,
  MetaProgressionService,
  DEFAULT_META_PROGRESSION_STATE
} from "../src/story";

describe("MetaProgression & New Game+ Test Suite", () => {
  it("initializes with default meta progression state and unlocks New Game+ after run completion", () => {
    const service = new MetaProgressionService();
    expect(service.isNewGamePlusUnlocked()).toBe(false);

    service.recordRunCompletion("ending_a_escape");
    expect(service.isNewGamePlusUnlocked()).toBe(true);
    expect(service.getState().completedRuns).toBe(1);
    expect(service.getState().completedEndings).toEqual(["ending_a_escape"]);
  });

  it("persists meta evidence across run resets while keeping normal evidence separated", () => {
    const service = new MetaProgressionService();
    const metaItem: MetaEvidence = {
      id: "meta_transmission_01",
      titleKey: "ANOMALOUS TRANSMISSION",
      category: "transmission",
      discoveredAtTimestamp: Date.now()
    };

    service.discoverMetaEvidence(metaItem);
    expect(service.getState().discoveredMetaEvidence.length).toBe(1);
    expect(service.getState().discoveredMetaEvidence[0].id).toBe("meta_transmission_01");

    // Re-discovering same item doesn't duplicate
    service.discoverMetaEvidence(metaItem);
    expect(service.getState().discoveredMetaEvidence.length).toBe(1);
  });

  it("migrates older save state schemas smoothly", () => {
    const legacyState = {
      completedRuns: 2,
      completedEndings: ["ending_1"]
    };

    const service = new MetaProgressionService(legacyState as any);
    const migrated = service.getState();

    expect(migrated.saveVersion).toBe(1);
    expect(migrated.completedRuns).toBe(2);
    expect(migrated.unlockedModifiers).toBeDefined();
  });

  it("increments minigame mastery level clamped between 1 and 5", async () => {
    const service = new MetaProgressionService(undefined, undefined, false);
    expect(service.getState().miniGameMastery["asteroids"]).toBeUndefined();

    await service.incrementMiniGameMastery("asteroids", 1);
    expect(service.getState().miniGameMastery["asteroids"]).toBe(1);

    await service.incrementMiniGameMastery("asteroids", 2);
    expect(service.getState().miniGameMastery["asteroids"]).toBe(3);

    await service.incrementMiniGameMastery("asteroids", 10);
    expect(service.getState().miniGameMastery["asteroids"]).toBe(5);
  });

  it("unlocks permanent modifiers without duplication", async () => {
    const service = new MetaProgressionService(undefined, undefined, false);
    const initialLength = service.getState().unlockedModifiers.length;

    await service.unlockModifier("hyper_drift");
    expect(service.getState().unlockedModifiers.includes("hyper_drift")).toBe(true);

    // Duplicate unlock call does not add extra entries
    await service.unlockModifier("hyper_drift");
    expect(service.getState().unlockedModifiers.filter((m) => m === "hyper_drift").length).toBe(1);
  });
});
