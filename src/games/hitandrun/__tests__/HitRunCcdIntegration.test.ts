import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerBeltSystems } from "../belt/registerBeltSystems";
import { registerHitRunCombat } from "../systems/HitRunCombatBootstrap";

describe("Hit&Run continuous collision detection", () => {
  it("hits an 8px AABB with a 900px/s projectile without tunneling", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource("EventBus", new EventBus<Record<string, unknown>>());
    registerBeltSystems(world);
    registerHitRunCombat(world);

    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 7,
      y: 0,
      worldX: 7,
      worldY: 0,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(target, {
      type: "Health",
      current: 10,
      max: 10,
      invulnerableRemaining: 0
    });
    world.addComponent(target, {
      type: "Faction",
      value: "player"
    } as CoreComponentRegistry["Faction"]);
    world.addComponent(target, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 4, halfHeight: 4 },
      layer: 1,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });
    world.addComponent(target, {
      type: "BeltElevation",
      z: 0,
      vz: 0,
      grounded: true
    } as CoreComponentRegistry["BeltElevation"]);

    const projectile = world.createEntity();
    world.addComponent(projectile, {
      type: "Transform",
      x: -15,
      y: 0,
      worldX: -15,
      worldY: 0,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(projectile, {
      type: "Velocity",
      vx: 900,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(projectile, {
      type: "Damage",
      amount: 1,
      category: "enemy_bullet",
      sourceEntity: projectile,
      friendlyFire: false,
      consumption: "destroy-entity"
    } as CoreComponentRegistry["Damage"]);
    world.addComponent(projectile, {
      type: "Faction",
      value: "enemy"
    } as CoreComponentRegistry["Faction"]);
    world.addComponent(projectile, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 1, halfHeight: 1 },
      layer: 1 << 5,
      mask: 1,
      offsetX: 0,
      offsetY: 0,
      isTrigger: true,
      enabled: true
    });
    world.addComponent(projectile, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });
    world.addComponent(projectile, {
      type: "BeltElevation",
      z: 0,
      vz: 0,
      grounded: true
    } as CoreComponentRegistry["BeltElevation"]);

    world.update(1 / 60);

    const health = world.getComponent(target, "Health") as { current: number };
    expect(health.current).toBe(9);
  });
});
