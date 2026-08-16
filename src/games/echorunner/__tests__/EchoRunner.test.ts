import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { CanvasRenderer } from "@tiny-aster/renderer-canvas";
import { EchoRunnerGame } from "../EchoRunnerGame";

describe("Echo Runner Game Simulation Tests", () => {
  let game: EchoRunnerGame;
  let world: World<CoreComponentRegistry>;

  beforeEach(async () => {
    // Create game simulation using the seed
    game = new EchoRunnerGame({ seed: 41873 });
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();
    world = game.getWorld();
    world.flush(); // Flush deferred commands to spawn segment templates
  });

  it("should initialize with 1 attempt, 0 deaths, 0 fragments, and 0 cores collected", () => {
    const state = game.getGameState();
    expect(state.attempts).toBe(1);
    expect(state.deaths).toBe(0);
    expect(state.fragments).toBe(0);
    expect(state.cores).toBe(0);
    expect(state.isGameOver).toBe(false);
  });

  it("should process physical movement input and alter player velocities", () => {
    // Set movement to the right
    game.setInputState({ moveLeft: false, moveRight: true });

    // Simulate some frames
    game.update(0.1);

    const playerEntity = world.query("PlatformerInput")[0];
    const vel = world.getComponent(playerEntity, "Velocity")!;
    expect(vel.vx).toBeGreaterThan(0);

    // Set movement to the left
    game.setInputState({ moveLeft: true, moveRight: false });
    game.update(0.1);
    expect(vel.vx).toBeLessThan(220); // Should decelerate or accelerate left
  });

  it("should trigger a Pulse attack on input, spawning a Hitbox child entity with TTL", () => {
    const playerEntity = world.query("PlatformerInput")[0];

    // Set pulse attack trigger
    game.setInputState({ pulse: true });

    // Update simulation frame
    game.update(0.016);

    // A pulse attack entity should have been created with Hitbox, Collider2D, and TTL
    const hitboxes = world.query("Hitbox");
    expect(hitboxes.length).toBe(1);

    const hitboxEntity = hitboxes[0];
    const ttl = world.getComponent(hitboxEntity, "TTL")!;
    expect(ttl).toBeDefined();
    expect(ttl.remaining).toBeCloseTo(0.15);

    const trans = world.getComponent(hitboxEntity, "Transform")!;
    expect(trans.parentEntity).toBe(playerEntity);
  });

  it("should decrease player health on contact with enemies unless invulnerable", () => {
    const playerEntity = world.query("PlatformerInput", "Health")[0];
    const enemyEntity = world.query("Enemy")[0];

    // Place enemy directly on top of the player
    const pTrans = world.getComponent(playerEntity, "Transform")!;
    const eTrans = world.getComponent(enemyEntity, "Transform")!;

    world.mutateComponent(enemyEntity, "Transform", (t) => {
      t.x = pTrans.x;
      t.y = pTrans.y;
    });

    const healthBefore = world.getComponent(playerEntity, "Health")!.current;

    // Update simulation (0.0001s timestep so position is kept identical but systems run)
    game.update(0.0001);

    const healthAfter = world.getComponent(playerEntity, "Health")!.current;
    expect(healthAfter).toBeLessThan(healthBefore);

    // Player should now be invulnerable
    const health = world.getComponent(playerEntity, "Health")!;
    expect(health.invulnerableRemaining).toBeGreaterThan(0);
  });

  it("should emit game:over event and transition ArcadeKernel to GAME_OVER when core is collected", () => {
    // Transition ArcadeKernel from BOOT -> LOADING -> TITLE -> MENU -> PLAYING
    game.kernel.transitionTo("LOADING" as any);
    game.kernel.transitionTo("MENU" as any);
    game.kernel.transitionTo("PLAYING" as any);

    const runState = world.getResource<any>("RunState");
    expect(runState).toBeDefined();

    const gameOverListener = jest.fn();
    game.getEventBus().on("game:over", gameOverListener);

    // Simulate archive core collection
    runState.collectedPermanentIds.push("archive_core_1");

    // Advance simulation
    game.update(0.016);

    expect(game.isGameOver()).toBe(true);
    expect(gameOverListener).toHaveBeenCalledTimes(1);
    expect(game.kernel.getState()).toBe("GAME_OVER");
  });

  it("should initialize renderer with valid shape and background drawers and render a frame without errors", () => {
    const renderer = new CanvasRenderer();
    expect(() => game.initializeRenderer(renderer as any)).not.toThrow();

    // Create a dummy 2D canvas context for testing rendering
    const dummyCtx = {
      canvas: { width: 800, height: 600 },
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      arc: jest.fn(),
      ellipse: jest.fn(),
      closePath: jest.fn(),
      createLinearGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
      createRadialGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
      roundRect: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() => renderer.render(world, dummyCtx)).not.toThrow();
  });
});
