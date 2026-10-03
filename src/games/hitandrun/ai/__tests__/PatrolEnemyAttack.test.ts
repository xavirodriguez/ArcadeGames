import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunHurtSystem, canTakeDamage } from "../../hurt/HitRunHurtSystem";
import { DEFAULT_PATROL_ATTACK_CONFIG } from "../EnemyAttackConfig";
import { MeleeAttackComponent } from "../../melee/MeleeAttackTypes";
import { createTestWorld, spawnTestPlayer, updateStateMachineHelper } from "../testHelpers";

function spawnPatrolEnemy(world: World<CoreComponentRegistry>, x: number, y = 100): number {
  const e = world.createEntity();
  world.addComponent(e, {
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
  world.addComponent(e, {
    type: "Velocity",
    vx: 0,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(e, {
    type: "Health",
    current: 3,
    max: 3,
    invulnerableRemaining: 0
  });
  world.addComponent(e, {
    type: "Faction",
    value: "enemy"
  });
  world.addComponent(e, {
    type: "Patrol",
    startX: x - 50,
    endX: x + 50,
    direction: -1,
    patrolSpeed: 60
  });
  world.addComponent(e, {
    type: "PlayerSensor",
    visionRange: 100,
    detectedPlayerEntity: undefined
  });
  world.addComponent(e, {
    type: "Render",
    shape: "popcorn",
    size: 12,
    color: "#f97316",
    visible: true,
    opacity: 1,
    order: 2,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  });
  world.addComponent(e, {
    type: "StateMachine",
    machineId: "hr_walk",
    currentState: "Patrol",
    previousState: "Patrol",
    elapsedInState: 0,
    elapsedMs: 0,
    data: {
      patrolSpeed: 60,
      attackCooldownRemaining: 0
    }
  });
  return e;
}

describe("PatrolEnemyAttack (Paso A)", () => {
  it("anticipation precedes active hitbox phase with warning visual", () => {
    const { world, meleeSystem } = createTestWorld();
    const enemy = spawnPatrolEnemy(world, 100);
    const player = spawnTestPlayer(world, 80);

    const sensor = world.getMutableComponent(enemy, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, enemy, 0.016);
    let fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Anticipation");

    const render = world.getComponent(enemy, "Render") as { color: string };
    expect(render.color).toBe(DEFAULT_PATROL_ATTACK_CONFIG.warningColor);

    meleeSystem.update(world, 0.016);
    const melee = world.getComponent(enemy, "MeleeAttack") as MeleeAttackComponent | undefined;
    expect(melee?.hitboxEntity ?? -1).toBe(-1);

    updateStateMachineHelper(world, enemy, DEFAULT_PATROL_ATTACK_CONFIG.anticipationSeconds + 0.01);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Attack");

    meleeSystem.update(world, 0.016);
    const activeMelee = world.getComponent(enemy, "MeleeAttack") as MeleeAttackComponent;
    expect(activeMelee.hitboxEntity).toBeGreaterThanOrEqual(0);
  });

  it("player hit during anticipation interrupts enemy attack", () => {
    const { world, hurtSystem } = createTestWorld();
    const enemy = spawnPatrolEnemy(world, 100);
    const player = spawnTestPlayer(world, 80);

    const sensor = world.getMutableComponent(enemy, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, enemy, 0.016);
    let fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Anticipation");

    hurtSystem.enqueueHitForTest({
      targetEntity: enemy,
      sourceEntity: player,
      amount: 1,
      remainingHealth: 2
    });
    hurtSystem.update(world, 0);
    world.flush();

    expect(world.hasComponent(enemy, "HitReaction")).toBe(true);

    updateStateMachineHelper(world, enemy, 0.016);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");

    const render = world.getComponent(enemy, "Render") as { color: string };
    expect(render.color).toBe("#f97316");
  });

  it("does not attack if player is invulnerable", () => {
    const { world } = createTestWorld();
    const enemy = spawnPatrolEnemy(world, 100);
    const player = spawnTestPlayer(world, 80);

    const health = world.getMutableComponent(player, "Health") as { invulnerableRemaining: number };
    health.invulnerableRemaining = 1.0;
    expect(canTakeDamage(world, player)).toBe(false);

    const sensor = world.getMutableComponent(enemy, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, enemy, 0.016);
    const fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Patrol");
  });
});
