import { MutatorRegistry, BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";
import { World } from "@tiny-aster/core";

describe("Meta-progression Store & Draft - supportedGames Filtering", () => {
  it("should include hyper_drift for asteroids but exclude hyper_drift for pong", () => {
    // Check supported for asteroids
    expect(MutatorRegistry.isMutatorSupportedForGame("hyper_drift", "asteroids")).toBe(true);

    // Check unsupported for pong
    expect(MutatorRegistry.isMutatorSupportedForGame("hyper_drift", "pong")).toBe(false);

    const availableForPong = MutatorRegistry.getAvailableForGame("pong");
    const hasHyperDriftInPong = availableForPong.some(m => m.id === "hyper_drift");
    expect(hasHyperDriftInPong).toBe(false);

    const availableForAsteroids = MutatorRegistry.getAvailableForGame("asteroids");
    const hasHyperDriftInAsteroids = availableForAsteroids.some(m => m.id === "hyper_drift");
    expect(hasHyperDriftInAsteroids).toBe(true);
  });

  it("should not generate draft containing hyper_drift when gameId is pong", () => {
    const world = new World();
    const context = { playerId: "player_1", targetEntity: 1 };

    // Generate draft for pong
    const pongDraft = MutatorRegistry.generateDraft(world, "pong", 10, context);
    const hasHyperDrift = pongDraft.some(m => m.id === "hyper_drift");
    expect(hasHyperDrift).toBe(false);
  });

  it("should allow mutators with 'ALL' supportedGames for any game", () => {
    expect(MutatorRegistry.isMutatorSupportedForGame("faster_bullets", "pong")).toBe(true);
    expect(MutatorRegistry.isMutatorSupportedForGame("faster_bullets", "asteroids")).toBe(true);
    expect(MutatorRegistry.isMutatorSupportedForGame("extra_life", "flappybird")).toBe(true);
  });
});
