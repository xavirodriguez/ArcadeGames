import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { StateMachineDefinition } from "@tiny-aster/core";
import { tryEnemyShoot } from "./enemyShoot";
import {
  DEFAULT_FLANK,
  computeFlankTarget,
  steerTowardFlank,
  flipFlankSide,
  type FlankConfig
} from "./flankingHelpers";

function zeroVx(world: World<CoreComponentRegistry>, entity: number): void {
  const vel = world.getComponent(entity, "Velocity");
  if (vel && vel.vx !== 0) {
    const m = world.getMutableComponent(entity, "Velocity");
    if (m) m.vx = 0;
  }
}

function dirToPlayer(world: World<CoreComponentRegistry>, entity: number): number {
  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;
  const self = world.getComponent(entity, "Transform");
  if (!sensor?.detectedPlayerEntity || !self) return 1;
  const pt = world.getComponent(sensor.detectedPlayerEntity, "Transform");
  if (!pt) return 1;
  return pt.x >= self.x ? 1 : -1;
}

function playerDetected(
  sensor: { detectedPlayerEntity?: number } | undefined
): boolean {
  return sensor?.detectedPlayerEntity !== undefined;
}

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

function facePlayer(world: World<CoreComponentRegistry>, entity: number): void {
  const dir = dirToPlayer(world, entity);
  const tr = world.getComponent(entity, "Transform");
  if (!tr) return;
  const desired = dir >= 0 ? 1 : -1;
  if (tr.scaleX !== desired) {
    const m = world.getMutableComponent(entity, "Transform");
    if (m) {
      m.scaleX = desired;
      m.dirty = true;
    }
  }
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
  let registry = world.getResource<Record<string, StateMachineDefinition>>(
    "StateMachineRegistry"
  );
  if (!registry) {
    registry = {};
    world.setResource("StateMachineRegistry", registry);
  }

  // ─── hr_walk ────────────────────────────────────────────────
  registry["hr_walk"] = {
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
          const trans = world.getComponent(entity, "Transform");
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
                if (mp) mp.direction = -1;
              }
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

          if (data.canShoot && playerDetected(sensor)) {
            tryEnemyShoot(world, entity, data);
          }

          if (playerDetected(sensor)) return "Alert";
        }
      },
      ...alertWindup,
      Attack: {
        onEnter(world, entity, data) {
          const speed = ((data.patrolSpeed as number) ?? 60) * 1.4;
          const dir = dirToPlayer(world, entity);
          const vel = world.getComponent(entity, "Velocity");
          if (vel) {
            const mv = world.getMutableComponent(entity, "Velocity");
            if (mv) mv.vx = dir * speed;
          }
          if (data.canShoot) tryEnemyShoot(world, entity, data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "attackDuration", 0.4, elapsed, "Recovery");
        }
      },
      Recovery: {
        onEnter(world, entity, data) {
          zeroVx(world, entity);
          if (data.useFlank) flipFlankSide(data);
        },
        onUpdate(_w, _e, data, elapsed) {
          return timed(data, "recoveryDuration", 0.35, elapsed, "Patrol");
        }
      }
    }
  };

  // ─── hr_flank: especialista en pinza ─────────────────────────
  registry["hr_flank"] = {
    states: {
      Patrol: {
        onUpdate(world, entity, data) {
          // Misma patrulla ligera que walk
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
          // Desde el flanco: empuje corto hacia el jugador
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
          flipFlankSide(data); // alternar lado → pinza dinámica
        },
        onUpdate(world, entity, data, elapsed) {
          // Si el jugador sigue cerca, volver a Flank sin patrullar
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
          // Hop con sesgo de flanco: salta hacia el lado preferido del jugador
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
        onUpdate(world, entity) {
          const sensor = world.getComponent(entity, "PlayerSensor") as
            | { detectedPlayerEntity?: number }
            | undefined;
          if (playerDetected(sensor)) return "Alert";
        }
      },
      Alert: alertWindup.Alert,
      // Charge puede flanquear brevemente antes de embestir
      Flank: alertWindup.Flank,
      Windup: alertWindup.Windup,
      Attack: {
        onEnter(world, entity, data) {
          const chargeSpeed = (data.chargeSpeed as number) ?? 300;
          const dir = dirToPlayer(world, entity);
          facePlayer(world, entity);
          const vel = world.getComponent(entity, "Velocity");
          if (vel) {
            const mv = world.getMutableComponent(entity, "Velocity");
            if (mv) mv.vx = dir * chargeSpeed;
          }
        },
        onUpdate(world, entity, data, elapsed) {
          const gd = world.getComponent(entity, "GroundDetector") as
            | { hasWallAhead?: boolean; hasGroundAhead?: boolean }
            | undefined;
          const dur = (data.attackDuration as number) ?? 0.9;
          if (
            (gd && (gd.hasWallAhead || gd.hasGroundAhead === false)) ||
            elapsed >= dur
          ) {
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
          return timed(data, "recoveryDuration", 0.5, elapsed, "Idle");
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
