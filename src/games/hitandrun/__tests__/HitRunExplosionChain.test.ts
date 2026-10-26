import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunExplosionSystem } from "../weapons/HitRunExplosionSystem";

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
  return entity;
}

describe("Hit&Run explosive projectile chain", () => {
  it("detonates the projectile, protects the shooter, damages an enemy, and emits one AoE hit", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);

    const player = addCombatant(world, 0, "player", 5);
    const enemy = addCombatant(world, 15, "enemy", 5);
    const rocket = addCombatant(world, 10, "player", 1);
    world.addComponent(rocket, {
      type: "ExplosivePayload",
      radius: 20,
      damage: 2,
      detonated: false
    } as never);

    const system = new HitRunExplosionSystem();
    system.subscribe(bus);

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

    const directHit = {
      targetEntity: enemy,
      sourceEntity: player,
      attackerEntity: rocket,
      amount: 1,
      remainingHealth: 4,
      category: "explosive"
    };
    bus.emitDeferred("combat:hit", directHit);
    bus.flushDeferred();
    aoeHitEvents = 0;

    system.update(world, 0);
    world.flush();
    bus.flushDeferred();
    system.update(world, 0);
    bus.flushDeferred();

    const playerHealth = world.getComponent(player, "Health") as { current: number };
    const enemyHealth = world.getComponent(enemy, "Health") as { current: number };
    expect(world.hasEntity(rocket)).toBe(false);
    expect(playerHealth.current).toBe(5);
    expect(enemyHealth.current).toBe(3);
    expect(aoeHitEvents).toBe(1);
  });
});
