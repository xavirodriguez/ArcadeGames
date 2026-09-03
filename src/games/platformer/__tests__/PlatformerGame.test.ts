import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { CanvasRenderer } from "@tiny-aster/renderer-canvas";
import { PlatformerGame } from "../PlatformerGame";

describe("Platformer Game Simulation Tests", () => {
  let game: PlatformerGame;
  let world: World<CoreComponentRegistry>;

  beforeEach(async () => {
    game = new PlatformerGame({ seed: 41873 });
    await game.init();
    world = game.getWorld();
    world.flush();
  });

  it("should initialize with level plan and player entity", () => {
    const state = game.getGameState();
    expect(state.attempts).toBe(1);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.isGameOver).toBe(false);

    const players = world.query("PlatformerInput");
    expect(players.length).toBe(1);

    const cameras = world.query("Camera2D");
    expect(cameras.length).toBe(1);
    const cameraComp = world.getComponent(cameras[0], "Camera2D")!;
    expect(cameraComp.followEntity).toBe(players[0]);
  });

  it("should process physical movement, dash, and double jump input", () => {
    const playerEntity = world.query("PlatformerInput")[0];

    // Move right
    game.setInputState({ moveRight: true });
    game.update(0.1);

    let vel = world.getComponent(playerEntity, "Velocity")!;
    expect(vel.vx).toBeGreaterThan(0);

    // Trigger dash
    game.setInputState({ dash: true });
    game.update(0.016);
    vel = world.getComponent(playerEntity, "Velocity")!;
    expect(vel.vx).toBeGreaterThanOrEqual(400);

    // Double jump check
    const jumper = world.getComponent(playerEntity, "PlatformerJumper") as any;
    expect(jumper.maxJumps).toBe(2);
  });

  it("should complete level when reaching the goal entity", () => {
    const playerEntity = world.query("PlatformerInput")[0];
    const goals = world.query("LevelGoal");
    expect(goals.length).toBeGreaterThan(0);

    const goalEntity = goals[0];
    const gTrans = world.getComponent(goalEntity, "Transform")!;

    // Move player directly to goal position
    world.mutateComponent(playerEntity, "Transform", (t) => {
      t.x = gTrans.x;
      t.y = gTrans.y;
    });

    game.update(0.1);

    expect(game.isGameOver()).toBe(true);
    const state = game.getGameState();
    expect(state.isGameOver).toBe(true);
  });

  it("should decrease player health on collision with enemy", () => {
    const playerEntity = world.query("PlatformerInput", "Health")[0];
    const enemies = world.query("Enemy");
    expect(enemies.length).toBeGreaterThan(0);

    const enemyEntity = enemies[0];
    const eTrans = world.getComponent(enemyEntity, "Transform")!;

    // Move enemy onto player
    world.mutateComponent(playerEntity, "Transform", (t) => {
      t.x = eTrans.x;
      t.y = eTrans.y;
    });

    const initialHealth = world.getComponent(playerEntity, "Health")!.current;
    game.update(0.001);

    const newHealth = world.getComponent(playerEntity, "Health")!.current;
    expect(newHealth).toBeLessThan(initialHealth);
  });

  it("should support custom levelData in configuration", async () => {
    const customData = {
      grammar: ["custom_tag"],
      templates: [
        {
          id: "custom_segment",
          entry: { x: 0, y: 5 },
          exit: { x: 10, y: 5 },
          bounds: { width: 10, height: 10 },
          difficulty: 1,
          tags: ["custom_tag"],
          tileData: Array(10).fill(Array(10).fill(0)),
          spawnPoints: []
        }
      ]
    };

    const customGame = new PlatformerGame({ seed: 123, levelData: customData });
    await customGame.init();

    const goals = customGame.getWorld().query("LevelGoal");
    expect(goals.length).toBe(0);
  });

  it("should initialize renderer and render frame cleanly", () => {
    const renderer = new CanvasRenderer();
    expect(() => game.initializeRenderer(renderer as any)).not.toThrow();

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
