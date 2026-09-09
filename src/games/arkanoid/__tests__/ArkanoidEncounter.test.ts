import { MiniGameRunContext, GameDefinitionRegistry, MiniGameResult } from "@tiny-aster/core";
import { ArkanoidArcadeAdapter, arkanoidEscapeEncounter } from "../ArkanoidArcadeAdapter";
import { ArkanoidDefinition } from "../ArkanoidGame";

describe("ArkanoidArcadeAdapter & Encounter Test Suite", () => {
  beforeAll(() => {
    GameDefinitionRegistry.register("arkanoid", ArkanoidDefinition);
  });

  it("should verify gameId registration in GameDefinitionRegistry", () => {
    expect(GameDefinitionRegistry.has("arkanoid")).toBe(true);
    const def = GameDefinitionRegistry.resolve("arkanoid");
    expect(def.name).toBe("arkanoid");
  });

  it("should initialize adapter, create game and build result", async () => {
    const adapter = new ArkanoidArcadeAdapter();
    let capturedResult: MiniGameResult | null = null;
    adapter.onResult((res) => {
      capturedResult = res;
    });

    const mockContext: MiniGameRunContext = {
      runId: "test_run_1",
      gameId: "arkanoid",
      encounterId: "arkanoid_escape_01",
      seed: 42,
      config: arkanoidEscapeEncounter.baseConfig || { targetScore: 1000 },
      modifiers: []
    };

    const dummyHost = {} as HTMLElement;
    adapter.initialize(mockContext, dummyHost);

    adapter.emitResult(mockContext, {
      score: 1200,
      completed: true,
      durationMs: 25000,
      foundCore: true
    });

    expect(capturedResult).not.toBeNull();
    expect(capturedResult!.runId).toBe("test_run_1");
    expect(capturedResult!.gameId).toBe("arkanoid");
    expect(capturedResult!.score).toBe(1200);
    expect(capturedResult!.completed).toBe(true);
    expect(capturedResult!.secretsFound).toContain("quantum_brick_core");

    adapter.dispose();
  });
});
