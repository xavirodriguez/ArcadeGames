import { MidGameNarrativeDirector } from "../src/story/MidGameNarrativeDirector";
import { StoryRuntime } from "../src/story/StoryRuntime";
import { EventBus } from "../src/events/EventBus";
import { StoryGraph } from "../src/story/StoryTypes";
import {
  GameplayEvent,
  MidGameDirectorRule,
  NarrativeCue
} from "../src/story/NarrativeDirectorTypes";

describe("MidGameNarrativeDirector Integration Tests", () => {
  let sampleGraph: StoryGraph;

  beforeEach(() => {
    sampleGraph = {
      id: "test_campaign",
      title: "Test Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "choice",
          title: "Start",
          choices: [
            {
              id: "choice_1",
              titleKey: "Continue",
              targetNodeId: "node_victory"
            }
          ]
        },
        node_victory: {
          id: "node_victory",
          type: "dialogue",
          title: "Victory",
          isEndNode: true
        },
        node_defeat: {
          id: "node_defeat",
          type: "dialogue",
          title: "Defeat",
          isEndNode: true
        }
      }
    };
  });

  describe("Event Evaluation & Priority Ordering", () => {
    it("should evaluate matching events and respect priority ordering", () => {
      const director = new MidGameNarrativeDirector();

      const lowPriorityCue: NarrativeCue = {
        id: "low_prio_cue",
        type: "radio",
        priority: 10,
        messageKey: "low_health_warning"
      };

      const highPriorityCue: NarrativeCue = {
        id: "high_prio_cue",
        type: "warning",
        priority: 90,
        messageKey: "critical_hull_damage"
      };

      director.addRule({
        id: "rule_low_health_general",
        eventName: "low_health",
        cue: lowPriorityCue
      });

      director.addRule({
        id: "rule_low_health_critical",
        eventName: "low_health",
        cue: highPriorityCue
      });

      const runtime = new StoryRuntime(sampleGraph);
      const event: GameplayEvent = {
        id: "evt_1",
        name: "low_health",
        timestamp: 1000,
        payload: { healthPercent: 10 }
      };

      const result = director.evaluateEvent(event, runtime.getState());
      expect(result).toBeDefined();
      expect(result?.id).toBe("high_prio_cue");
    });

    it("should evaluate condition predicates based on event payload and narrative snapshot", () => {
      const director = new MidGameNarrativeDirector();

      const bossDefeatedCue: NarrativeCue = {
        id: "boss_defeated_cue",
        type: "radio",
        priority: 50,
        titleKey: "COMMAND",
        rawText: "Target destroyed! Fall back to base."
      };

      const rule: MidGameDirectorRule = {
        id: "rule_boss_defeated",
        eventName: "boss_defeated",
        condition: (event, snapshot) => {
          return (
            event.payload?.bossId === "mothership" &&
            snapshot.variables["chapter"] === 2
          );
        },
        cue: bossDefeatedCue
      };

      director.addRule(rule);

      const runtime = new StoryRuntime(sampleGraph);
      runtime.setVariable("chapter", 1);

      const event: GameplayEvent = {
        id: "evt_boss",
        name: "boss_defeated",
        timestamp: 2000,
        payload: { bossId: "mothership" }
      };

      // Condition fails because chapter is 1
      expect(director.evaluateEvent(event, runtime.getState())).toBeNull();

      // Update snapshot variable chapter to 2
      runtime.setVariable("chapter", 2);

      // Condition passes
      const result = director.evaluateEvent(event, runtime.getState());
      expect(result).toBeDefined();
      expect(result?.id).toBe("boss_defeated_cue");
      expect(result?.rawText).toContain("Target destroyed");
    });
  });

  describe("Anti-Spam Controls (once, maxTriggersPerRun, cooldownMs)", () => {
    it("should enforce 'once' rules across multiple triggers", () => {
      const director = new MidGameNarrativeDirector();

      const cue: NarrativeCue = {
        id: "first_blood_cue",
        type: "warning",
        priority: 50,
        messageKey: "first_blood"
      };

      director.addRule({
        id: "rule_once",
        eventName: "first_kill",
        once: true,
        cue
      });

      const runtime = new StoryRuntime(sampleGraph);
      const event: GameplayEvent = {
        id: "evt_kill",
        name: "first_kill",
        timestamp: 1000
      };

      expect(director.evaluateEvent(event, runtime.getState())).toEqual(cue);
      expect(director.evaluateEvent(event, runtime.getState())).toBeNull();
    });

    it("should enforce 'maxTriggersPerRun' limits", () => {
      const director = new MidGameNarrativeDirector();

      const cue: NarrativeCue = {
        id: "combo_cue",
        type: "radio",
        priority: 20,
        messageKey: "combo_streak"
      };

      director.addRule({
        id: "rule_max_3",
        eventName: "combo_milestone",
        maxTriggersPerRun: 3,
        cue
      });

      const runtime = new StoryRuntime(sampleGraph);
      const snapshot = runtime.getState();

      const event = (ts: number): GameplayEvent => ({
        id: `evt_combo_${ts}`,
        name: "combo_milestone",
        timestamp: ts
      });

      expect(director.evaluateEvent(event(100), snapshot)).not.toBeNull();
      expect(director.evaluateEvent(event(200), snapshot)).not.toBeNull();
      expect(director.evaluateEvent(event(300), snapshot)).not.toBeNull();
      expect(director.evaluateEvent(event(400), snapshot)).toBeNull();

      // Reset run state clears counters
      director.resetRunState();
      expect(director.evaluateEvent(event(500), snapshot)).not.toBeNull();
    });

    it("should enforce 'cooldownMs' timing limits", () => {
      const director = new MidGameNarrativeDirector();

      const cue: NarrativeCue = {
        id: "shield_down_cue",
        type: "warning",
        priority: 40,
        messageKey: "shield_depleted"
      };

      director.addRule({
        id: "rule_cooldown",
        eventName: "shield_down",
        cooldownMs: 5000,
        cue
      });

      const runtime = new StoryRuntime(sampleGraph);
      const snapshot = runtime.getState();

      // Trigger at t = 1000ms
      expect(
        director.evaluateEvent({ id: "e1", name: "shield_down", timestamp: 1000 }, snapshot)
      ).not.toBeNull();

      // Trigger at t = 3000ms (only 2000ms elapsed, less than 5000ms cooldown) -> rejected
      expect(
        director.evaluateEvent({ id: "e2", name: "shield_down", timestamp: 3000 }, snapshot)
      ).toBeNull();

      // Trigger at t = 6001ms (5001ms elapsed, greater than 5000ms cooldown) -> accepted
      expect(
        director.evaluateEvent({ id: "e3", name: "shield_down", timestamp: 6001 }, snapshot)
      ).not.toBeNull();
    });
  });

  describe("EventBus Integration & MiniGameResult Interception", () => {
    it("should process minigame performance results and mutate StoryRuntime state", () => {
      const director = new MidGameNarrativeDirector();
      const eventBus = new EventBus();
      const runtime = new StoryRuntime(sampleGraph);

      director.bindEventBus(eventBus, runtime);

      // Emit game:over with perfect performance score
      eventBus.emit("game:over", {
        runId: "run_101",
        score: 3500,
        completed: true
      });

      expect(runtime.getState().variables["lastMinigameScore"]).toBe(3500);
      expect(runtime.getState().variables["lastMinigameCompleted"]).toBe(true);
      expect(runtime.getState().variables["playerPerformance"]).toBe("perfect");
    });

    it("should navigate to target node when matching game:over cue contains navigateToNode payload", () => {
      const director = new MidGameNarrativeDirector();
      const eventBus = new EventBus();
      const runtime = new StoryRuntime(sampleGraph);

      director.bindEventBus(eventBus, runtime);

      const victoryCue: NarrativeCue = {
        id: "victory_cue",
        type: "radio",
        priority: 100,
        payload: { navigateToNode: "node_victory" }
      };

      director.addRule({
        id: "rule_victory_navigate",
        eventName: "game:over",
        cue: victoryCue
      });

      expect(runtime.getCurrentNode()?.id).toBe("node_start");

      eventBus.emit("game:over", {
        runId: "run_victory",
        score: 2500,
        completed: true
      });

      expect(runtime.getCurrentNode()?.id).toBe("node_victory");
    });
  });

  describe("Race Condition Safety", () => {
    it("should handle rapid concurrent evaluation calls without race condition corruption", () => {
      const director = new MidGameNarrativeDirector();

      const cue: NarrativeCue = {
        id: "rapid_cue",
        type: "glitch",
        priority: 30,
        messageKey: "signal_interference"
      };

      director.addRule({
        id: "rule_rapid",
        eventName: "rapid_event",
        maxTriggersPerRun: 10,
        cooldownMs: 50,
        cue
      });

      const runtime = new StoryRuntime(sampleGraph);
      const snapshot = runtime.getState();

      const results: Array<NarrativeCue | null> = [];
      for (let i = 0; i < 50; i++) {
        const timestamp = 1000 + i * 10; // Every 10ms
        results.push(
          director.evaluateEvent(
            { id: `rapid_${i}`, name: "rapid_event", timestamp },
            snapshot
          )
        );
      }

      // Expected: accepted every 50ms (at i = 0, 5, 10, 15, 20, 25, 30, 35, 40, 45 -> 10 times max)
      const nonNullResults = results.filter((r) => r !== null);
      expect(nonNullResults.length).toBe(10);
    });
  });
});
