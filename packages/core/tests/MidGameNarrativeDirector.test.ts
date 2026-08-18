import {
  GameplayEvent,
  MidGameDirectorRule,
  MidGameNarrativeDirector,
  StoryRuntimeSnapshot
} from "../src/story";

describe("MidGameNarrativeDirector Test Suite", () => {
  const mockSnapshot: StoryRuntimeSnapshot = {
    graphId: "graph_1",
    currentNodeId: "node_1",
    flags: {},
    variables: { reactorPower: 30 },
    selectedChoices: [],
    objectives: {},
    history: []
  };

  const shieldRule: MidGameDirectorRule = {
    id: "rule_shield_low",
    eventName: "ShieldCritical",
    condition: (_event, snapshot) => {
      const power = typeof snapshot.variables.reactorPower === "number" ? snapshot.variables.reactorPower : 100;
      return power < 50;
    },
    cue: {
      id: "cue_shield_warning",
      type: "radio",
      priority: 10,
      titleKey: "ARES WARNING",
      rawText: "Reactor power depleted! Shielding compromised.",
      durationMs: 3000,
      audioCueId: "sfx_alarm_01"
    },
    cooldownMs: 5000,
    maxTriggersPerRun: 2
  };

  it("evaluates matching gameplay event and generates narrative cue", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const event: GameplayEvent = {
      id: "ev_1",
      name: "ShieldCritical",
      timestamp: 10000
    };

    const cue = director.evaluateEvent(event, mockSnapshot);
    expect(cue).not.toBeNull();
    expect(cue?.id).toBe("cue_shield_warning");
    expect(cue?.audioCueId).toBe("sfx_alarm_01");
  });

  it("enforces cooldownMs constraint between consecutive events", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const event1: GameplayEvent = { id: "e1", name: "ShieldCritical", timestamp: 10000 };
    const event2: GameplayEvent = { id: "e2", name: "ShieldCritical", timestamp: 12000 }; // Only 2000ms later (cooldown is 5000ms)

    const cue1 = director.evaluateEvent(event1, mockSnapshot);
    expect(cue1).not.toBeNull();

    const cue2 = director.evaluateEvent(event2, mockSnapshot);
    expect(cue2).toBeNull(); // Blocked by cooldownMs
  });

  it("enforces maxTriggersPerRun constraint", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const e1: GameplayEvent = { id: "e1", name: "ShieldCritical", timestamp: 10000 };
    const e2: GameplayEvent = { id: "e2", name: "ShieldCritical", timestamp: 20000 };
    const e3: GameplayEvent = { id: "e3", name: "ShieldCritical", timestamp: 30000 };

    expect(director.evaluateEvent(e1, mockSnapshot)).not.toBeNull();
    expect(director.evaluateEvent(e2, mockSnapshot)).not.toBeNull();
    expect(director.evaluateEvent(e3, mockSnapshot)).toBeNull(); // Blocked: maxTriggersPerRun is 2
  });
});
