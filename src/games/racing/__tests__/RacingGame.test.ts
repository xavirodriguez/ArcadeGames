import { RacingGame } from "../RacingGame";
import { spawnBlueprint } from "../EntityFactory";

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
});
