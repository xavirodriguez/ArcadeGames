import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { StateMachineDefinition } from "./StateMachineSystem";

/**
 * Registers state machines for the three main enemy archetypes into the StateMachineRegistry.
 * @public
 */
export function registerEnemyStateMachines(world: World<CoreComponentRegistry>): void {
  let registry = world.getResource<Record<string, StateMachineDefinition>>("StateMachineRegistry");
  if (!registry) {
    registry = {};
    world.setResource("StateMachineRegistry", registry);
  }

  // 1. Patrol Enemy State Machine
  registry["patrol"] = {
    states: {
      Patrol: {
        onUpdate(world, entity, data, _elapsed) {
          const patrol = world.getComponent(entity, "Patrol");
          const gd = world.getComponent(entity, "GroundDetector");
          const sensor = world.getComponent(entity, "PlayerSensor");

          const speed = (data.patrolSpeed as number) ?? 80;

          if (patrol) {
            // Safe for determinism/rollback. Value-gated getMutableComponent prevents per-tick closure allocations and stateVersion bumps on constant movement.
            // Check wall or ground gap to turn around
            if (gd && (gd.hasWallAhead || !gd.hasGroundAhead)) {
              const mutablePatrol = world.getMutableComponent(entity, "Patrol");
              if (mutablePatrol) {
                mutablePatrol.direction = -mutablePatrol.direction;
              }
            }

            const currentPatrol = world.getComponent(entity, "Patrol")!;
            // Control intent: set horizontal velocity
            const vel = world.getComponent(entity, "Velocity");
            const targetVx = currentPatrol.direction * speed;
            if (vel && vel.vx !== targetVx) {
              const mutableVel = world.getMutableComponent(entity, "Velocity");
              if (mutableVel) {
                mutableVel.vx = targetVx;
              }
            }
          }

          // Transition to Alert if player detected
          if (sensor && sensor.detectedPlayerEntity !== undefined) {
            return "Alert";
          }
        }
      },
      Alert: {
        // TODO(refactor): código duplicado detectado (método) con systems/EnemyBehaviorRegistry.ts:70-79. Considerar extraer a función compartida. Ref: a2746596
        onEnter(world, entity, _data) {
          const vel = world.getComponent(entity, "Velocity");
          if (vel && vel.vx !== 0) {
            const mutableVel = world.getMutableComponent(entity, "Velocity");
            // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:153-164. Considerar extraer a función compartida. Ref: 04ed0cb3
            if (mutableVel) mutableVel.vx = 0;
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.alertDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Windup";
          }
        }
      },
      Windup: {
        onEnter(world, entity, _data) {
          const vel = world.getComponent(entity, "Velocity");
          if (vel && vel.vx !== 0) {
            const mutableVel = world.getMutableComponent(entity, "Velocity");
            // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:165-177. Considerar extraer a función compartida. Ref: a4d77f8d
            if (mutableVel) mutableVel.vx = 0;
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.windupDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Attack";
          }
        }
      },
      Attack: {
        onEnter(world, entity, data) {
          const speed = (data.patrolSpeed as number) ?? 80;
          const patrol = world.getComponent(entity, "Patrol");
          const dir = patrol ? patrol.direction : 1;
          const targetVx = dir * speed * 1.5;

          const vel = world.getComponent(entity, "Velocity");
          if (vel && vel.vx !== targetVx) {
            const mutableVel = world.getMutableComponent(entity, "Velocity");
            if (mutableVel) mutableVel.vx = targetVx;
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.attackDuration as number) ?? 0.3;
          if (elapsed >= dur) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, _data) {
          const vel = world.getComponent(entity, "Velocity");
          if (vel && vel.vx !== 0) {
            const mutableVel = world.getMutableComponent(entity, "Velocity");
            if (mutableVel) mutableVel.vx = 0;
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.recoveryDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Patrol";
          }
        }
      }
    }
  };

  // 2. Jumper Enemy State Machine
  // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:225-235. Considerar extraer a función compartida. Ref: 0d91e8b6
  registry["jumper"] = {
    states: {
      Idle: {
        // TODO(refactor): código duplicado detectado (método) con systems/EnemyBehaviorRegistry.ts:148-156. Considerar extraer a función compartida. Ref: af6deb12
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const sensor = world.getComponent(entity, "PlayerSensor");
          if (sensor && sensor.detectedPlayerEntity !== undefined) {
            return "Alert";
          }
          const dur = (data.idleDuration as number) ?? 1.0;
          if (elapsed >= dur) {
            // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:241-254. Considerar extraer a función compartida. Ref: 9e7fcddf
            return "Windup";
          }
        }
      },
      Alert: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:62-73. Considerar extraer a función compartida. Ref: 24aa0727
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:254-269. Considerar extraer a función compartida. Ref: 0dbc5b2c
          const dur = (data.alertDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Windup";
          }
        }
      },
      Windup: {
        // TODO(refactor): código duplicado detectado (método) con systems/EnemyBehaviorRegistry.ts:129-138. Considerar extraer a función compartida. Ref: 61f3bfb9
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.windupDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Attack";
          }
        }
      },
      Attack: {
        onEnter(world, entity, data) {
          const jumpVel = (data.jumpVelocity as number) ?? 250;
          // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:277-291. Considerar extraer a función compartida. Ref: f63119d3
          const speed = (data.patrolSpeed as number) ?? 80;
          const sensor = world.getComponent(entity, "PlayerSensor");
          const trans = world.getComponent(entity, "Transform");

          let dir = 1;
          if (sensor && sensor.detectedPlayerEntity !== undefined && trans) {
            const playerTrans = world.getComponent(sensor.detectedPlayerEntity, "Transform");
            if (playerTrans) {
              dir = playerTrans.x > trans.x ? 1 : -1;
            }
          }

          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vy = -jumpVel;
              v.vx = dir * speed;
            });
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const dur = (data.attackDuration as number) ?? 0.8;
          const ground = world.getComponent(entity, "PlatformerGroundState");
          // If we landed on ground or duration expired, transition to Recovery
          // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:300-314. Considerar extraer a función compartida. Ref: d3bc0340
          if ((ground && ground.isGrounded && elapsed > 0.1) || elapsed >= dur) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.recoveryDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Idle";
          }
        }
      }
    }
  };

  // 3. Charger Enemy State Machine
  registry["charger"] = {
    states: {
      Idle: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(world, entity, _data, _elapsed) {
          const sensor = world.getComponent(entity, "PlayerSensor");
          if (sensor && sensor.detectedPlayerEntity !== undefined) {
            return "Alert";
          }
        }
      },
      Alert: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.alertDuration as number) ?? 0.4;
          if (elapsed >= dur) {
            return "Windup";
          }
        }
      },
      Windup: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.windupDuration as number) ?? 0.6;
          if (elapsed >= dur) {
            return "Attack";
          }
        }
      },
      Attack: {
        onEnter(world, entity, data) {
          // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:187-201. Considerar extraer a función compartida. Ref: 09e72dc7
          const chargeSpeed = (data.chargeSpeed as number) ?? 300;
          const sensor = world.getComponent(entity, "PlayerSensor");
          const trans = world.getComponent(entity, "Transform");

          let dir = 1;
          if (sensor && sensor.detectedPlayerEntity !== undefined && trans) {
            const playerTrans = world.getComponent(sensor.detectedPlayerEntity, "Transform");
            if (playerTrans) {
              dir = playerTrans.x > trans.x ? 1 : -1;
            }
          }

          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = dir * chargeSpeed;
            });
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const gd = world.getComponent(entity, "GroundDetector");
          const dur = (data.attackDuration as number) ?? 1.0;

          // If wall hit or no ground ahead or duration elapsed, transition to Recovery
          // TODO(refactor): código duplicado detectado (bloque) con systems/EnemyBehaviorRegistry.ts:211-225. Considerar extraer a función compartida. Ref: 6cde5eac
          if ((gd && (gd.hasWallAhead || !gd.hasGroundAhead)) || elapsed >= dur) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, _data) {
          if (world.hasComponent(entity, "Velocity")) {
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = 0;
            });
          }
        },
        onUpdate(_world, _entity, data, elapsed) {
          const dur = (data.recoveryDuration as number) ?? 0.8;
          if (elapsed >= dur) {
            return "Idle";
          }
        }
      }
    }
  };
}
