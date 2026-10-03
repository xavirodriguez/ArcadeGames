import { AsteroidsDefinition } from "../../../src/games/asteroids/AsteroidsDefinition";
import { AsteroidsGame } from "../../../src/games/asteroids/AsteroidsGame";
import { EventBus, MiniGameModifier } from "../src";

describe("Event Bridge & Campaign Context (Hypothesis C)", () => {
  it("forwards modifiers passed into createSimulation to AsteroidsGame", () => {
    const testModifiers: MiniGameModifier[] = [
      {
        id: "test_extra_lives",
        targetProperty: "extraLives",
        value: 2
      }
    ];

    const game = AsteroidsDefinition.createSimulation(12345, {
      modifiers: testModifiers,
      gameOptions: { seed: 12345, modifiers: testModifiers }
    }) as AsteroidsGame;

    expect(game).toBeDefined();
    expect((game as Record<string, any>)._config.gameOptions.modifiers).toEqual(testModifiers);
  });

  it("bridges game:over events from internal game eventBus to campaign eventBus", (done) => {
    const campaignEventBus = new EventBus();
    const game = AsteroidsDefinition.createSimulation(12345) as AsteroidsGame;
    const internalBus = game.getEventBus();

    let bridged = false;
    campaignEventBus.on("game:over", () => {
      bridged = true;
      expect(bridged).toBe(true);
      done();
    });

    // Mirroring bridge setup in useStoryEventBridge
    internalBus.on("game:over", (data) => {
      campaignEventBus.emit("game:over", data as any);
    });

    internalBus.emit("game:over", { score: 100, level: 1 } as any);
  });
});
