import {
  AssistRule,
  DynamicDifficultyManager,
  DEFAULT_ACCESSIBILITY_ASSISTS
} from "../src/story";

describe("Accessibility Assists & DDA Test Suite", () => {
  it("keeps Accessibility Assists config independent from DDA", () => {
    const assists = { ...DEFAULT_ACCESSIBILITY_ASSISTS, autoFire: true, gameSpeed: 0.75 };
    expect(assists.autoFire).toBe(true);
    expect(assists.gameSpeed).toBe(0.75);
    expect(assists.damageMultiplier).toBe(1.0);
  });

  it("tracks encounter attempt history and consecutive failures in DDA", () => {
    const manager = new DynamicDifficultyManager();

    manager.recordAttempt("escape_route_01", false);
    manager.recordAttempt("escape_route_01", false);
    manager.recordAttempt("escape_route_01", false);

    const history = manager.getHistory("escape_route_01");
    expect(history.attempts).toBe(3);
    expect(history.failures).toBe(3);
    expect(history.consecutiveFailures).toBe(3);

    const assistRule: AssistRule = {
      id: "ares_stabilization",
      encounterId: "escape_route_01",
      minConsecutiveFailures: 3,
      diegeticOfferMessageKey: "ARES offers ship stabilization",
      modifier: {
        id: "ares_shield_buff",
        targetProperty: "shieldMultiplier",
        value: 1.5
      }
    };

    expect(manager.shouldOfferAssistance(assistRule)).toBe(true);

    // After success, consecutive failures reset
    manager.recordAttempt("escape_route_01", true);
    expect(manager.getHistory("escape_route_01").consecutiveFailures).toBe(0);
    expect(manager.shouldOfferAssistance(assistRule)).toBe(false);
  });
});
