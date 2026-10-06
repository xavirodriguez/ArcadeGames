import { RacingGame } from "../RacingGame";
import { spawnBlueprint } from "../EntityFactory";
import { computeCarPhysics } from "../physics/CarPhysics";
import type { RacingConfig } from "../types/RacingConfigSchema";

describe("RacingGame & EntityFactory Blueprint Spawning", () => {
  it("should initialize RacingGame entities without throwing errors", async () => {
    const game = new RacingGame();
    await game.init();

    const entities = game.world.getAllEntities();
    expect(entities.length).toBeGreaterThan(0);

    const carEntities = game.world.query("Car");
    expect(carEntities.length).toBeGreaterThanOrEqual(1);

    const stateSingleton = game.world.getSingleton("RacingState");
    expect(stateSingleton).toBeDefined();
    expect(stateSingleton?.phase).toBe("countdown");
  });

  it("should spawn blueprints directly via spawnBlueprint helper", async () => {
    const game = new RacingGame();
    await game.init();

    const spawnedCar = spawnBlueprint(game.world, "car", { x: 100, y: 100, rotation: 0 });
    expect(game.world.hasEntity(spawnedCar)).toBe(true);
    expect(game.world.hasComponent(spawnedCar, "Car")).toBe(true);

    const spawnedWall = spawnBlueprint(game.world, "wall", { x: 50, y: 50, width: 200, height: 20 });
    expect(game.world.hasEntity(spawnedWall)).toBe(true);
    expect(game.world.hasComponent(spawnedWall, "RacingWall")).toBe(true);
  });

  it("should update input state when receiving canonical keyboard actions", async () => {
    const game = new RacingGame();
    await game.init();

    game.setInputState({ rotateLeft: true, thrust: true });
    const player = game.world.query("LocalPlayer", "Input")[0];
    const inputComp = game.world.getComponent(player, "Input")!;

    expect(inputComp.axes.moveX).toBe(-1);
    expect(inputComp.axes.moveY).toBe(-1);
  });

  it("should sync worldX and worldY with x and y when car moves after countdown", async () => {
    const game = new RacingGame();
    await game.init();

    const playerEntity = game.world.query("LocalPlayer")[0];
    expect(playerEntity).toBeDefined();

    const initialTransform = game.world.getComponent(playerEntity, "Transform")!;
    const spawnX = initialTransform.x;
    const spawnY = initialTransform.y;

    // Advance time beyond countdown (COUNTDOWN_SECONDS = 3)
    for (let i = 0; i < 200; i++) {
      game.update(1 / 60);
    }

    const state = game.world.getSingleton("RacingState");
    expect(state?.phase).toBe("racing");

    // Apply thrust to accelerate forward
    game.setInputState({ thrust: true });

    // Advance a few frames with acceleration applied
    for (let i = 0; i < 30; i++) {
      game.update(1 / 60);
    }

    const transform = game.world.getComponent(playerEntity, "Transform")!;
    expect(transform.x).not.toBe(spawnX);
    expect(transform.worldX).toBe(transform.x);
    expect(transform.worldY).toBe(transform.y);
  });

  it("should configure Car 2 as an AI rival that moves automatically after countdown without LocalPlayer", async () => {
    const game = new RacingGame();
    await game.init();

    const localPlayers = game.world.query("LocalPlayer");
    expect(localPlayers.length).toBe(1);

    const cars = game.world.query("Car");
    expect(cars.length).toBe(2);

    const playerEntity = localPlayers[0];
    const aiEntity = cars.find((c) => c !== playerEntity)!;

    expect(game.world.hasComponent(aiEntity, "LocalPlayer")).toBe(false);
    expect(game.world.hasComponent(aiEntity, "VehicleWaypoint")).toBe(true);
    expect(game.world.hasComponent(aiEntity, "VehicleSteering")).toBe(true);

    const initialAiTransform = { ...game.world.getComponent(aiEntity, "Transform")! };

    // Advance past 3s countdown into racing phase
    for (let i = 0; i < 200; i++) {
      game.update(1 / 60);
    }

    // Simulate 3 seconds of racing time
    for (let i = 0; i < 180; i++) {
      game.update(1 / 60);
    }

    const currentAiTransform = game.world.getComponent(aiEntity, "Transform")!;
    expect(currentAiTransform.x).not.toBe(initialAiTransform.x);

    // Confirm human player remains the only LocalPlayer
    const finalLocalPlayers = game.world.query("LocalPlayer");
    expect(finalLocalPlayers.length).toBe(1);
    expect(finalLocalPlayers[0]).toBe(playerEntity);
  });

  it("should initialize HeadToHeadState, track zones, and obstacles on game start", async () => {
    const game = new RacingGame();
    await game.init();

    const h2hState = game.world.getSingleton("HeadToHeadState");
    expect(h2hState).toBeDefined();
    expect(h2hState?.scores.player_1).toBe(0);
    expect(h2hState?.scores.player_2).toBe(0);
    expect(h2hState?.phase).toBe("countdown");

    const renders = game.world.query("Render");
    const zoneEntities = renders.filter((e) => game.world.getComponent(e, "Render")?.shape === "track_zone");
    const obstacleEntities = renders.filter((e) => game.world.getComponent(e, "Render")?.shape === "track_obstacle");

    expect(zoneEntities.length).toBeGreaterThan(0);
    expect(obstacleEntities.length).toBeGreaterThan(0);
  });

  it("should apply physics exactly once per frame without double acceleration in single player mode", async () => {
    const game = new RacingGame();
    await game.init();

    // Advance past countdown
    for (let i = 0; i < 200; i++) {
      game.update(1 / 60);
    }

    const playerEntity = game.world.query("LocalPlayer")[0];
    expect(playerEntity).toBeDefined();

    game.setInputState({ thrust: true });

    const dt = 1 / 60;
    const frames = 60;

    // Simulate 1 second (60 frames)
    for (let i = 0; i < frames; i++) {
      game.update(dt);
    }

    const playerVel = game.world.getComponent(playerEntity, "Velocity")!;

    // Compute reference velocity from single computeCarPhysics call per frame
    let refTransform = { rotation: 0 };
    let refVel = { vx: 0, vy: 0 };
    const config = (game as unknown as { baseConfig: RacingConfig }).baseConfig;
    for (let i = 0; i < frames; i++) {
      refVel = computeCarPhysics(refTransform, refVel, { moveX: 0, moveY: -1, boost: false, brake: false }, config, dt);
    }

    expect(playerVel.vx).toBeCloseTo(refVel.vx, 2);
    expect(playerVel.vy).toBeCloseTo(refVel.vy, 2);
  });
});
