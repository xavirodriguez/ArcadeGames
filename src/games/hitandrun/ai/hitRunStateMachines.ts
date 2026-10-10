import { getOrCreateStateMachineRegistry, type World, type CoreComponentRegistry } from "@tiny-aster/core";
import type { StateMachineDefinition } from "@tiny-aster/core";
import { tryEnemyShoot } from "./enemyShoot";
import {
  DEFAULT_FLANK,
  computeFlankTarget,
  steerTowardFlank,
  flipFlankSide,
  type FlankConfig
} from "./flankingHelpers";
import {
  DEFAULT_PATROL_ATTACK_CONFIG,
  DEFAULT_CHARGER_ATTACK_CONFIG
} from "./EnemyAttackConfig";
import { canTakeDamage } from "../hurt/HitRunHurtSystem";
import type { MeleeAttackComponent } from "../melee/MeleeAttackTypes";
import {
  zeroVx,
  dirToPlayer,
  playerDetected,
  isEnemyInHitstun,
  restoreEnemyColor,
  facePlayer,
  shouldStartTelegraphedAttack,
  enterAnticipationState,
  updateAnticipationState,
  enterActiveMeleeAttack,
  enterTelegraphedRecovery
} from "./telegraphedAttackHelpers";

function timed(
  data: Record<string, unknown>,
  key: string,
  fallback: number,
  elapsed: number,
  next: string
): string | void {
  const dur = (data[key] as number) ?? fallback;
  if (elapsed >= dur) return next;
}

function flankConfigFromData(data: Record<string, unknown>): FlankConfig {
  return {
    offsetX: (data.flankOffsetX as number) ?? DEFAULT_FLANK.offsetX,
    arriveRadius: (data.flankArriveRadius as number) ?? DEFAULT_FLANK.arriveRadius,
    maxDuration: (data.flankMaxDuration as number) ?? DEFAULT_FLANK.maxDuration,
    speedMult: (data.flankSpeedMult as number) ?? DEFAULT_FLANK.speedMult
  };
}

/** Estados Alert / Windup compartidos */
const alertWindup = {
  Alert: {
    onEnter(world: World<CoreComponentRegistry>, entity: number) {
      zeroVx(world, entity);
    },
    onUpdate(
      _w: World<CoreComponentRegistry>,
      _e: number,
      data: Record<string, unknown>,
      elapsed: number
    ) {
      // Si useFlank → Flank; si no → Windup
      const next = data.useFlank ? "Flank" : "Windup";
      return timed(data, "alertDuration", 0.25, elapsed, next);
    }
  },
  Windup: {
    onEnter(world: World<CoreComponentRegistry>, entity: number) {
      zeroVx(world, entity);
      facePlayer(world, entity);
    },
    onUpdate(
      _w: World<CoreComponentRegistry>,
      _e: number,
      data: Record<string, unknown>,
      elapsed: number
    ) {
      return timed(data, "windupDuration", 0.2, elapsed, "Attack");
    }
  },
  /** Estado de flanqueo compartido (hr_walk, hr_flank, hr_tank). */
  Flank: {
    onEnter(
      world: World<CoreComponentRegistry>,
      entity: number,
      data: Record<string, unknown>
    ) {
      // Fijar lado al entrar (pinza / hash)
      computeFlankTarget(world, entity, data);
    },
    onUpdate(
      world: World<CoreComponentRegistry>,
      entity: number,
      data: Record<string, unknown>,
      elapsed: number
    ) {
      const cfg = flankConfigFromData(data);
      if (elapsed >= cfg.maxDuration) return "Windup";

      const sensor = world.getComponent(entity, "PlayerSensor") as
        | { detectedPlayerEntity?: number }
        | undefined;
      if (!playerDetected(sensor)) return "Patrol";

      const target = computeFlankTarget(world, entity, data, cfg);
      if (!target) return "Windup";

      const baseSpeed = (data.patrolSpeed as number) ?? 60;
      const speed = baseSpeed * cfg.speedMult;
      const arrived = steerTowardFlank(
        world,
        entity,
        target,
        speed,
        cfg.arriveRadius
      );

      // Disparo mientras flanquea (presión lateral)
      if (data.canShoot) tryEnemyShoot(world, entity, data);

      if (arrived) return "Windup";
    }
  }
};

export function registerHitRunStateMachines(
  world: World<CoreComponentRegistry>
): void {
  const registry = getOrCreateStateMachineRegistry(world);

  // ─── hr_walk ────────────────────────────────────────────────
  registry["hr_walk"] = {
    states: {
      Patrol: {
        onUpdate(world, entity, data) {
          const cd = (data.attackCooldownRemaining as number) ?? 0;
          if (cd > 0) {
            data.attackCooldownRemaining = Math.max(0, cd - 0.016);
          }

                    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:260-269. Considerar extraer a función compartida. Ref: bceffe16
const patrol = world.getComponent(entity, "Patrol") as
            | { direction: number; startX: number; endX: number }
            | undefined;
          const gd = world.getComponent(entity, "GroundDetector") as
            | { hasWallAhead?: boolean; hasGroundAhead?: boolean }
            | undefined;
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          const trans = world.getComponent(entity, "Transform");
                    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:269-277. Considerar extraer a función compartida. Ref: aa981fe7
const speed = (data.patrolSpeed as number) ?? 60;

          if (patrol) {
            if (gd && (gd.hasWallAhead || gd.hasGroundAhead === false)) {
              const mp = world.getMutableComponent(entity, "Patrol") as
                | { direction: number }
                | undefined;
              if (mp) mp.direction = -mp.direction;
            } else if (trans) {
              if (trans.x <= patrol.startX && patrol.direction < 0) {
                const mp = world.getMutableComponent(entity, "Patrol") as
                  | { direction: number }
                  | undefined;
                if (mp) mp.direction = 1;
              } else if (trans.x >= patrol.endX && patrol.direction > 0) {
                const mp = world.getMutableComponent(entity, "Patrol") as
                  | { direction: number }
                  | undefined;
                                // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:277-289. Considerar extraer a función compartida. Ref: ed2a50af
if (mp) mp.direction = -1;
              }
            }

            const cur = world.getComponent(entity, "Patrol") as
              | { direction: number }
              | undefined;
                        // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:582-588. Considerar extraer a función compartida. Ref: 7db838f7
const targetVx = (cur?.direction ?? 1) * speed;
            const vel = world.getComponent(entity, "Velocity");
            if (vel && vel.vx !== targetVx) {
              const mv = world.getMutableComponent(entity, "Velocity");
              if (mv) mv.vx = targetVx;
            }
          }

          if (data.canShoot && playerDetected(sensor)) {
            tryEnemyShoot(world, entity, data);
          }

          // Patrol enemy melee attack trigger check
          if (shouldStartTelegraphedAttack(world, entity, data, DEFAULT_PATROL_ATTACK_CONFIG)) {
            return "Anticipation";
          }

                    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:410-419. Considerar extraer a función compartida. Ref: 9b1bdb28
if (playerDetected(sensor) && sensor?.detectedPlayerEntity !== undefined) {
            if (canTakeDamage(world, sensor.detectedPlayerEntity)) {
              return "Alert";
            }
          }
        }
      },
      Anticipation: {
        onEnter(world, entity, data) {
          enterAnticipationState(world, entity, data, DEFAULT_PATROL_ATTACK_CONFIG.warningColor);
        },
        onUpdate(world, entity, data, elapsed) {
          return updateAnticipationState(
            world,
            entity,
            data,
            elapsed,
            DEFAULT_PATROL_ATTACK_CONFIG.anticipationSeconds,
            "Attack"
          );
        }
      },
      Attack: {
        onEnter(world, entity) {
          zeroVx(world, entity);
          facePlayer(world, entity);
          const dir = dirToPlayer(world, entity);
          enterActiveMeleeAttack(world, entity, dir, DEFAULT_PATROL_ATTACK_CONFIG, "enemy_melee");
        },
        onUpdate(world, entity, _data, elapsed) {
          zeroVx(world, entity);

          if (isEnemyInHitstun(world, entity)) {
            const melee = world.getMutableComponent(entity, "MeleeAttack") as MeleeAttackComponent | undefined;
            if (melee && melee.hitboxEntity >= 0 && world.hasEntity(melee.hitboxEntity)) {
              world.getCommandBuffer().removeEntity(melee.hitboxEntity);
              melee.hitboxEntity = -1;
            }
            return "Recovery";
          }

          if (elapsed >= DEFAULT_PATROL_ATTACK_CONFIG.activeSeconds) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          enterTelegraphedRecovery(world, entity, data);
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          if (elapsed >= DEFAULT_PATROL_ATTACK_CONFIG.recoverySeconds) {
            data.attackCooldownRemaining = DEFAULT_PATROL_ATTACK_CONFIG.cooldownSeconds;
            return "Patrol";
          }
        }
      }
    }
  };

  // ─── hr_flank: especialista en pinza ─────────────────────────
  registry["hr_flank"] = {
    states: {
      Patrol: {
        onUpdate(world, entity, data) {
          const patrol = world.getComponent(entity, "Patrol") as
            | { direction: number; startX: number; endX: number }
            | undefined;
          const gd = world.getComponent(entity, "GroundDetector") as
            | { hasWallAhead?: boolean; hasGroundAhead?: boolean }
            | undefined;
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          const speed = ((data.patrolSpeed as number) ?? 70) * 0.85;

          if (patrol) {
            if (gd && (gd.hasWallAhead || gd.hasGroundAhead === false)) {
              const mp = world.getMutableComponent(entity, "Patrol") as
                | { direction: number }
                | undefined;
              if (mp) mp.direction = -mp.direction;
            }
            const cur = world.getComponent(entity, "Patrol") as
              | { direction: number }
              | undefined;
            const targetVx = (cur?.direction ?? 1) * speed;
            const vel = world.getComponent(entity, "Velocity");
            if (vel && vel.vx !== targetVx) {
              const mv = world.getMutableComponent(entity, "Velocity");
              if (mv) mv.vx = targetVx;
            }
          }

          if (playerDetected(sensor)) return "Alert";
        }
      },
      ...alertWindup,
      Attack: {
        onEnter(world, entity, data) {
          facePlayer(world, entity);
          const speed = ((data.patrolSpeed as number) ?? 70) * 1.6;
          const dir = dirToPlayer(world, entity);
          const vel = world.getComponent(entity, "Velocity");
          if (vel) {
            const mv = world.getMutableComponent(entity, "Velocity");
            if (mv) mv.vx = dir * speed;
          }
          if (data.canShoot) tryEnemyShoot(world, entity, data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "attackDuration", 0.35, elapsed, "Recovery");
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          flipFlankSide(data);
        },
        onUpdate(world, entity, data, elapsed) {
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          const dur = (data.recoveryDuration as number) ?? 0.3;
          if (elapsed >= dur) {
            return playerDetected(sensor) ? "Flank" : "Patrol";
          }
        }
      }
    }
  };

  // ─── hr_hop ─────────────────────────────────────────────────
    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:519-529. Considerar extraer a función compartida. Ref: f7910ca2
registry["hr_hop"] = {
    states: {
      Idle: {
        onEnter(world, entity) {
          zeroVx(world, entity);
        },
        onUpdate(world, entity, data, elapsed) {
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          if (playerDetected(sensor)) return "Alert";
          return timed(data, "idleDuration", 0.8, elapsed, "Windup");
        }
      },
      Alert: alertWindup.Alert,
      Windup: alertWindup.Windup,
      Attack: {
        onEnter(world, entity, data) {
          const jumpVel = (data.jumpVelocity as number) ?? 240;
          const speed = (data.patrolSpeed as number) ?? 80;
          let dir = dirToPlayer(world, entity);
          if (data.useFlank) {
            const target = computeFlankTarget(world, entity, data);
            if (target) {
              const self = world.getComponent(entity, "Transform");
              if (self) {
                const sx = self.worldX ?? self.x;
                dir = target.x >= sx ? 1 : -1;
              }
            }
          }
          const vel = world.getComponent(entity, "Velocity");
          if (vel) {
            const mv = world.getMutableComponent(entity, "Velocity");
            if (mv) {
              mv.vy = -jumpVel;
              mv.vx = dir * speed;
            }
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const ground = world.getComponent(entity, "PlatformerGroundState") as
            | { isGrounded?: boolean }
            | undefined;
          const dur = (data.attackDuration as number) ?? 0.85;
          if ((ground?.isGrounded && elapsed > 0.12) || elapsed >= dur) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "recoveryDuration", 0.35, elapsed, "Idle");
        }
      }
    }
  };

  // ─── hr_charge ──────────────────────────────────────────────
  registry["hr_charge"] = {
    states: {
      Idle: {
        onEnter(world, entity) {
          zeroVx(world, entity);
        },
        onUpdate(world, entity, data) {
          const cd = (data.attackCooldownRemaining as number) ?? 0;
          if (cd > 0) {
            data.attackCooldownRemaining = Math.max(0, cd - 0.016);
          }

          if (shouldStartTelegraphedAttack(world, entity, data, DEFAULT_CHARGER_ATTACK_CONFIG)) {
            return "Anticipation";
          }

          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          if (playerDetected(sensor) && sensor?.detectedPlayerEntity !== undefined) {
            if (canTakeDamage(world, sensor.detectedPlayerEntity)) {
              return "Alert";
            }
          }
        }
      },
      Anticipation: {
        onEnter(world, entity, data) {
          enterAnticipationState(world, entity, data, DEFAULT_CHARGER_ATTACK_CONFIG.warningColor);
          const dir = dirToPlayer(world, entity);
          data.chargeDir = dir;

          const tr = world.getComponent(entity, "Transform");
          if (tr) {
            data.startChargeX = tr.worldX ?? tr.x;
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const cfg = DEFAULT_CHARGER_ATTACK_CONFIG;
          const chargeDir = (data.chargeDir as number) ?? 1;

          const vel = world.getMutableComponent(entity, "Velocity");
          if (vel) {
            vel.vx = -chargeDir * (cfg.windupBacktrackDistance / cfg.anticipationSeconds);
          }

          const res = updateAnticipationState(
            world,
            entity,
            data,
            elapsed,
            cfg.anticipationSeconds,
            "Charge"
          );
          if (res === "Recovery") {
            zeroVx(world, entity);
          }
          return res;
        }
      },
      Charge: {
        onEnter(world, entity, data) {
          const cfg = DEFAULT_CHARGER_ATTACK_CONFIG;
          const chargeDir = (data.chargeDir as number) ?? dirToPlayer(world, entity);

          const tr = world.getComponent(entity, "Transform");
          if (tr && data.startChargeX === undefined) {
            data.startChargeX = tr.worldX ?? tr.x;
          }

          const vel = world.getMutableComponent(entity, "Velocity");
          if (vel) {
            vel.vx = chargeDir * cfg.chargeSpeed;
          }

          enterActiveMeleeAttack(world, entity, chargeDir, cfg, "charger_melee");
        },
        onUpdate(world, entity, data, elapsed) {
          const cfg = DEFAULT_CHARGER_ATTACK_CONFIG;
          const chargeDir = (data.chargeDir as number) ?? 1;

          const vel = world.getMutableComponent(entity, "Velocity");
          if (vel && vel.vx !== chargeDir * cfg.chargeSpeed) {
            vel.vx = chargeDir * cfg.chargeSpeed;
          }

          if (isEnemyInHitstun(world, entity)) {
            return "Recovery";
          }

          const gd = world.getComponent(entity, "GroundDetector") as
            | { hasWallAhead?: boolean; hasGroundAhead?: boolean }
            | undefined;
          if (gd && (gd.hasWallAhead || gd.hasGroundAhead === false)) {
            return "Recovery";
          }

          const tr = world.getComponent(entity, "Transform");
          const startX = (data.startChargeX as number) ?? tr?.x ?? 0;
          if (tr) {
            const currentX = tr.worldX ?? tr.x;
            if (Math.abs(currentX - startX) >= cfg.maxChargeDistance) {
              return "Recovery";
            }
          }

          if (elapsed >= cfg.activeSeconds) {
            return "Recovery";
          }
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          enterTelegraphedRecovery(world, entity, data);
          data.startChargeX = undefined;
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          if (elapsed >= DEFAULT_CHARGER_ATTACK_CONFIG.recoverySeconds) {
            data.attackCooldownRemaining = DEFAULT_CHARGER_ATTACK_CONFIG.cooldownSeconds;
            return "Idle";
          }
        }
      }
    }
  };

  // ─── hr_shooter ─────────────────────────────────────────────
  registry["hr_shooter"] = {
    states: {
      Idle: {
        onEnter(world, entity) {
          zeroVx(world, entity);
        },
        onUpdate(world, entity, data, elapsed) {
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          if (playerDetected(sensor)) {
            facePlayer(world, entity);
            tryEnemyShoot(world, entity, data);
            return data.useFlank ? "Alert" : "Alert";
          }
                    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:589-599. Considerar extraer a función compartida. Ref: 4da0a38c
return timed(data, "idleDuration", 1.0, elapsed, "Idle");
        }
      },
      ...alertWindup,
      Attack: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          facePlayer(world, entity);
          tryEnemyShoot(world, entity, data);
        },
        onUpdate(world, entity, data, elapsed) {
          facePlayer(world, entity);
          tryEnemyShoot(world, entity, data);
                    // TODO(refactor): código duplicado detectado (bloque) con hitandrun/ai/hitRunStateMachines.ts:600-609. Considerar extraer a función compartida. Ref: 14a44eba
return timed(data, "attackDuration", 0.5, elapsed, "Recovery");
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "recoveryDuration", 0.6, elapsed, "Idle");
        }
      }
    }
  };

  // ─── hr_tank ────────────────────────────────────────────────
  registry["hr_tank"] = {
    states: {
      Idle: {
        onEnter(world, entity) {
          zeroVx(world, entity);
        },
        onUpdate(world, entity, data) {
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          if (playerDetected(sensor)) {
            facePlayer(world, entity);
            return "Alert";
          }
          const patrol = world.getComponent(entity, "Patrol") as
            | { direction: number }
            | undefined;
          const speed = ((data.patrolSpeed as number) ?? 40) * 0.5;
          if (patrol) {
            const targetVx = patrol.direction * speed;
            const vel = world.getComponent(entity, "Velocity");
            if (vel && vel.vx !== targetVx) {
              const mv = world.getMutableComponent(entity, "Velocity");
              if (mv) mv.vx = targetVx;
            }
          }
        }
      },
      ...alertWindup,
      Attack: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          facePlayer(world, entity);
          tryEnemyShoot(world, entity, data);
        },
        onUpdate(world, entity, data, elapsed) {
          facePlayer(world, entity);
          return timed(data, "attackDuration", 0.15, elapsed, "Recovery");
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "recoveryDuration", 0.8, elapsed, "Idle");
        }
      }
    }
  };
}
