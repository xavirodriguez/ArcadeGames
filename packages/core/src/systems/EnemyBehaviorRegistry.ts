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
        onEnter(world, entity, _data) {
          const vel = world.getComponent(entity, "Velocity");
          if (vel && vel.vx !== 0) {
            const mutableVel = world.getMutableComponent(entity, "Velocity");
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
  registry["jumper"] = {
    states: {
      Idle: {
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
            return "Windup";
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
          const dur = (data.alertDuration as number) ?? 0.5;
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
          const dur = (data.windupDuration as number) ?? 0.5;
          if (elapsed >= dur) {
            return "Attack";
          }
        }
      },
      Attack: {
        onEnter(world, entity, data) {
          const jumpVel = (data.jumpVelocity as number) ?? 250;
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
