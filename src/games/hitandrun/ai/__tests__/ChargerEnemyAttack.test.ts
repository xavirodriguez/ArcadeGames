import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunHurtSystem, canTakeDamage } from "../../hurt/HitRunHurtSystem";
import { DEFAULT_CHARGER_ATTACK_CONFIG } from "../EnemyAttackConfig";
import { createTestWorld, spawnTestPlayer, updateStateMachineHelper } from "../testHelpers";

function spawnChargerEnemy(world: World<CoreComponentRegistry>, x: number, y = 100): number {
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
    current: 4,
    max: 4,
    invulnerableRemaining: 0
  });
  world.addComponent(e, {
    type: "Faction",
    value: "enemy"
  });
  world.addComponent(e, {
    type: "GroundDetector",
    sensorOffsetX: 12,
    sensorOffsetY: 14,
    hasWallAhead: false,
    hasGroundAhead: true
  });
  world.addComponent(e, {
    type: "PlayerSensor",
    visionRange: 180,
    detectedPlayerEntity: undefined
  });
  world.addComponent(e, {
    type: "Render",
    shape: "charger",
    size: 14,
    color: "#ef4444",
    visible: true,
    opacity: 1,
    order: 2,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  });
  world.addComponent(e, {
    type: "StateMachine",
    machineId: "hr_charge",
    currentState: "Idle",
    previousState: "Idle",
    elapsedInState: 0,
    elapsedMs: 0,
    data: {
      patrolSpeed: 80,
      attackCooldownRemaining: 0
    }
  });
  return e;
}

describe("ChargerEnemyAttack (Paso B)", () => {
  it("anticipates with visual warning and locks direction during charge", () => {
    const { world } = createTestWorld();
    const charger = spawnChargerEnemy(world, 100);
    const player = spawnTestPlayer(world, 200);

    const sensor = world.getMutableComponent(charger, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, charger, 0.016);
    let fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Anticipation");

    const render = world.getComponent(charger, "Render") as { color: string };
    expect(render.color).toBe(DEFAULT_CHARGER_ATTACK_CONFIG.warningColor);

    const playerTr = world.getMutableComponent(player, "Transform") as { x: number; worldX: number };
    playerTr.x = 50;
    playerTr.worldX = 50;

    updateStateMachineHelper(world, charger, DEFAULT_CHARGER_ATTACK_CONFIG.anticipationSeconds + 0.01);
    fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    const vel = world.getComponent(charger, "Velocity") as { vx: number };
    expect(vel.vx).toBe(DEFAULT_CHARGER_ATTACK_CONFIG.chargeSpeed);
  });

  it("interrupted by player hit during anticipation", () => {
    const { world, hurtSystem } = createTestWorld();
    const charger = spawnChargerEnemy(world, 100);
    const player = spawnTestPlayer(world, 200);

    const sensor = world.getMutableComponent(charger, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, charger, 0.016);
    let fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Anticipation");

    hurtSystem.enqueueHitForTest({
      targetEntity: charger,
      sourceEntity: player,
      amount: 1,
      remainingHealth: 3
    });
    hurtSystem.update(world, 0);
    world.flush();

    expect(world.hasComponent(charger, "HitReaction")).toBe(true);

    updateStateMachineHelper(world, charger, 0.016);
    fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");

    const vel = world.getComponent(charger, "Velocity") as { vx: number };
    expect(vel.vx).toBe(0);
  });

  it("charge terminates upon hitting a wall", () => {
    const { world } = createTestWorld();
    const charger = spawnChargerEnemy(world, 100);
    const player = spawnTestPlayer(world, 200);

    const sensor = world.getMutableComponent(charger, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, charger, 0.016);
    updateStateMachineHelper(world, charger, DEFAULT_CHARGER_ATTACK_CONFIG.anticipationSeconds + 0.01);

    let fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    const gd = world.getMutableComponent(charger, "GroundDetector") as { hasWallAhead: boolean };
    gd.hasWallAhead = true;

    updateStateMachineHelper(world, charger, 0.016);
    fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");
  });

  it("charge terminates upon reaching max distance", () => {
    const { world } = createTestWorld();
    const charger = spawnChargerEnemy(world, 100);
    const player = spawnTestPlayer(world, 200);

    const sensor = world.getMutableComponent(charger, "PlayerSensor") as { detectedPlayerEntity?: number };
    sensor.detectedPlayerEntity = player;

    updateStateMachineHelper(world, charger, 0.016);
    updateStateMachineHelper(world, charger, DEFAULT_CHARGER_ATTACK_CONFIG.anticipationSeconds + 0.01);

    let fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    const tr = world.getMutableComponent(charger, "Transform") as { x: number; worldX: number };
    tr.x = 430;
    tr.worldX = 430;

    updateStateMachineHelper(world, charger, 0.016);
    fsm = world.getComponent(charger, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");
  });

  it("damage passes through player invulnerability pathway", () => {
    const { world, hurtSystem } = createTestWorld();
    const charger = spawnChargerEnemy(world, 100);
    const player = spawnTestPlayer(world, 120);

    const health = world.getMutableComponent(player, "Health") as { invulnerableRemaining: number };
    health.invulnerableRemaining = 1.0;
    expect(canTakeDamage(world, player)).toBe(false);

    hurtSystem.enqueueHitForTest({
      targetEntity: player,
      sourceEntity: charger,
      amount: 1,
      remainingHealth: 5
    });
    hurtSystem.update(world, 0);

    const currentHealth = (world.getComponent(player, "Health") as { current: number }).current;
    expect(currentHealth).toBe(5);
  });
});
