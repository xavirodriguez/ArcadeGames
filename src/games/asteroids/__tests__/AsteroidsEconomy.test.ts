import { World } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { createShip, createAsteroid, createBullet, createResourcePickup } from "../EntityFactory";
import { purchaseRogueliteUpgrade } from "../economy/UpgradeApplier";
import { PlayerInventoryComponent, MagneticCollectorComponent, CollectibleResourceComponent } from "../types/EconomyTypes";

describe("Asteroids Salvage & Roguelite Economy", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();
    world.gameplayRandom.unlock();

    // Clear initial wave
    for (const ent of world.query("Asteroid")) {
      world.getCommandBuffer().removeEntity(ent);
    }
    for (const ent of world.query("Ship")) {
      world.getCommandBuffer().removeEntity(ent);
    }
    world.flush();
  });

  afterEach(() => {
    game.destroy();
  });

  describe("Resource Spawning & Movement", () => {
    it("should spawn physical resource with inherited momentum and boundary wrap", () => {
      const pickup = createResourcePickup({
        world,
        x: 200,
        y: 300,
        resourceType: "minerals",
        amount: 20,
        vx: 50,
        vy: -25
      });
      world.flush();

      expect(world.hasEntity(pickup)).toBe(true);
      const res = world.getComponent(pickup, "CollectibleResource") as CollectibleResourceComponent;
      expect(res.resourceType).toBe("minerals");
      expect(res.amount).toBe(20);
      expect(res.isCollected).toBe(false);

      const vel = world.getComponent(pickup, "Velocity");
      expect(vel?.vx).toBe(50);
      expect(vel?.vy).toBe(-25);

      const bound = world.getComponent(pickup, "Boundary");
      expect(bound?.mode).toBe("wrap");
    });

    it("should drop physical mineral resources when asteroid is destroyed in combat", () => {
      const bullet = createBullet({ world, x: 100, y: 100, vx: 0, vy: 0, ownerId: "player" });
      const asteroid = createAsteroid({ world, x: 100, y: 100, size: "large" });
      world.flush();

      const eventsComp = world.getComponent(bullet, "CollisionEvents");
      eventsComp?.collisions.push({
        otherEntity: asteroid,
        normalX: 0,
        normalY: 0,
        depth: 0,
        contactPoints: []
      });

      world.update(0.016);
      world.flush();

      const spawnedResources = world.query("CollectibleResource");
      expect(spawnedResources.length).toBeGreaterThanOrEqual(1);

      const firstPickup = spawnedResources[0];
      const resComp = world.getComponent(firstPickup, "CollectibleResource") as CollectibleResourceComponent;
      expect(resComp).toBeDefined();
      expect(resComp.amount).toBeGreaterThan(0);
    });
  });

  describe("Magnetic Attraction & Physical Collection", () => {
    it("should exert progressive pull force on nearby resources towards ship", () => {
      const ship = createShip({ world, x: 200, y: 200 });
      const pickup = createResourcePickup({
        world,
        x: 250, // within 120px base radius
        y: 200,
        resourceType: "energy",
        amount: 30,
        vx: 0,
        vy: 0
      });
      world.flush();

      const initialVel = world.getComponent(pickup, "Velocity");
      expect(initialVel?.vx).toBe(0);

      // Run magnetic collection step
      world.update(0.016);
      world.flush();

      const updatedVel = world.getComponent(pickup, "Velocity");
      // Direction from 250 to 200 is negative X (towards ship)
      expect(updatedVel?.vx).toBeLessThan(0);
    });

    it("should collect resource exactly once and accumulate PlayerInventory", () => {
      const ship = createShip({ world, x: 200, y: 200 });
      const pickup = createResourcePickup({
        world,
        x: 205, // within 16px collection radius
        y: 200,
        resourceType: "minerals",
        amount: 25
      });
      world.flush();

      let inv = world.getComponent(ship, "PlayerInventory") as PlayerInventoryComponent;
      expect(inv.minerals).toBe(0);

      world.update(0.016);
      world.flush();

      inv = world.getComponent(ship, "PlayerInventory") as PlayerInventoryComponent;
      expect(inv.minerals).toBe(25);

      // Collectible entity removed from world
      expect(world.hasEntity(pickup)).toBe(false);
    });
  });

  describe("Roguelite Upgrades & Run Lifecycle", () => {
    it("should purchase upgrade, deduct resources, apply modifiers, and prevent duplicate purchase", () => {
      const ship = createShip({ world, x: 300, y: 300 });
      world.flush();

      world.mutateComponent(ship, "PlayerInventory", (inv: PlayerInventoryComponent) => {
        inv.minerals = 100;
        inv.components = 50;
      });

      const configBefore = world.getResource<any>("GameConfig");
      const initialThrust = configBefore.SHIP_THRUST;

      // Purchase Thruster MK II (cost: 50 minerals)
      const success = purchaseRogueliteUpgrade(world, ship, "thruster_mk2");
      expect(success).toBe(true);

      const invAfter = world.getComponent(ship, "PlayerInventory") as PlayerInventoryComponent;
      expect(invAfter.minerals).toBe(50);
      expect(invAfter.activeUpgrades).toContain("thruster_mk2");

      const configAfter = world.getResource<any>("GameConfig");
      expect(configAfter.SHIP_THRUST).toBeCloseTo(initialThrust * 1.35, 1);

      // Duplicate purchase should fail
      const repeat = purchaseRogueliteUpgrade(world, ship, "thruster_mk2");
      expect(repeat).toBe(false);
    });

    it("should start a new run with clean inventory and default parameters", async () => {
      const newGame = new AsteroidsGame({ headless: true });
      await newGame.init();
      const newWorld = newGame.getWorld();

      const ships = newWorld.query("Ship", "PlayerInventory");
      expect(ships.length).toBe(1);

      const freshInv = newWorld.getComponent(ships[0], "PlayerInventory") as PlayerInventoryComponent;
      expect(freshInv.minerals).toBe(0);
      expect(freshInv.components).toBe(0);
      expect(freshInv.energy).toBe(100);
      expect(freshInv.activeUpgrades).toEqual([]);

      newGame.destroy();
    });
  });
});
