import { BaseGame } from "../src/runtime/BaseGame";
import { GameSession } from "../src/runtime/GameSession";
import { ArcadeState } from "../src/runtime/ArcadeKernel";
import { GameDefinition } from "../src/runtime/GameDefinition";
import { World } from "../src/ecs/World";

interface TestState {
  score: number;
  gameOver: boolean;
}

class LifecycleTestGame extends BaseGame<TestState, any> {
  private customGameOver = false;
  private customScore = 0;

  constructor(seed = 12345) {
    super({
      gameOptions: { seed }
    });
  }

  public override update(dt: number): void {
    // Basic update logic
  }

  public override getGameState(): TestState {
    return { score: this.customScore, gameOver: this.customGameOver };
  }

  public override isGameOver(): boolean {
    return this.customGameOver;
  }

  public triggerGameOver(score: number): void {
    this.customGameOver = true;
    this.customScore = score;
    this.eventBus.emit("game:over" as any, { state: this.getGameState() });
  }
}

const mockLifecycleDefinition: GameDefinition = {
  name: "test-lifecycle-game",
  createSimulation: (seed) => {
    const game = new LifecycleTestGame(seed);
    return game;
  },
  inputSchema: {
    actions: ["action1"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};

describe("Unified Lifecycle Integration - Pausa y Fin de Juego", () => {
  it("should bidirectional-sync pause and resume between BaseGame and ArcadeKernel", () => {
    const game = new LifecycleTestGame();

    // Set initial state to PLAYING to mimic real gameplay setup
    game.kernel.transitionTo(ArcadeState.LOADING);
    game.kernel.transitionTo(ArcadeState.TITLE);
    game.kernel.transitionTo(ArcadeState.PLAYING);

    expect(game.kernel.getState()).toBe(ArcadeState.PLAYING);
    expect(game.world.getResource("IsPaused")).toBeUndefined();

    // 1. Trigger pause via game.pause()
    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.world.getResource("IsPaused")).toBe(true);
    expect(game.kernel.getState()).toBe(ArcadeState.PAUSED);

    // 2. Trigger resume via kernel transition to PLAYING
    game.kernel.transitionTo(ArcadeState.PLAYING);
    expect(game.isPausedState()).toBe(false);
    expect(game.world.getResource("IsPaused")).toBe(false);
    expect(game.kernel.getState()).toBe(ArcadeState.PLAYING);

    // 3. Trigger pause via kernel transition to PAUSED
    game.kernel.transitionTo(ArcadeState.PAUSED);
    expect(game.isPausedState()).toBe(true);
    expect(game.world.getResource("IsPaused")).toBe(true);
    expect(game.kernel.getState()).toBe(ArcadeState.PAUSED);

    // 4. Trigger resume via game.resume()
    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.world.getResource("IsPaused")).toBe(false);
    expect(game.kernel.getState()).toBe(ArcadeState.PLAYING);
  });

  it("should transition ArcadeKernel to GAME_OVER automatically when game over event is emitted", () => {
    const game = new LifecycleTestGame();

    game.kernel.transitionTo(ArcadeState.LOADING);
    game.kernel.transitionTo(ArcadeState.TITLE);
    game.kernel.transitionTo(ArcadeState.PLAYING);

    expect(game.kernel.getState()).toBe(ArcadeState.PLAYING);

    // Trigger game over
    game.triggerGameOver(500);

    expect(game.isGameOver()).toBe(true);
    expect(game.kernel.getState()).toBe(ArcadeState.GAME_OVER);
  });

  it("should transition ArcadeKernel to GAME_OVER inside GameSession playTick", () => {
    const session = new GameSession(mockLifecycleDefinition, 42);
    const simulation = session.simulation as LifecycleTestGame;

    session.kernel.transitionTo(ArcadeState.LOADING);
    session.kernel.transitionTo(ArcadeState.TITLE);
    session.kernel.transitionTo(ArcadeState.PLAYING);

    expect(session.kernel.getState()).toBe(ArcadeState.PLAYING);

    // Make simulation hit game over
    simulation.triggerGameOver(100);

    // Advancing tick should automatically check game over and transition
    session.playTick({ t: 1, b: 0 });

    expect(session.kernel.getState()).toBe(ArcadeState.GAME_OVER);
  });

  it("should automatically disable legacy auto loop and switch to manual mode when inside GameSession", () => {
    const session = new GameSession(mockLifecycleDefinition, 42);
    const simulation = session.simulation as LifecycleTestGame;

    // The simulation's loop should be set to manual automatically by GameSession
    expect(simulation.getGameLoop().manual).toBe(true);
  });
});
