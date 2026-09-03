import { BaseGame, WorldSnapshot } from "../index";

class ConcreteTestGame extends BaseGame<any, any, any, any, any> {
  public update(_dt: number): void {}
  public getGameState(): any { return { score: 100 }; }
  public isGameOver(): boolean { return false; }

  public testSetupCommonArcadeResources(): void {
    this.setupCommonArcadeResources();
  }
}

describe("BaseGame Lifecycle and Arcade Resources", () => {
  it("should initialize default screen config resource and handle resize", () => {
    const game = new ConcreteTestGame();
    game.testSetupCommonArcadeResources();

    const screen = game.world.getResource<{ width: number; height: number }>("ScreenConfig");
    expect(screen).toBeDefined();
    expect(screen?.width).toBeGreaterThan(0);
    expect(screen?.height).toBeGreaterThan(0);

    game.destroy();
  });

  it("should apply server state update and flush world", () => {
    const game = new ConcreteTestGame();
    const snapshot: WorldSnapshot = {
      tick: 42,
      entities: [1],
      componentData: {},
      stateVersion: 1,
      structureVersion: 1,
      seed: 12345,
      nextEntityId: 2,
      freeEntities: []
    };

    game.applyServerStateUpdate(snapshot);
    expect(game.tick).toBe(42);

    game.destroy();
  });

  it("should toggle pause and sync IsPaused world resource", () => {
    const game = new ConcreteTestGame();
    expect(game.isPausedState()).toBe(false);

    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.world.getResource("IsPaused")).toBe(true);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.world.getResource("IsPaused")).toBeUndefined();

    game.destroy();
  });

  it("should cleanup resources on destroy", () => {
    const game = new ConcreteTestGame();
    game.testSetupCommonArcadeResources();
    game.destroy();

    expect(game.getLifecycleState()).toBe("DESTROYED");
  });
});
