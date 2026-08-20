import {
  MetaProgressionService,
  MemoryStorageProvider,
  DEFAULT_META_PROGRESSION_STATE
} from "../src/story/MetaProgressionService";

describe("MetaProgressionService Campaign Integrations", () => {
  it("migrates raw state using migrateState", () => {
    const raw = {
      saveVersion: 0,
      completedRuns: 2,
      completedEndings: ["ending_1"]
    };

    const migrated = MetaProgressionService.migrateState(raw);
    expect(migrated.saveVersion).toBe(1);
    expect(migrated.completedRuns).toBe(2);
    expect(migrated.completedEndings).toEqual(["ending_1"]);
    expect(migrated.unlockedModifiers).toBeDefined();
  });

  it("loads state into memory via loadState without calling storage.setItem", async () => {
    const storage = new MemoryStorageProvider();
    const setItemSpy = jest.spyOn(storage, "setItem");

    const service = new MetaProgressionService(DEFAULT_META_PROGRESSION_STATE, storage, true);

    const newState = {
      ...DEFAULT_META_PROGRESSION_STATE,
      completedRuns: 5,
      completedEndings: ["ending_A", "ending_B"]
    };

    service.loadState(newState);

    expect(service.getState().completedRuns).toBe(5);
    expect(service.getState().completedEndings).toEqual(["ending_A", "ending_B"]);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("disables autoSave during campaign operations to prevent auto storage writes", async () => {
    const storage = new MemoryStorageProvider();
    const setItemSpy = jest.spyOn(storage, "setItem");

    const service = new MetaProgressionService(DEFAULT_META_PROGRESSION_STATE, storage, false);

    await service.recordRunCompletion("ending_1");
    expect(service.getState().completedRuns).toBe(1);
    expect(setItemSpy).not.toHaveBeenCalled();

    await service.discoverMetaEvidence({
      id: "meta_1",
      titleKey: "Title 1",
      category: "glitch",
      discoveredAtTimestamp: Date.now()
    });

    expect(service.getState().discoveredMetaEvidence.length).toBe(1);
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
