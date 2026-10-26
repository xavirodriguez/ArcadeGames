import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunExplosionSystem } from "../weapons/HitRunExplosionSystem";
import { isFriendly } from "../combat/faction";

function addCombatant(
  world: World<CoreComponentRegistry>,
  x: number,
  faction: string,
  health: number
): number {
  const entity = world.createEntity();
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
    dirty: true
  });
  world.addComponent(entity, {
    type: "Health",
    current: health,
    max: health,
    invulnerableRemaining: 0
  });
  world.addComponent(entity, {
    type: "Faction",
    value: faction
  } as CoreComponentRegistry["Faction"]);
  world.addComponent(entity, {
    type: "BeltElevation",
    z: 0,
    vz: 0,
    grounded: true
  } as CoreComponentRegistry["BeltElevation"]);
  return entity;
}

function createExplosionHarness(): {
  world: World<CoreComponentRegistry>;
  system: HitRunExplosionSystem;
  bus: EventBus<Record<string, unknown>>;
} {
  const world = new World<CoreComponentRegistry>();
  const bus = new EventBus<Record<string, unknown>>();
  world.setResource("EventBus", bus);
  const system = new HitRunExplosionSystem();
  system.subscribe(bus);
  return { world, system, bus };
}

describe("Hit&Run faction filtering", () => {
  it("normalizes both Faction.value and legacy Faction.faction", () => {
    expect(isFriendly({ value: "player" }, { faction: "player" })).toBe(true);
    expect(isFriendly({ faction: "enemy" }, { value: "enemy" })).toBe(true);
    expect(isFriendly({ value: "player" }, { value: "enemy" })).toBe(false);
    expect(isFriendly({ value: "player" }, { value: "player" }, true)).toBe(false);
    expect(isFriendly(undefined, { value: "player" })).toBe(false);
  });

  it("does not hurt the player's own faction but still damages an enemy in the blast radius", () => {
    const { world, system, bus } = createExplosionHarness();
    const player = addCombatant(world, 0, "player", 5);
    const enemy = addCombatant(world, 10, "enemy", 5);

    bus.emit("combat:explosion", {
      x: 0,
      y: 0,
      z: 0,
      radius: 20,
      damage: 2,
      sourceEntity: player,
      category: "explosive"
    });
    system.update(world, 0);

    const playerHealth = world.getComponent(player, "Health") as { current: number };
    const enemyHealth = world.getComponent(enemy, "Health") as { current: number };
    expect(playerHealth.current).toBe(5);
    expect(enemyHealth.current).toBe(3);
  });
});
