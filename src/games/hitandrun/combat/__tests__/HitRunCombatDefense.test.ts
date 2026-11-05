import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { mutateBeltInputState } from "../../belt/mutateBeltInputState";
import {
  createHitRunCombatDefense,
  resolveHitRunDamage,
  tickHitRunCombatDefense
} from "../HitRunCombatDefense";

function addTransform(
  world: World<CoreComponentRegistry>,
  entity: number,
  x: number,
  facing = 1
): void {
  world.addComponent(entity, {
    type: "Transform",
    x,
    y: 0,
    worldX: x,
    worldY: 0,
    scaleX: facing,
    scaleY: 1,
    rotation: 0,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
}

describe("HitRunCombatDefense", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  function createPair(facing = 1): { source: number; target: number } {
    const source = world.createEntity();
    const target = world.createEntity();
    addTransform(world, source, facing > 0 ? 20 : -20);
    addTransform(world, target, 0, facing);
    return { source, target };
  }

  it("blocks a frontal attack while guard is held and consumes guard", () => {
    const { source, target } = createPair(1);
    world.addComponent(target, createHitRunCombatDefense({ guard: 20, maxGuard: 20 }) as never);
    world.addComponent(target, { type: "BeltInput", guardHeld: true } as never);

    const result = resolveHitRunDamage(world, source, target, 8);

    expect(result.blocked).toBe(true);
    expect(result.healthDamage).toBe(0);
    expect(result.guardBroken).toBe(false);
    expect((world.getComponent(target, "CombatDefense" as never) as { guard: number }).guard).toBe(10);
  });

  it("does not guard attacks arriving from behind", () => {
    const { source, target } = createPair(1);
    addTransform(world, source, -20);
    world.addComponent(target, createHitRunCombatDefense({ guard: 20, maxGuard: 20 }) as never);
    world.addComponent(target, { type: "BeltInput", guardHeld: true } as never);

    const result = resolveHitRunDamage(world, source, target, 8);

    expect(result.healthDamage).toBe(8);
    expect(result.blocked).toBe(false);
    expect(result.remainingGuard).toBe(20);
  });

  it("breaks guard and lets unabsorbed damage through", () => {
    const { source, target } = createPair(1);
    world.addComponent(target, createHitRunCombatDefense({
      guard: 5,
      maxGuard: 20,
      guardCostMultiplier: 1,
      guardBreakDuration: 0.75
    }) as never);
    world.addComponent(target, { type: "BeltInput", guardHeld: true } as never);

    const result = resolveHitRunDamage(world, source, target, 9);
    const defense = world.getComponent(target, "CombatDefense" as never) as {
      guard: number;
      guardBreakRemaining: number;
    };

    expect(result.guardBroken).toBe(true);
    expect(result.healthDamage).toBe(4);
    expect(defense.guard).toBe(0);
    expect(defense.guardBreakRemaining).toBe(0.75);
  });

  it("uses armor durability to absorb damage and reports its break transition", () => {
    const { source, target } = createPair();
    world.addComponent(target, createHitRunCombatDefense({
      armor: 3,
      maxArmor: 3,
      armorAbsorption: 0.5
    }) as never);

    const result = resolveHitRunDamage(world, source, target, 8);

    expect(result.healthDamage).toBe(5);
    expect(result.armorBroken).toBe(true);
    expect(result.remainingArmor).toBe(0);
  });

  it("regenerates guard after the delay and recovers from guard break", () => {
    const target = world.createEntity();
    world.addComponent(target, createHitRunCombatDefense({
      guard: 0,
      maxGuard: 20,
      guardRegenPerSecond: 10,
      guardRegenDelayRemaining: 0.2,
      guardBreakRemaining: 0.3
    }) as never);

    tickHitRunCombatDefense(world, 0.25);
    let defense = world.getComponent(target, "CombatDefense" as never) as {
      guard: number;
      guardBreakRemaining: number;
      guardRegenDelayRemaining: number;
    };
    expect(defense.guard).toBe(0);
    expect(defense.guardBreakRemaining).toBeCloseTo(0.05);

    tickHitRunCombatDefense(world, 0.1);
    defense = world.getComponent(target, "CombatDefense" as never) as {
      guard: number;
      guardBreakRemaining: number;
      guardRegenDelayRemaining: number;
    };
    expect(defense.guard).toBeCloseTo(1);
    expect(defense.guardBreakRemaining).toBe(0);
  });

  it("preserves legacy full damage for entities without a defense component", () => {
    const { source, target } = createPair();
    const result = resolveHitRunDamage(world, source, target, 6);
    expect(result.healthDamage).toBe(6);
    expect(result.blocked).toBe(false);
    expect(result.guardBroken).toBe(false);
    expect(result.armorBroken).toBe(false);
  });
  it("does not regenerate guard while the guard input remains held", () => {
    const target = world.createEntity();
    world.addComponent(target, createHitRunCombatDefense({
      guard: 10,
      maxGuard: 20,
      guardRegenPerSecond: 10
    }) as never);
    world.addComponent(target, {
      type: "BeltInput",
      guardHeld: true
    } as never);

    tickHitRunCombatDefense(world, 1);

    const defense = world.getComponent(target, "CombatDefense" as never) as { guard: number };
    expect(defense.guard).toBe(10);
  });

  it("exposes guard through the existing input bridge", () => {
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 0,
      y: 0,
      scaleX: 1
    } as never);
    world.addComponent(player, {
      type: "BeltInput",
      moveX: 0,
      moveY: 0,
      aimX: 1,
      aimY: 0,
      attackHeld: false,
      attackPressed: false,
      fireHeld: false,
      firePressed: false,
      specialHeld: false,
      specialPressed: false,
      guardHeld: false,
      jumpHeld: false,
      jumpPressed: false,
      _prevHeldMask: 0
    } as never);

    mutateBeltInputState(world, { guard: true });
    expect((world.getComponent(player, "BeltInput") as { guardHeld: boolean }).guardHeld).toBe(true);
    mutateBeltInputState(world, { guard: false });
    expect((world.getComponent(player, "BeltInput") as { guardHeld: boolean }).guardHeld).toBe(false);
  });

});
