import { MiniGameResult, MiniGameRunContext } from "@tiny-aster/core";
import { BaseArcadeAdapter } from "../adapters/BaseArcadeAdapter";
import { AsteroidsGame } from "../../../asteroids/AsteroidsGame";

class TestAsteroidsAdapter extends BaseArcadeAdapter<AsteroidsGame> {
  public getGame(): AsteroidsGame | null {
    return this.game;
  }

  public getResultCallback(): ((result: MiniGameResult) => void) | null {
    return this.resultCallback;
  }

  protected createGame(_context: MiniGameRunContext): AsteroidsGame {
    return new AsteroidsGame();
  }

  protected buildResult(context: MiniGameRunContext, payload?: unknown): MiniGameResult {
    const payloadObj = payload as { score?: number } | undefined;
    return {
      runId: context.runId,
      gameId: context.gameId,
      score: payloadObj?.score ?? 500,
      completed: true,
      durationMs: 15000,
      metrics: {},
      secretsFound: []
    };
  }
}

describe("BaseArcadeAdapter", () => {
  it("should initialize game, listen for completion events and emit result", (done) => {
    const adapter = new TestAsteroidsAdapter();
    const mockContext: MiniGameRunContext = {
      runId: "run_1",
      encounterId: "test_encounter",
      gameId: "asteroids",
      seed: 1234,
      config: { difficulty: "normal" },
      modifiers: [
        { id: "m1", targetProperty: "mode", value: "deathmatch" }
      ]
    };

    adapter.onResult((result) => {
      expect(result.runId).toBe("run_1");
      expect(result.score).toBe(1000);
      expect(result.completed).toBe(true);
      adapter.dispose();
      done();
    });

    const mockHost = {} as HTMLElement;
    adapter.initialize(mockContext, mockHost);

    // Simulate completion event
    adapter.emitResult(mockContext, { score: 1000 });
  });

  it("should dispose game instance cleanly", () => {
    const adapter = new TestAsteroidsAdapter();
    const mockContext: MiniGameRunContext = {
      runId: "run_2",
      encounterId: "test_encounter",
      gameId: "asteroids",
      seed: 1234,
      config: { difficulty: "normal" },
      modifiers: []
    };

    adapter.initialize(mockContext, {} as HTMLElement);
    expect(adapter.getGame()).toBeDefined();

    adapter.dispose();
    expect(adapter.getGame()).toBeNull();
    expect(adapter.getResultCallback()).toBeNull();
  });
});
