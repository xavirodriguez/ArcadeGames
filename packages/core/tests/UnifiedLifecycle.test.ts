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
    this.eventBus.emit("game:over", { state: this.getGameState() });
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
    expect(game.world.getResource("IsPaused")).toBeFalsy();
    expect(game.kernel.getState()).toBe(ArcadeState.PLAYING);

    // 3. Trigger pause via kernel transition to PAUSED
    game.kernel.transitionTo(ArcadeState.PAUSED);
    expect(game.isPausedState()).toBe(true);
    expect(game.world.getResource("IsPaused")).toBe(true);
    expect(game.kernel.getState()).toBe(ArcadeState.PAUSED);

    // 4. Trigger resume via game.resume()
    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.world.getResource("IsPaused")).toBeFalsy();
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

  it("should pause simulation systems (movement, physics, collision) when IsPaused resource is true while leaving position intact for N ticks", () => {
    const { PhysicsIntegrateSystem } = require("../src/physics/dynamics/PhysicsIntegrateSystem");
    const { Schedule } = require("../src/ecs/Schedule");
    const { SystemPhase } = require("../src/ecs/System");

    const world = new World();
    const schedule = new Schedule();

    const physicsSystem = new PhysicsIntegrateSystem();
    schedule.addSystem(physicsSystem, { phase: SystemPhase.Simulation }, world);

    // Create physical entity with position and velocity
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 20,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, {
      type: "Velocity",
      vx: 100,
      vy: 50,
      angularVelocity: 0
    });

    // 1. Run 5 ticks unpaused -> Position should change
    for (let i = 0; i < 5; i++) {
      schedule.update(world, 0.1);
    }
    const transform1 = world.getComponent(entity, "Transform") as any;
    expect(transform1.x).toBe(10 + 100 * 0.5); // 60
    expect(transform1.y).toBe(20 + 50 * 0.5);  // 45

    // 2. Set IsPaused resource = true
    world.setResource("IsPaused", true);
    const pausedX = transform1.x;
    const pausedY = transform1.y;

    // Run N ticks paused -> Position must remain completely frozen
    for (let i = 0; i < 10; i++) {
      schedule.update(world, 0.1);
    }

    const transform2 = world.getComponent(entity, "Transform") as any;
    expect(transform2.x).toBe(pausedX);
    expect(transform2.y).toBe(pausedY);

    // 3. Resume (delete IsPaused resource)
    world.deleteResource("IsPaused");
    schedule.update(world, 0.1);
    const transform3 = world.getComponent(entity, "Transform") as any;
    expect(transform3.x).toBeGreaterThan(pausedX);
    expect(transform3.y).toBeGreaterThan(pausedY);
  });

  it("should execute Presentation systems during game.pause() while skipping Simulation, Collision, and GameRules systems", () => {
    const { System, SystemPhase } = require("../src/ecs/System");
    let simulationExecuted = false;
    let collisionExecuted = false;
    let rulesExecuted = false;
    let presentationExecuted = false;

    class TestSimSystem extends System {
      update(): void { simulationExecuted = true; }
    }
    class TestColSystem extends System {
      update(): void { collisionExecuted = true; }
    }
    class TestRulesSystem extends System {
      update(): void { rulesExecuted = true; }
    }
    class TestPresSystem extends System {
      update(): void { presentationExecuted = true; }
    }

    const game = new LifecycleTestGame();
    game.world.addSystem(new TestSimSystem() as any, { phase: SystemPhase.Simulation });
    game.world.addSystem(new TestColSystem() as any, { phase: SystemPhase.Collision });
    game.world.addSystem(new TestRulesSystem() as any, { phase: SystemPhase.GameRules });
    game.world.addSystem(new TestPresSystem() as any, { phase: SystemPhase.Presentation });

    // Pause the game
    game.pause();
    expect(game.isPausedState()).toBe(true);

    // Execute update loop during pause
    game.world.update(0.016);

    expect(simulationExecuted).toBe(false);
    expect(collisionExecuted).toBe(false);
    expect(rulesExecuted).toBe(false);
    expect(presentationExecuted).toBe(true);
  });
});
