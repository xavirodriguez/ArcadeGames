import { World, EventBus, StoryRuntime, StoryGraph, RelationshipEngine } from "../src";
import { StorySaveService } from "../src/story/StorySaveService";
import { MemoryStorageProvider } from "../src/story/MetaProgressionService";

describe("StoryRuntime Extended Capabilities & Robustness Tests", () => {
  let world: World;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
  });

  describe("Single Source of Truth & story:state_changed Event Emissions", () => {
    it("should emit story:state_changed when flags, variables, or evidence are mutated", () => {
      const runtime = new StoryRuntime();
      runtime.bindEventBus(eventBus);

      const stateChangedSpy = jest.fn();
      eventBus.on("story:state_changed" as any, stateChangedSpy);

      runtime.setFlag("testFlag", true);
      expect(stateChangedSpy).toHaveBeenCalledTimes(1);
      expect(stateChangedSpy.mock.calls[0][0].state.flags["testFlag"]).toBe(true);

      runtime.setVariable("testVar", 42);
      expect(stateChangedSpy).toHaveBeenCalledTimes(2);
      expect(stateChangedSpy.mock.calls[1][0].state.variables["testVar"]).toBe(42);

      runtime.discoverEvidence("ev_alpha");
      expect(stateChangedSpy).toHaveBeenCalledTimes(3);
      expect(stateChangedSpy.mock.calls[2][0].state.evidence).toContain("ev_alpha");
    });
  });

  describe("Targeted Objective Filtering (Idea 2.10 Fix)", () => {
    it("should only advance objective progress for matching event keys or IDs", () => {
      const graph: StoryGraph = {
        id: "objective_test_graph",
        title: "Objective Test",
        entryNodeId: "node_battle",
        nodes: {
          node_battle: {
            id: "node_battle",
            type: "gameplay",
            objective: {
              id: "obj_destroy_ships",
              eventKey: "enemy:destroyed",
              titleKey: "Destroy 3 enemy ships",
              targetCount: 3,
              currentCount: 0,
              completed: false
            }
          }
        }
      };

      const runtime = new StoryRuntime(graph);
      runtime.bindWorld(world);

      // Unrelated events should NOT advance obj_destroy_ships
      eventBus.emit("rock:destroyed" as any, { amount: 1 });
      eventBus.emit("collectible:gathered" as any, { amount: 1 });
      expect(runtime.getState().objectives["obj_destroy_ships"].currentCount).toBe(0);

      // Matching eventKey "enemy:destroyed" SHOULD advance obj_destroy_ships
      eventBus.emit("enemy:destroyed" as any, { amount: 1 });
      expect(runtime.getState().objectives["obj_destroy_ships"].currentCount).toBe(1);

      eventBus.emit("enemy:destroyed" as any, { amount: 2 });
      expect(runtime.getState().objectives["obj_destroy_ships"].currentCount).toBe(3);
      expect(runtime.getState().objectives["obj_destroy_ships"].completed).toBe(true);
    });
  });

  describe("RNG Determinism Enforcement (Idea 1.5)", () => {
    it("should return false without Math.random fallback when gameplayRandom is missing", () => {
      const runtime = new StoryRuntime(); // No world bound
      const condition = { type: "random" as const, chance: 0.99 };

      const result = runtime.evaluateCondition(condition);
      expect(result).toBe(false);
    });
  });

  describe("Compound Conditions Evaluation (Task 3.2)", () => {
    it("should evaluate 'all', 'any', and 'not' compound conditions recursively", () => {
      const runtime = new StoryRuntime();
      runtime.setFlag("hasKey", true);
      runtime.setVariable("health", 100);
      runtime.setFlag("isPoisoned", false);

      // Condition: hasKey AND health > 50
      const allCondition = {
        type: "all" as const,
        all: [
          { type: "flag" as const, key: "hasKey", value: true },
          { type: "variable" as const, key: "health", value: 50, operator: ">" as const }
        ]
      };
      expect(runtime.evaluateCondition(allCondition)).toBe(true);

      // Condition: NOT isPoisoned
      const notCondition = {
        type: "not" as const,
        not: { type: "flag" as const, key: "isPoisoned", value: true }
      };
      expect(runtime.evaluateCondition(notCondition)).toBe(true);

      // Nested condition: (hasKey AND health > 50) AND NOT isPoisoned
      const nestedCondition = {
        type: "all" as const,
        all: [
          allCondition,
          notCondition
        ]
      };
      expect(runtime.evaluateCondition(nestedCondition)).toBe(true);
    });
  });

  describe("StorySaveService Persistence & RewindPolicy Enforcement (Task 3.1)", () => {
    it("should perform save/load roundtrips including relationships and evidence", async () => {
      const storage = new MemoryStorageProvider();
      const saveService = new StorySaveService(storage);

      const relEngine = new RelationshipEngine();
      const runtime = new StoryRuntime();
      runtime.bindEventBus(eventBus);
      runtime.bindRelationshipEngine(relEngine);

      runtime.setVariable("credits", 500);
      runtime.discoverEvidence("ev_blackbox");
      relEngine.modifyRelationship("ARES", { trust: 10 });

      // Save game
      const saveData = await saveService.saveGame("slot_1", runtime);
      expect(saveData.story.variables["credits"]).toBe(500);
      expect(saveData.evidence).toContain("ev_blackbox");

      // Load into fresh runtime instance
      const newRelEngine = new RelationshipEngine();
      const freshRuntime = new StoryRuntime();
      freshRuntime.bindRelationshipEngine(newRelEngine);

      const success = await saveService.loadGame("slot_1", freshRuntime);
      expect(success).toBe(true);
      expect(freshRuntime.getState().variables["credits"]).toBe(500);
      expect(freshRuntime.getDiscoveredEvidence()).toContain("ev_blackbox");
      expect(newRelEngine.getRelationship("ARES").trust).toBe(10);
    });

    it("should respect 'permanent' RewindPolicy and prevent rewinding past permanent decisions", () => {
      const graph: StoryGraph = {
        id: "rewind_policy_graph",
        title: "Rewind Policy Test",
        entryNodeId: "node_start",
        nodes: {
          node_start: {
            id: "node_start",
            type: "choice",
            checkpoint: true,
            choices: [
              {
                id: "choice_permanent_sac",
                titleKey: "Permanent Sacrifice",
                targetNodeId: "node_end",
                rewindPolicy: "permanent"
              }
            ]
          },
          node_end: {
            id: "node_end",
            type: "dialogue",
            isEndNode: true
          }
        }
      };

      const runtime = new StoryRuntime(graph);
      runtime.bindEventBus(eventBus);

      expect(runtime.getCheckpoints()).toContain("node_start");

      // Take choice with rewindPolicy = "permanent"
      runtime.selectChoice("choice_permanent_sac");
      expect(runtime.getCurrentNode()?.id).toBe("node_end");

      // Attempting to rewind to checkpoint node_start MUST fail
      const rewindResult = runtime.rewind("node_start");
      expect(rewindResult).toBe(false);
      expect(runtime.getCurrentNode()?.id).toBe("node_end");
    });
  });
});
