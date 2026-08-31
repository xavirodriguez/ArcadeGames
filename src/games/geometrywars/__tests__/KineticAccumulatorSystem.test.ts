import { World, SystemPhase, MovementSystem, ComboSystem } from "@tiny-aster/core";
import { KineticAccumulatorSystem } from "../systems/KineticAccumulatorSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";
import { DEFAULT_CONFIG, GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { registerGeometryWarsBlueprints, GeometryWarsEntityFactory } from "../entities/GeometryWarsEntities";

describe("KineticAccumulatorSystem Unit Tests", () => {
  let world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>;
  let config: GeometryWarsConfig;
  let playerEntity: number;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
    world = new World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>();
    world.setResource("GameConfig", config);
    world.setResource("ScreenConfig", { width: config.WIDTH, height: config.HEIGHT });

    registerGeometryWarsBlueprints(world);

    world.addSystem(new KineticAccumulatorSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new WeaponSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new ComboSystem(), { phase: SystemPhase.Simulation });

    playerEntity = GeometryWarsEntityFactory.createPlayer(world, 400, 300);
  });

  it("should charge energy when player is moving near max speed", () => {
    const acc = world.getComponent(playerEntity, "KineticAccumulator");
    expect(acc?.storedEnergy).toBe(0);

    // Set player velocity near max speed (PLAYER_SPEED = 220)
    world.mutateComponent(playerEntity, "Velocity", (v) => {
      v.vx = 200;
      v.vy = 0;
    });

    world.update(1.0); // 1 second update tick

    const mutAcc = world.getComponent(playerEntity, "KineticAccumulator");
    // Expect energy accumulated: 15 * 1.0 = 15
    expect(mutAcc?.storedEnergy).toBeCloseTo(15, 1);
  });

  it("should accumulate graze energy when enemy is within graze radius", () => {
    // Spawn an enemy within graze radius (KINETIC_GRAZE_RADIUS = 40)
    // Player is at (400, 300), spawn enemy at (425, 300) -> distance = 25
    GeometryWarsEntityFactory.createSeeker(world, 425, 300);

    world.update(1.0); // 1 second tick

    const acc = world.getComponent(playerEntity, "KineticAccumulator");
    // Graze charge amount per second: 10
    expect(acc?.storedEnergy).toBeGreaterThanOrEqual(10);
  });

  it("should set isBurstReady = true when storedEnergy reaches maxEnergy", () => {
    world.mutateComponent(playerEntity, "KineticAccumulator", (k) => {
      k.storedEnergy = 99;
    });

    world.mutateComponent(playerEntity, "Velocity", (v) => {
      v.vx = 200;
      v.vy = 0;
    });

    world.update(0.2);

    const acc = world.getComponent(playerEntity, "KineticAccumulator");
    expect(acc?.storedEnergy).toBe(config.KINETIC_MAX_ENERGY);
    expect(acc?.isBurstReady).toBe(true);
  });

  it("should activate Overdrive and shockwave burst when bomb action is triggered while burst is ready", () => {
    // Spawn enemies inside and outside burst radius (KINETIC_BURST_RADIUS = 180)
    const enemyNear = GeometryWarsEntityFactory.createSeeker(world, 450, 300); // dist = 50 (inside)
    const enemyFar = GeometryWarsEntityFactory.createSeeker(world, 700, 300); // dist = 300 (outside)

    world.mutateComponent(playerEntity, "KineticAccumulator", (k) => {
      k.storedEnergy = 100;
      k.isBurstReady = true;
    });

    world.mutateComponent(playerEntity, "Player", (p) => {
      p.useBomb = true;
    });

    world.update(0.016);

    const acc = world.getComponent(playerEntity, "KineticAccumulator");
    expect(acc?.storedEnergy).toBe(0);
    expect(acc?.isBurstReady).toBe(false);
    expect(acc?.isBurstActive).toBe(true);
    expect(acc?.overdriveRemaining).toBe(config.OVERDRIVE_DURATION);

    // Verify nearby enemy was destroyed and far enemy remains
    const candidates = world.query("Faction");
    expect(candidates.includes(enemyNear)).toBe(false);
    expect(candidates.includes(enemyFar)).toBe(true);

    // Verify shockwave entity spawned with TTL component
    const ttlEntities = world.query("TTL");
    expect(ttlEntities.length).toBeGreaterThan(0);

    // Verify shared ComboComponent received multiplier boost
    const comboEntity = world.query("Combo")[0];
    const combo = world.getComponent(comboEntity, "Combo");
    expect(combo?.multiplier).toBeGreaterThan(1);
  });

  it("should apply fire rate multiplier during Overdrive mode and decay overdrive duration", () => {
    world.mutateComponent(playerEntity, "KineticAccumulator", (k) => {
      k.isBurstActive = true;
      k.overdriveRemaining = 1.0;
    });

    // Fire weapon
    world.mutateComponent(playerEntity, "Aim", (a) => {
      a.aimX = 1;
      a.aimY = 0;
      a.isFiring = true;
    });

    world.update(0.016);

    const weapon = world.getComponent(playerEntity, "Weapon");
    // Cooldown duration with multiplier = PLAYER_FIRE_COOLDOWN (0.12) / OVERDRIVE_FIRE_RATE_MULT (2.5) = 0.048
    expect(weapon?.cooldownRemaining).toBeCloseTo(0.12 / 2.5, 2);

    // Pass time beyond overdrive remaining duration
    world.update(1.0);

    const acc = world.getComponent(playerEntity, "KineticAccumulator");
    expect(acc?.isBurstActive).toBe(false);
    expect(acc?.overdriveRemaining).toBe(0);
  });
});
