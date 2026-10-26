import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerBeltSystems } from "../../belt/registerBeltSystems";
import { registerHitRunCombat } from "../../systems/HitRunCombatBootstrap";
import { tryEnemyShoot } from "../enemyShoot";

function addTransform(
  world: World<CoreComponentRegistry>,
  entity: number,
  x: number,
  y: number
): void {
  world.addComponent(entity, {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
}

function createEnemy(world: World<CoreComponentRegistry>, x: number, target: number): number {
  const enemy = world.createEntity();
  addTransform(world, enemy, x, 0);
  world.addComponent(enemy, {
    type: "PlayerSensor",
    visionRange: 500,
    detectedPlayerEntity: target
  } as never);
  return enemy;
}

function createPlayer(world: World<CoreComponentRegistry>, x: number): number {
  const player = world.createEntity();
  addTransform(world, player, x, 0);
  world.addComponent(player, {
    type: "Health",
    current: 3,
    max: 3,
    invulnerableRemaining: 0
  });
  world.addComponent(player, {
    type: "Faction",
    value: "player"
  } as never);
  world.addComponent(player, {
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: 8, halfHeight: 8 },
    layer: 1,
    mask: 1 << 5,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  });
  world.addComponent(player, {
    type: "CollisionEvents",
    collisions: [],
    activeTriggers: [],
    triggersEntered: [],
    triggersExited: []
  });
  world.addComponent(player, {
    type: "BeltElevation",
    z: 0,
    vz: 0,
    grounded: true
  } as never);
  return player;
}

describe("tryEnemyShoot fallback damage", () => {
  it("creates a fallback projectile with the complete Damage contract", () => {
    const world = new World<CoreComponentRegistry>();
    const player = createPlayer(world, 200);
    const enemy = createEnemy(world, 0, player);

    expect(world.getResource("EnemyBulletPool")).toBeUndefined();
    expect(tryEnemyShoot(world, enemy, {
      canShoot: true,
      shootDamage: 2,
      shootCategory: "enemy_bullet",
      shootSpeed: 260,
      shootCooldown: 1
    })).toBe(true);

    const bullets = world.query("Damage", "Collider2D");
    expect(bullets).toHaveLength(1);
    const damage = world.getComponent(bullets[0], "Damage") as {
      amount: number;
      category: string;
      consumption: string;
      sourceEntity: number;
      friendlyFire: boolean;
    };
    expect(damage).toMatchObject({
      amount: 2,
      category: "enemy_bullet",
      consumption: "destroy-entity",
      sourceEntity: enemy,
      friendlyFire: false
    });
  });

  it("eventually damages a player 200 pixels away when the fallback projectile reaches it", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource("EventBus", new EventBus<Record<string, unknown>>());
    registerBeltSystems(world);
    registerHitRunCombat(world);

    const player = createPlayer(world, 200);
    const enemy = createEnemy(world, 0, player);
    expect(tryEnemyShoot(world, enemy, {
      canShoot: true,
      shootDamage: 1,
      shootSpeed: 260,
      shootCooldown: 1
    })).toBe(true);

    for (let tick = 0; tick < 60; tick++) {
      const health = world.getComponent(player, "Health") as { current: number };
      if (health.current < 3) break;
      world.update(1 / 60);
    }

    const health = world.getComponent(player, "Health") as { current: number };
    expect(health.current).toBe(2);
  });
});
