import { World, CoreComponentRegistry, EventRegistry, MiniGameRunContext, RunState, ConfigService, Renderer, RenderContext } from "@tiny-aster/core";
import { CanvasRenderer } from "@tiny-aster/renderer-canvas";
import { EchoRunnerGame } from "../EchoRunnerGame";
import { EchoRunnerArcadeAdapter } from "../story/EchoRunnerEncounter";
import { EchoRunnerConfigSchema, EchoRunnerConfig } from "../types/EchoRunnerConfigSchema";

class TestEchoRunnerAdapter extends EchoRunnerArcadeAdapter {
  public getGame(): EchoRunnerGame | null {
    return this.game;
  }
  public buildTestResult(context: MiniGameRunContext, payload?: unknown) {
    return this.buildResult(context, payload);
  }
}

const mockPaintInstance = {
  reset: jest.fn(),
  setAntiAlias: jest.fn(),
  setStyle: jest.fn(),
  setColor: jest.fn(),
  setStrokeWidth: jest.fn(),
  setAlphaf: jest.fn()
};

jest.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Color: jest.fn((col) => col),
    PaintStyle: { Fill: 0, Stroke: 1 },
    XYWHRect: jest.fn((x, y, w, h) => ({ x, y, w, h })),
    RRectXY: jest.fn((rect, rx, ry) => ({ rect, rx, ry })),
    Paint: jest.fn(() => mockPaintInstance),
    Path: {
      Make: jest.fn(() => ({
        addArc: jest.fn(),
        close: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn()
      }))
    }
  }
}));

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

  afterEach(() => {
    game?.destroy();
  });

  it("should maintain expected registered platformer and echorunner systems schedule snapshot", () => {
    const registeredSystems = (world.schedule as any).systems.map((s: any) => ({
      phase: s.phase,
      systemName: s.system.constructor.name
    }));

    expect(registeredSystems).toMatchSnapshot();
    expect(world.schedule.getSystems().length).toBeGreaterThan(0);
  });

  it("should throw a descriptive validation error when invalid config overrides are passed to ConfigService.load", () => {
    expect(() => {
      ConfigService.load("echorunner", EchoRunnerConfigSchema, { PLAYER_SPEED: -5 });
    }).toThrow(/Configuration validation failed for game "echorunner"/);

    expect(() => {
      ConfigService.load("echorunner", EchoRunnerConfigSchema, { TILE_SIZE: 0 });
    }).toThrow(/Configuration validation failed for game "echorunner"/);

    expect(() => {
      ConfigService.load("echorunner", EchoRunnerConfigSchema, { PLAYER_JUMP_VEL: "super_high" });
    }).toThrow(/Configuration validation failed for game "echorunner"/);
  });

  it("should correctly parse and apply valid config overrides when loaded via ConfigService.load", () => {
    const loaded = ConfigService.load<EchoRunnerConfig>("echorunner", EchoRunnerConfigSchema, {
      PLAYER_SPEED: 350,
      TILE_SIZE: 32
    });

    expect(loaded.PLAYER_SPEED).toBe(350);
    expect(loaded.TILE_SIZE).toBe(32);
    expect(loaded.worldWidth).toBe(800); // verify Zod defaults are merged
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

  it("should maintain opposite directional state when partial input updates are sent", () => {
    const playerEntity = world.query("PlatformerInput")[0];

    // Send touch down for moveRight only
    game.setInputState({ moveRight: true });
    let inputComp = world.getComponent(playerEntity, "PlatformerInput") as any;
    expect(inputComp.moveDir).toBe(1);

    // Send jump trigger without passing moveRight/moveLeft
    game.setInputState({ jump: true });
    inputComp = world.getComponent(playerEntity, "PlatformerInput") as any;
    expect(inputComp.moveDir).toBe(1);

    // Send touch up for moveRight
    game.setInputState({ moveRight: false });
    inputComp = world.getComponent(playerEntity, "PlatformerInput") as any;
    expect(inputComp.moveDir).toBe(0);
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

  it("should render a frame with CanvasRenderer executing background and shape drawing functions on the 2D context", () => {
    const renderer = new CanvasRenderer();
    game.initializeRenderer(renderer as Renderer<CoreComponentRegistry, RenderContext>);

    const mockCtx: Partial<CanvasRenderingContext2D> = {
      canvas: { width: 800, height: 600 } as HTMLCanvasElement,
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
      rect: jest.fn(),
      clip: jest.fn(),
      arc: jest.fn(),
      ellipse: jest.fn(),
      closePath: jest.fn(),
      createLinearGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
      createRadialGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
      roundRect: jest.fn(),
    };

    renderer.render(world, mockCtx as CanvasRenderingContext2D);

    // Verify specific drawing calls were executed on the 2D context
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600); // Letterbox / void fill
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
  });

  it("should register and execute all Skia visual drawers on a frame draw call", () => {
    const registeredShapes = new Map<string, any>();
    const registeredEffects = new Map<string, any>();

    const skiaRenderer: Partial<Renderer<CoreComponentRegistry, RenderContext>> = {
      type: "skia",
      registerShape: (name: string, drawer: any) => { registeredShapes.set(name, drawer); },
      registerBackgroundEffect: (name: string, drawer: any) => { registeredEffects.set(name, drawer); },
    };

    game.initializeRenderer(skiaRenderer as Renderer<CoreComponentRegistry, RenderContext>);

    expect(registeredEffects.has("echo_bg")).toBe(true);
    expect(Array.from(registeredShapes.keys())).toEqual(
      expect.arrayContaining([
        "player",
        "fragment",
        "core",
        "node",
        "pulse_attack",
        "sentinel",
        "hopper",
        "watcher",
        "charger"
      ])
    );

    const mockSkiaCanvas = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      drawRect: jest.fn(),
      drawLine: jest.fn(),
      drawCircle: jest.fn(),
      drawOval: jest.fn(),
      drawPath: jest.fn(),
      drawRoundRect: jest.fn(),
    };

    // 1. Execute Skia Background Effect
    const bgDrawer = registeredEffects.get("echo_bg");
    bgDrawer.draw(mockSkiaCanvas, world);
    expect(mockSkiaCanvas.drawRect).toHaveBeenCalled();
    expect(mockSkiaCanvas.drawLine).toHaveBeenCalled();

    // 2. Execute Skia Player Shape Drawer
    const playerEntity = world.query("PlatformerInput")[0];
    const playerDrawer = registeredShapes.get("player");
    playerDrawer.draw(mockSkiaCanvas, world, playerEntity);

    expect(mockSkiaCanvas.save).toHaveBeenCalled();
    expect(mockSkiaCanvas.translate).toHaveBeenCalled();
    expect(mockSkiaCanvas.rotate).toHaveBeenCalled();
    expect(mockSkiaCanvas.drawPath).toHaveBeenCalled();
    expect(mockSkiaCanvas.restore).toHaveBeenCalled();

    // 3. Execute enemy and collectible drawers
    const enemies = world.query("Enemy");
    for (const enemy of enemies) {
      const render = world.getComponent(enemy, "Render");
      if (render && render.shape && registeredShapes.has(render.shape)) {
        registeredShapes.get(render.shape).draw(mockSkiaCanvas, world, enemy);
      }
    }
    expect(mockSkiaCanvas.drawCircle).toHaveBeenCalled();
  });

  it("should throw a descriptive error when required player blueprint is missing during entity initialization", async () => {
    const badGame = new EchoRunnerGame({ seed: 12345 });
    // Intentionally bypass blueprint registration or clear blueprints
    (badGame as any).blueprints.blueprints.clear();
    await expect((badGame as any).onInitializeEntities()).rejects.toThrow("[EchoRunnerGame]");
  });

  it("should materialize level plan (tilemap, enemies, collectibles, player) during game.init() production path without manual flush", async () => {
    const prodGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await prodGame.init();
      const prodWorld = prodGame.getWorld();

      // Verify all level elements exist immediately after init()
      const players = prodWorld.query("PlatformerInput");
      expect(players.length).toBeGreaterThan(0);

      const tilemaps = prodWorld.query("Tilemap");
      expect(tilemaps.length).toBeGreaterThan(0);

      const enemies = prodWorld.query("Enemy");
      expect(enemies.length).toBeGreaterThan(0);

      const collectibles = prodWorld.query("Collectible");
      expect(collectibles.length).toBeGreaterThan(0);

      // Simulate 2 frames of gameplay update
      prodGame.update(0.016);
      prodGame.update(0.016);

      // Verify player is alive and level geometry remains intact
      const playerEntity = players[0];
      expect(prodWorld.isAlive(playerEntity)).toBe(true);

      const playerTrans = prodWorld.getComponent(playerEntity, "Transform");
      expect(playerTrans).toBeDefined();

      // Simulate input movement
      prodGame.setInputState({ moveRight: true });
      prodGame.update(0.1);

      const playerVel = prodWorld.getComponent(playerEntity, "Velocity");
      expect(playerVel?.vx).toBeGreaterThan(0);
    } finally {
      prodGame.destroy();
    }
  });

  it("should equip player with Collider2D and Health components, ensuring ground collision resolution", async () => {
    const testGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await testGame.init();
      const testWorld = testGame.getWorld();
      const playerEntity = testWorld.query("PlatformerInput")[0];

      // Assert player possesses Collider2D and Health components
      expect(testWorld.hasComponent(playerEntity, "Collider2D")).toBe(true);
      expect(testWorld.hasComponent(playerEntity, "Health")).toBe(true);

      const initialTrans = testWorld.getComponent(playerEntity, "Transform")!;
      const initialY = initialTrans.y;

      // Update simulation over multiple frames (~0.6s) to allow gravity to pull player onto tilemap ground
      for (let i = 0; i < 40; i++) {
        testGame.update(0.016);
      }

      const groundState = testWorld.getComponent(playerEntity, "PlatformerGroundState")!;
      expect(groundState.isGrounded).toBe(true);

      const currentTrans = testWorld.getComponent(playerEntity, "Transform")!;
      // Player should be resting on the tile ground (~425 y) rather than falling endlessly into death plane (650+)
      expect(currentTrans.y).toBeLessThan(600);
      expect(currentTrans.y).toBeGreaterThan(initialY);
    } finally {
      testGame.destroy();
    }
  });

  it("should update worldX and worldY coordinates to match x and y after simulation ticks, including child entities", async () => {
    const testGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await testGame.init();
      const testWorld = testGame.getWorld();
      const playerEntity = testWorld.query("PlatformerInput")[0];

      // Update frames until player is grounded
      for (let i = 0; i < 40; i++) {
        testGame.update(0.016);
      }

      let playerTrans = testWorld.getComponent(playerEntity, "Transform")!;
      // Player should be grounded at y ≈ 425 and worldY should follow y (not frozen at spawn 350)
      expect(Math.abs(playerTrans.worldY - playerTrans.y)).toBeLessThan(1.0);
      expect(playerTrans.worldY).toBeGreaterThan(400);

      const spawnWorldX = playerTrans.worldX;

      // Move player right
      testGame.setInputState({ moveRight: true });
      for (let i = 0; i < 10; i++) {
        testGame.update(0.016);
      }

      playerTrans = testWorld.getComponent(playerEntity, "Transform")!;
      expect(playerTrans.x).toBeGreaterThan(100);
      expect(playerTrans.worldX).toBeCloseTo(playerTrans.x, 1);
      expect(playerTrans.worldX).toBeGreaterThan(spawnWorldX);

      // Trigger pulse attack child entity
      testGame.setInputState({ pulse: true });
      testGame.update(0.016);

      const hitboxes = testWorld.query("Hitbox");
      expect(hitboxes.length).toBe(1);
      const pulseEntity = hitboxes[0];
      const pulseTrans = testWorld.getComponent(pulseEntity, "Transform")!;

      expect(pulseTrans.parentEntity).toBe(playerEntity);
      // Local x is dir * 25 (dir = 1), local y is 0.
      // So worldX should be playerTrans.worldX + 25, worldY should be playerTrans.worldY.
      expect(pulseTrans.worldX).toBeCloseTo(playerTrans.worldX + 25, 1);
      expect(Math.abs(pulseTrans.worldY - playerTrans.worldY)).toBeLessThan(1.0);
    } finally {
      testGame.destroy();
    }
  });

  it("should update GameConfig worldWidth/worldHeight with level dimensions and allow Camera2D to follow player beyond initial screen bounds", async () => {
    const testGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await testGame.init();
      const testWorld = testGame.getWorld();
      const levelPlan = testGame.getLevelPlan();
      const gameConfig = testWorld.getResource<{ TILE_SIZE: number; worldWidth?: number; worldHeight?: number }>("GameConfig");

      expect(gameConfig).toBeDefined();
      expect(gameConfig?.worldWidth).toBe(levelPlan.totalWidth * (gameConfig?.TILE_SIZE ?? 40));
      expect(gameConfig?.worldHeight).toBe(levelPlan.totalHeight * (gameConfig?.TILE_SIZE ?? 40));
      expect(gameConfig?.worldWidth).toBeGreaterThan(1000);

      const cameraEntity = testWorld.query("Camera2D")[0];
      expect(cameraEntity).toBeDefined();

      const initialCam = testWorld.getComponent(cameraEntity, "Camera2D")!;
      const initialCamX = initialCam.x;

      // Move player significantly to the right
      testGame.setInputState({ moveRight: true });
      for (let i = 0; i < 120; i++) {
        testGame.update(0.016);
      }

      const playerEntity = testWorld.query("PlatformerInput")[0];
      const playerTrans = testWorld.getComponent(playerEntity, "Transform")!;
      expect(playerTrans.x).toBeGreaterThan(400);

      const updatedCam = testWorld.getComponent(cameraEntity, "Camera2D")!;
      expect(updatedCam.x).toBeGreaterThan(initialCamX);
      expect(updatedCam.x).toBeGreaterThan(0);
    } finally {
      testGame.destroy();
    }
  });

  it("should handle full gameplay death lifecycle by respawning player at active checkpoint and incrementing attempts and deaths", async () => {
    const lifecycleGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await lifecycleGame.init();
      const testWorld = lifecycleGame.getWorld();
      const playerEntity = testWorld.query("PlatformerInput")[0];

      let state = lifecycleGame.getGameState();
      expect(state.attempts).toBe(1);
      expect(state.deaths).toBe(0);

      const runState = testWorld.getResource<RunState>("RunState");
      expect(runState).toBeDefined();
      runState!.activeCheckpoint = "checkpoint_node_1";

      const cpEntity = testWorld.createEntity();
      testWorld.addComponent(cpEntity, {
        type: "RespawnPoint",
        checkpointId: "checkpoint_node_1",
        x: 400,
        y: 300
      } as CoreComponentRegistry["RespawnPoint"] & { type: "RespawnPoint" });
      testWorld.flush();

      testWorld.mutateComponent(playerEntity, "Health", (h) => {
        h.current = 0;
      });

      // Frame 1: DeathSystem detects health <= 0, marks Dead, increments attempt and deaths
      lifecycleGame.update(0.016);

      state = lifecycleGame.getGameState();
      expect(state.deaths).toBe(1);
      expect(state.attempts).toBe(2);

      // Frame 2: RespawnSystem resets position to active checkpoint, restores health, removes Dead
      lifecycleGame.update(0.016);

      expect(testWorld.hasComponent(playerEntity, "Dead")).toBe(false);
      const playerTrans = testWorld.getComponent(playerEntity, "Transform")!;
      expect(playerTrans.x).toBe(400);
      expect(playerTrans.y).toBe(300);

      const health = testWorld.getComponent(playerEntity, "Health")!;
      expect(health.current).toBe(health.max);
    } finally {
      lifecycleGame.destroy();
    }
  });

  it("should trigger death when falling below DeathPlaneY and respawn player at default start position", async () => {
    const lifecycleGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await lifecycleGame.init();
      const testWorld = lifecycleGame.getWorld();
      const playerEntity = testWorld.query("PlatformerInput")[0];

      testWorld.mutateComponent(playerEntity, "Transform", (t) => {
        t.y = 1050;
      });

      // Frame 1: DeathSystem detects y >= DeathPlaneY
      lifecycleGame.update(0.016);
      expect(lifecycleGame.getGameState().deaths).toBe(1);

      // Frame 2: RespawnSystem resets player to start position (100, 350)
      lifecycleGame.update(0.016);
      const playerTrans = testWorld.getComponent(playerEntity, "Transform")!;
      expect(playerTrans.x).toBe(100);
      expect(playerTrans.y).toBe(350);
    } finally {
      lifecycleGame.destroy();
    }
  });

  it("should generate deterministic level plans when instantiated with identical seeds", async () => {
    const seed = 98765;
    const game1 = new EchoRunnerGame({ seed });
    const game2 = new EchoRunnerGame({ seed });
    const gameDifferentSeed = new EchoRunnerGame({ seed: 12345 });

    try {
      await game1.init();
      await game2.init();
      await gameDifferentSeed.init();

      const plan1 = game1.getLevelPlan();
      const plan2 = game2.getLevelPlan();
      const planDiff = gameDifferentSeed.getLevelPlan();

      expect(plan1).toBeDefined();
      expect(plan2).toBeDefined();

      // Deep equality check for determinism
      expect(plan1).toEqual(plan2);

      // Verify different seed produces different level plan
      expect(plan1).not.toEqual(planDiff);
    } finally {
      game1.destroy();
      game2.destroy();
      gameDifferentSeed.destroy();
    }
  });

  it("should reflect actual game state score in buildResult when payload score is omitted in EchoRunnerArcadeAdapter", async () => {
    const adapter = new TestEchoRunnerAdapter();
    const context: MiniGameRunContext = {
      runId: "test_run_01",
      encounterId: "echo_runner_dash_01",
      gameId: "echorunner",
      seed: 41873,
      config: { targetScore: 1500 },
      modifiers: []
    };

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);

    const gameInstance = adapter.getGame()!;
    await gameInstance.init();

    const runState = gameInstance.getWorld().getResource<RunState>("RunState");
    expect(runState).toBeDefined();
    runState!.collectedTemporalIds.push("frag_1", "frag_2"); // 2 * 10 = 20
    runState!.collectedPermanentIds.push("core_1"); // 1 * 100 = 100 -> score = 120

    const result = adapter.buildTestResult(context, {});
    expect(result.score).toBe(120);
    expect(gameInstance.getGameState().score).toBe(120);

    adapter.dispose();
  });

  it("should detect player overlapping collectibles and collect fragment and core entities", async () => {
    const testGame = new EchoRunnerGame({ seed: 41873 });
    try {
      await testGame.init();
      const testWorld = testGame.getWorld();
      const playerEntity = testWorld.query("PlatformerInput")[0];
      const playerTrans = testWorld.getComponent(playerEntity, "Transform")!;

      // Spawn a collectible fragment directly at player's position
      const fragEntity = testWorld.createEntity();
      testGame.blueprints.get("collectible_fragment")?.spawn(testWorld, fragEntity, {
        x: playerTrans.x,
        y: playerTrans.y,
        id: "test_frag_1"
      });
      testWorld.flush();

      expect(testWorld.isAlive(fragEntity)).toBe(true);

      // Advance game simulation frame to let CollisionSystem2D & CollectibleSystem process pickup
      testGame.update(0.016);

      // Collectible entity should be removed from world
      expect(testWorld.isAlive(fragEntity)).toBe(false);

      // RunState should have recorded collectible ID
      const runState = testWorld.getResource<any>("RunState");
      expect(runState.collectedTemporalIds).toContain("test_frag_1");
      expect(testGame.getGameState().fragments).toBeGreaterThan(0);

      // Now spawn a collectible core at player's position
      const coreEntity = testWorld.createEntity();
      testGame.blueprints.get("collectible_core")?.spawn(testWorld, coreEntity, {
        x: playerTrans.x,
        y: playerTrans.y,
        id: "archive_core_1"
      });
      testWorld.flush();

      expect(testWorld.isAlive(coreEntity)).toBe(true);

      testGame.update(0.016);

      expect(testWorld.isAlive(coreEntity)).toBe(false);
      expect(runState.collectedPermanentIds).toContain("archive_core_1");
      expect(testGame.getGameState().cores).toBe(1);
    } finally {
      testGame.destroy();
    }
  });
});
