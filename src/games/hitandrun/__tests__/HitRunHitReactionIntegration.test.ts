import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { createTestWorld, spawnTestPlayer, updateStateMachineHelper } from "../ai/testHelpers";
import { HitRunHurtSystem } from "../hurt/HitRunHurtSystem";

function simulateEnemyKnockback(
  deltaTime: number,
  frames: number
): number {
  const world = new World<CoreComponentRegistry>();
  const enemy = world.createEntity();
  world.addComponent(enemy, {
    type: "Enemy",
    kind: "charger"
  } as never);
  world.addComponent(enemy, {
    type: "Velocity",
    vx: 260,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(enemy, {
    type: "HitReaction",
    hitstunRemaining: 2,
    staggerRemaining: 2,
    blinkElapsed: 0
  } as never);

  const hurt = new HitRunHurtSystem();
  for (let i = 0; i < frames; i++) {
    hurt.update(world, deltaTime);
  }

  return (world.getComponent(enemy, "Velocity") as { vx: number }).vx;
}

function spawnStateMachineEnemy(
  world: World<CoreComponentRegistry>,
  machineId: string,
  currentState: string,
  data: Record<string, unknown>
): number {
  const enemy = world.createEntity();
  world.addComponent(enemy, {
    type: "Transform",
    x: 100,
    y: 100,
    worldX: 100,
    worldY: 100,
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
    vx: -73,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(enemy, {
    type: "Health",
    current: 4,
    max: 4,
    invulnerableRemaining: 0
  });
  world.addComponent(enemy, {
    type: "Faction",
    value: "enemy"
  });
  world.addComponent(enemy, {
    type: "GroundDetector",
    sensorOffsetX: 12,
    sensorOffsetY: 14,
    hasWallAhead: false,
    hasGroundAhead: true
  });
  world.addComponent(enemy, {
    type: "StateMachine",
    machineId,
    currentState,
    previousState: "Idle",
    elapsedInState: 0,
    elapsedMs: 0,
    data
  });
  return enemy;
}

function addHitReaction(
  world: World<CoreComponentRegistry>,
  entity: number,
  hitstunRemaining: number,
  staggerRemaining: number
): void {
  world.addComponent(entity, {
    type: "HitReaction",
    hitstunRemaining,
    staggerRemaining,
    blinkElapsed: 0
  } as never);
}

describe("Hit & Run hit reaction integration", () => {
  it("keeps enemy knockback damping consistent across 30 Hz and 60 Hz updates", () => {
    const at30Hz = simulateEnemyKnockback(1 / 30, 30);
    const at60Hz = simulateEnemyKnockback(1 / 60, 60);

    expect(at30Hz).toBeCloseTo(at60Hz, 8);
    // The legacy response was 0.85 retention per 60 Hz simulation tick.
    expect(at60Hz).toBeCloseTo(260 * Math.pow(0.85, 60), 6);
  });

  it("does not let a staggered charger FSM overwrite the knockback impulse", () => {
    const { world } = createTestWorld();
    const enemy = spawnStateMachineEnemy(world, "hr_charge", "Charge", {
      chargeDir: 1,
      startChargeX: 100
    });
    addHitReaction(world, enemy, 0.2, 0.3);

    updateStateMachineHelper(world, enemy, 1 / 60);

    const fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");
    expect((world.getComponent(enemy, "Velocity") as { vx: number }).vx).toBe(-73);
  });

  it("cancels a charger charge after both hitstun and stagger expire", () => {
    const { world, hurtSystem } = createTestWorld();
    const enemy = spawnStateMachineEnemy(world, "hr_charge", "Charge", {
      chargeDir: 1,
      startChargeX: 100
    });
    addHitReaction(world, enemy, 0.14, 0.32);

    updateStateMachineHelper(world, enemy, 1 / 60);
    let fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    hurtSystem.update(world, 0.2);
    updateStateMachineHelper(world, enemy, 1 / 60);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    hurtSystem.update(world, 0.13);
    updateStateMachineHelper(world, enemy, 1 / 60);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");

    const velocity = world.getComponent(enemy, "Velocity") as { vx: number };
    expect(velocity.vx).toBe(0);
    const stateMachine = world.getComponent(enemy, "StateMachine") as {
      data: Record<string, unknown>;
    };
    expect(stateMachine.data.startChargeX).toBeUndefined();
    expect(stateMachine.data._hitRunPendingInterruption).toBeUndefined();
  });

  it("preserves a pending cancellation when a second impact extends stagger", () => {
    const { world, hurtSystem } = createTestWorld();
    const enemy = spawnStateMachineEnemy(world, "hr_charge", "Charge", {
      chargeDir: 1,
      startChargeX: 100
    });
    const player = spawnTestPlayer(world, 80);
    addHitReaction(world, enemy, 0.1, 0.2);

    updateStateMachineHelper(world, enemy, 1 / 60);
    hurtSystem.update(world, 0.15);

    hurtSystem.enqueueHitForTest({
      targetEntity: enemy,
      sourceEntity: player,
      amount: 3,
      remainingHealth: 1
    });
    hurtSystem.update(world, 0);

    updateStateMachineHelper(world, enemy, 1 / 60);
    let fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    hurtSystem.update(world, 0.2);
    updateStateMachineHelper(world, enemy, 1 / 60);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Charge");

    hurtSystem.update(world, 0.13);
    updateStateMachineHelper(world, enemy, 1 / 60);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");
  });

  it("pauses a non-cancellable ranged state and resumes its adjusted timer", () => {
    const { world, hurtSystem } = createTestWorld();
    const enemy = spawnStateMachineEnemy(world, "hr_tank", "Attack", {});
    addHitReaction(world, enemy, 0.05, 0.25);

    updateStateMachineHelper(world, enemy, 0.05);
    for (let tick = 0; tick < 5; tick++) {
      hurtSystem.update(world, 0.05);
      updateStateMachineHelper(world, enemy, 0.05);
    }

    let fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Attack");

    updateStateMachineHelper(world, enemy, 0.08);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Attack");

    updateStateMachineHelper(world, enemy, 0.03);
    fsm = world.getComponent(enemy, "StateMachine") as { currentState: string };
    expect(fsm.currentState).toBe("Recovery");
  });
});
