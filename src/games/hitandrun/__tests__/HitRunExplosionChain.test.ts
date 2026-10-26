import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunExplosionSystem } from "../weapons/HitRunExplosionSystem";
import { HitRunCombatSystem } from "../systems/HitRunCombatSystem";

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
  } as never);
  world.addComponent(entity, {
    type: "BeltElevation",
    z: 0,
    vz: 0,
    grounded: true
  } as never);
  world.addComponent(entity, {
    type: "CollisionEvents",
    collisions: [],
    activeTriggers: [],
    triggersEntered: [],
    triggersExited: []
  } as never);
  return entity;
}

describe("Hit&Run explosive projectile chain", () => {
  it("detonates the colliding rocket, protects its shooter, damages an enemy, and emits one AoE hit", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);

    const player = addCombatant(world, 0, "player", 5);
    const enemy = addCombatant(world, 15, "enemy", 5);
    const rocket = addCombatant(world, 10, "player", 1);
    world.addComponent(rocket, {
      type: "Damage",
      amount: 1,
      category: "explosive",
      sourceEntity: player,
      friendlyFire: false,
      consumption: "remove-component"
    } as never);
    world.addComponent(rocket, {
      type: "ExplosivePayload",
      radius: 20,
      damage: 2,
      detonated: false
    } as never);

    const explosionSystem = new HitRunExplosionSystem();
    explosionSystem.subscribe(bus);
    const combatSystem = new HitRunCombatSystem();

    let aoeHitEvents = 0;
    bus.on("combat:hit", (payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "targetEntity" in payload &&
        payload.targetEntity === enemy
      ) {
        aoeHitEvents++;
      }
    });

    const enemyEvents = world.getMutableComponent(enemy, "CollisionEvents") as {
      collisions: Array<{ otherEntity: number }>;
    };
    enemyEvents.collisions.push({ otherEntity: rocket });

    // The real combat path reports both the owner (sourceEntity) and damage entity (attackerEntity).
    combatSystem.update(world, 0);
    bus.flushDeferred();
    expect(aoeHitEvents).toBe(1); // Direct impact.
    aoeHitEvents = 0;
    world.flush();

    explosionSystem.update(world, 0);
    world.flush();
    bus.flushDeferred();
    explosionSystem.update(world, 0);
    bus.flushDeferred();

    const playerHealth = world.getComponent(player, "Health") as { current: number };
    const enemyHealth = world.getComponent(enemy, "Health") as { current: number };
    expect(world.hasEntity(rocket)).toBe(false);
    expect(playerHealth.current).toBe(5);
    expect(enemyHealth.current).toBe(2);
    expect(aoeHitEvents).toBe(1);
  });
});
