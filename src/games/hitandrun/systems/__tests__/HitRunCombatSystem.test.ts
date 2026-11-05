import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunCombatSystem } from "../HitRunCombatSystem";
import { createHitRunCombatDefense } from "../../combat/HitRunCombatDefense";

function addTransform(world: World<CoreComponentRegistry>, entity: number, x: number): void {
  world.addComponent(entity, {
    type: "Transform",
    x,
    y: 0,
    worldX: x,
    worldY: 0,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
}

describe("HitRunCombatSystem defense integration", () => {
  it("applies armor before Health for collision-driven weapon damage", () => {
    const world = new World<CoreComponentRegistry>();
    const attacker = world.createEntity();
    const target = world.createEntity();
    addTransform(world, attacker, 0);
    addTransform(world, target, 20);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target }],
      triggersEntered: [],
      activeTriggers: [],
      triggersExited: []
    });
    world.addComponent(attacker, {
      type: "Damage",
      amount: 8,
      category: "bullet",
      consumption: "remove-component",
      friendlyFire: false
    } as never);
    world.addComponent(attacker, { type: "Faction", value: "player" } as never);

    world.addComponent(target, {
      type: "Health",
      current: 10,
      max: 10
    });
    world.addComponent(target, { type: "Faction", value: "enemy" } as never);
    world.addComponent(target, createHitRunCombatDefense({
      armor: 3,
      maxArmor: 3,
      armorAbsorption: 0.5
    }) as never);

    new HitRunCombatSystem().update(world, 1 / 60);

    expect((world.getComponent(target, "Health") as { current: number }).current).toBe(5);
    expect((world.getComponent(target, "CombatDefense" as never) as { armor: number }).armor).toBe(0);
  });

  it("prevents a frontal collision hit when the target holds guard", () => {
    const world = new World<CoreComponentRegistry>();
    const attacker = world.createEntity();
    const target = world.createEntity();
    addTransform(world, attacker, 20);
    addTransform(world, target, 0);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target }],
      triggersEntered: [],
      activeTriggers: [],
      triggersExited: []
    });
    world.addComponent(attacker, {
      type: "Damage",
      amount: 4,
      category: "bullet",
      consumption: "remove-component",
      friendlyFire: false
    } as never);
    world.addComponent(attacker, { type: "Faction", value: "player" } as never);

    world.addComponent(target, {
      type: "Health",
      current: 10,
      max: 10
    });
    world.addComponent(target, { type: "Faction", value: "enemy" } as never);
    world.addComponent(target, {
      type: "BeltInput",
      guardHeld: true
    } as never);
    world.addComponent(target, createHitRunCombatDefense({
      guard: 20,
      maxGuard: 20
    }) as never);

    // Facing right: the attacker is on the front side.
    new HitRunCombatSystem().update(world, 1 / 60);

    expect((world.getComponent(target, "Health") as { current: number }).current).toBe(10);
    expect((world.getComponent(target, "CombatDefense" as never) as { guard: number }).guard).toBe(15);
  });
});
