import { World, CoreComponentRegistry, hashSoA, SoAWorldSnapshot } from "@tiny-aster/core";
import { registerBeltSystems } from "../belt/registerBeltSystems";
import { registerHitRunAI } from "../ai/registerHitRunAI";
import { registerHitRunWeapons } from "../weapons/registerHitRunWeapons";
import { registerHitRunCombat } from "../systems/HitRunCombatBootstrap";
import { mutateBeltInputState } from "../belt/mutateBeltInputState";
import { createBeltInputComponent, createBeltMovementComponent } from "../belt/BeltMovementTypes";

describe("Determinism Verification: 600 Ticks Simulation", () => {
  function run600TickSimulation(): string {
    const world = new World<CoreComponentRegistry>();

    registerBeltSystems(world);
    registerHitRunAI(world);
    registerHitRunWeapons(world);
    registerHitRunCombat(world);

    // Spawn player
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 100,
      y: 350,
      worldX: 100,
      worldY: 350,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(player, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(player, createBeltInputComponent());
    world.addComponent(player, createBeltMovementComponent(1));
    world.addComponent(player, {
      type: "Faction",
      value: "player"
    });
    world.addComponent(player, {
      type: "HitRunWeapon",
      weaponId: "hmg",
      cooldownRemaining: 0
    });

    // Spawn target enemy
    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Transform",
      x: 300,
      y: 350,
      worldX: 300,
      worldY: 350,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(enemy, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(enemy, {
      type: "Health",
      current: 100,
      max: 100
    });
    world.addComponent(enemy, {
      type: "Faction",
      value: "enemy"
    });

    for (let tick = 0; tick < 600; tick++) {
      // Deterministic sequence of inputs across 600 ticks
      const moveRight = tick % 30 < 15;
      const fire = tick % 10 < 3;
      const jump = tick % 60 === 0;

      mutateBeltInputState(world, {
        moveRight,
        fire,
        jump
      });

      world.update(0.016);
    }

    return hashSoA(world.snapshot() as SoAWorldSnapshot);
  }

  it("running 600 ticks twice with identical input sequence yields exact same FNV-1a hash", () => {
    const hash1 = run600TickSimulation();
    const hash2 = run600TickSimulation();

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(8);
  });
});
