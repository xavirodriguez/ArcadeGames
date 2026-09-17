import { World } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { AsteroidPool } from "../EntityPool";
import { createAsteroid, createShip } from "../EntityFactory";

describe("AsteroidPool & AsteroidInputSystem Detailed Tests", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();
    world.gameplayRandom.unlock();

    // Clear initial entities
    const initialAsteroids = world.query("Asteroid");
    for (const ent of initialAsteroids) {
      world.getCommandBuffer().removeEntity(ent);
    }
    const initialShips = world.query("Ship");
    for (const ent of initialShips) {
      world.getCommandBuffer().removeEntity(ent);
    }
    world.flush();
  });

  afterEach(() => {
    game.destroy();
  });

  describe("AsteroidPool", () => {
    it("should acquire and recycle asteroids from AsteroidPool", () => {
      const pool = world.getResource<AsteroidPool>("AsteroidPool");
      expect(pool).toBeDefined();

      const initialPoolSize = pool!.size;

      // Acquire an asteroid from factory (which delegates to pool)
      const asteroidEntity = createAsteroid({
        world,
        x: 150,
        y: 250,
        size: "large"
      });
      world.flush();

      expect(world.hasEntity(asteroidEntity)).toBe(true);
      const transform = world.getComponent(asteroidEntity, "Transform") as any;
      expect(transform.x).toBe(150);
      expect(transform.y).toBe(250);

      const asteroidComp = world.getComponent(asteroidEntity, "Asteroid") as any;
      expect(asteroidComp.size).toBe("large");

      // Reclaim and destroy entity to return to pool
      world.reclaimEntity(asteroidEntity);
      world.flush();

      expect(world.hasEntity(asteroidEntity)).toBe(false);
      // Size of pool should now reflect returned object
      expect(pool!.size).toBeGreaterThanOrEqual(initialPoolSize);
    });
  });

  describe("AsteroidInputSystem Hyperspace & Cooldown Lifecycle", () => {
    it("should cancel prep phase if hyperspace key is released before completion", () => {
      const ship = createShip({ world, x: 100, y: 100 });
      world.addComponent(ship, { type: "LocalPlayer" });
      world.addComponent(ship, {
        type: "Input",
        actions: { hyperspace: true },
        axes: {}
      });
      createAsteroid({ world, x: 700, y: 700, size: "large" });
      world.flush();

      // Tick frame 1: initiates prep
      world.update(0.016);
      world.flush();

      let shipComp = world.getComponent(ship, "Ship") as any;
      expect(shipComp.hyperspacePrepTime).toBeGreaterThan(0);
      expect(shipComp.hyperspacePreviewEntityId).toBeDefined();

      const previewId = shipComp.hyperspacePreviewEntityId;

      // Release key on frame 2
      world.mutateComponent(ship, "Input", (inp: any) => {
        inp.actions = {};
      });

      world.update(0.016);
      world.flush();

      shipComp = world.getComponent(ship, "Ship") as any;
      expect(shipComp.hyperspacePrepTime).toBe(0);
      expect(shipComp.hyperspacePreviewEntityId).toBeUndefined();

      // Preview singularity entity should be removed
      expect(world.hasEntity(previewId)).toBe(false);
    });

    it("should enforce hyperspace cooldown preventing immediate re-activation", () => {
      const ship = createShip({ world, x: 100, y: 100 });
      world.addComponent(ship, { type: "LocalPlayer" });
      world.addComponent(ship, {
        type: "Input",
        actions: { hyperspace: true },
        axes: {}
      });
      createAsteroid({ world, x: 700, y: 700, size: "large" });
      world.flush();

      // Complete hyperspace prep (~32 frames)
      for (let i = 0; i < 35; i++) {
        world.update(0.016);
        world.flush();
      }

      let shipComp = world.getComponent(ship, "Ship") as any;
      expect(shipComp.hyperspaceCooldownRemaining).toBeGreaterThan(4.0);

      // Attempting to hold hyperspace again while on cooldown should NOT trigger prep
      world.mutateComponent(ship, "Input", (inp: any) => {
        inp.actions = { hyperspace: true };
      });

      world.update(0.016);
      world.flush();

      shipComp = world.getComponent(ship, "Ship") as any;
      expect(shipComp.hyperspacePrepTime).toBe(0);
      expect(shipComp.hyperspacePreviewEntityId).toBeUndefined();
    });
  });
});
