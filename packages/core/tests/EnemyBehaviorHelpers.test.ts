import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import {
  checkPlayerDetectionToAlert,
  zeroOutVelocityX,
  getHorizontalDirectionToPlayer,
  getDirectionToDetectedPlayer
} from "../src/systems/EnemyBehaviorHelpers";
import { registerEnemyStateMachines } from "../src/systems/EnemyBehaviorRegistry";
import { StateMachineDefinition } from "../src/systems/StateMachineSystem";

describe("EnemyBehaviorHelpers", () => {
  it("checkPlayerDetectionToAlert should return 'Alert' when sensor detects player", () => {
    const sensor = {
      type: "PlayerSensor" as const,
      visionRange: 100,
      detectedPlayerEntity: 42
    };
    expect(checkPlayerDetectionToAlert(sensor)).toBe("Alert");
  });

  it("checkPlayerDetectionToAlert should return undefined when no player detected", () => {
    const sensor = {
      type: "PlayerSensor" as const,
      visionRange: 100,
      detectedPlayerEntity: undefined
    };
    expect(checkPlayerDetectionToAlert(sensor)).toBeUndefined();
    expect(checkPlayerDetectionToAlert(undefined)).toBeUndefined();
  });

  it("zeroOutVelocityX should set vx to 0 using value-gated getMutableComponent", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Velocity",
      vx: 150,
      vy: -50,
      angularVelocity: 0
    });

    const versionBefore = world.stateVersion;
    zeroOutVelocityX(world, entity);

    expect(world.getComponent(entity, "Velocity")?.vx).toBe(0);
    expect(world.getComponent(entity, "Velocity")?.vy).toBe(-50);
    expect(world.stateVersion).toBe(versionBefore + 1);

    // Calling zeroOutVelocityX again when vx is already 0 should NOT increment stateVersion
    const versionAfter = world.stateVersion;
    zeroOutVelocityX(world, entity);
    expect(world.stateVersion).toBe(versionAfter);
  });

  it("getHorizontalDirectionToPlayer should return 1 or -1 based on player position", () => {
    const world = new World<CoreComponentRegistry>();

    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 200, y: 100, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 200, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });

    const enemy = world.createEntity();
    const enemyTrans = {
      type: "Transform" as const,
      x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(enemy, enemyTrans);

    const sensor = {
      type: "PlayerSensor" as const,
      visionRange: 300,
      detectedPlayerEntity: player
    };

    // Player to the right (x: 200 > x: 100) -> 1
    expect(getHorizontalDirectionToPlayer(world, enemy, sensor, enemyTrans)).toBe(1);

    // Move player to the left (x: 50 < x: 100) -> -1
    world.mutateComponent(player, "Transform", (t) => {
      t.x = 50;
      t.worldX = 50;
    });
    expect(getHorizontalDirectionToPlayer(world, enemy, sensor, enemyTrans)).toBe(-1);

    // Undetected player -> default 1
    expect(getHorizontalDirectionToPlayer(world, enemy, undefined, enemyTrans)).toBe(1);
  });

  it("getDirectionToDetectedPlayer should compute normalized direction vector", () => {
    const world = new World<CoreComponentRegistry>();

    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });

    const enemy = world.createEntity();
    const enemyTrans = {
      type: "Transform" as const,
      x: 100, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(enemy, enemyTrans);

    const sensor = {
      type: "PlayerSensor" as const,
      visionRange: 300,
      detectedPlayerEntity: player
    };

    const dir = getDirectionToDetectedPlayer(world, enemy, sensor, enemyTrans);
    expect(dir).toEqual({ x: 0, y: 1 });
  });

  it("should preserve enemy state machine definitions after helper refactor", () => {
    const world = new World<CoreComponentRegistry>();
    registerEnemyStateMachines(world);

    const registry = world.getResource<Record<string, StateMachineDefinition>>("StateMachineRegistry");
    expect(registry).toBeDefined();
    expect(registry!["patrol"]).toBeDefined();
    expect(registry!["jumper"]).toBeDefined();
    expect(registry!["charger"]).toBeDefined();

    // Verify patrol state transitions
    const patrolSM = registry!["patrol"];
    expect(Object.keys(patrolSM.states)).toEqual(["Patrol", "Alert", "Windup", "Attack", "Recovery"]);

    // Test transition from Patrol to Alert
    const sensor = { type: "PlayerSensor" as const, visionRange: 100, detectedPlayerEntity: 123 };
    const entity = world.createEntity();
    world.addComponent(entity, sensor);
    world.addComponent(entity, { type: "Velocity", vx: 50, vy: 0, angularVelocity: 0 });

    const nextState = patrolSM.states["Patrol"].onUpdate?.(world, entity, {}, 0);
    expect(nextState).toBe("Alert");

    // Test zeroing velocity on Alert enter
    patrolSM.states["Alert"].onEnter?.(world, entity, {});
    expect(world.getComponent(entity, "Velocity")?.vx).toBe(0);
  });
});
