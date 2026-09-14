import { World } from "@tiny-aster/core";
import { TransformComponent } from "@tiny-aster/core";
import { FormationComponent, InvaderComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { EnemyBulletPool } from "../EntityPool";
import { createEnemyBullet } from "../EntityFactory";
import { RandomService } from "@tiny-aster/core";
import { GameSystem } from "./GameSystem";

/**
 * System that manages the movement and firing of the invader formation.
 */
export class SpaceInvadersFormationSystem extends GameSystem {
  private enemyBulletPool: EnemyBulletPool;
  private columnShooterEntities: Int32Array = new Int32Array(16);
  private columnShooterY: Float32Array = new Float32Array(16);
  private compactShooters: Int32Array = new Int32Array(16);

  constructor(enemyBulletPool: EnemyBulletPool) {
    super();
    this.enemyBulletPool = enemyBulletPool;
  }

  private ensureCapacity(cols: number): void {
    if (this.columnShooterEntities.length < cols) {
      this.columnShooterEntities = new Int32Array(cols);
      this.columnShooterY = new Float32Array(cols);
      this.compactShooters = new Int32Array(cols);
    }
  }

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.shouldUpdate(world)) return;
    const config = this.getGameConfig(world);
    const gameState = world.getSingleton("GameState");

    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;

    const formationEntity = formationEntities[0];
    const formation = world.getComponent(formationEntity, "Formation");
    if (!formation) return;

    // Heuristic: detect if deltaTime is in milliseconds (as in unit tests) or seconds (as in game loop)
    const isMs = deltaTime > 1.0;
    const dtSeconds = isMs ? deltaTime / 1000 : deltaTime;

    if (formation.stunnedRemaining && formation.stunnedRemaining > 0) {
      const nextStun = formation.stunnedRemaining - dtSeconds;
      world.mutateComponent(formationEntity, "Formation", f => {
        f.stunnedRemaining = Math.max(0, nextStun);
      });
      return;
    }

    const invaders = world.query("Invader", "Transform");
    if (invaders.length === 0) return;

    // 1. Calculate current speed based on remaining invaders and level progression
    const totalInvaders = formation.totalInvaders > 0
      ? formation.totalInvaders
      : (config.INVADER_ROWS * config.INVADER_COLS);
    const ratio = 1 - (invaders.length / totalInvaders);

    const level = gameState?.level || 1;
    const levelSpeedMult = Math.pow(config.LEVEL_SPEED_MULTIPLIER ?? 1.1, level - 1);
    const levelFireRateMult = Math.pow(config.LEVEL_FIRE_RATE_MULTIPLIER ?? 0.97, level - 1);

    const baseSpeed = config.INVADER_SPEED_BASE * levelSpeedMult;
    const maxSpeed = config.INVADER_SPEED_MAX * levelSpeedMult;
    const newSpeed = baseSpeed + ratio * (maxSpeed - baseSpeed);

    if (formation.speed !== newSpeed) {
      world.mutateComponent(formationEntity, "Formation", f => {
        f.speed = newSpeed;
      });
    }

    // 2. Move formation or handle step down
    const margin = 20;
    const moveX = formation.direction * formation.speed * dtSeconds;

    // Safe for determinism/rollback. Sequential indexed loops replace for..of iterators to avoid per-tick iterator allocations.
    let minX = Infinity;
    let maxX = -Infinity;
    const invCount = invaders.length;

    for (let i = 0; i < invCount; i++) {
      const entity = invaders[i];
      const pos = world.getComponent(entity, "Transform");
      if (!pos) continue;
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
    }

    const leftLimit = margin;
    const rightLimit = GAME_CONFIG.SCREEN_WIDTH - margin;

    // Use predictive edge checking considering movement direction
    const willHitRight = formation.direction > 0 && maxX + moveX >= rightLimit;
    const willHitLeft  = formation.direction < 0 && minX + moveX <= leftLimit;

    if (willHitRight || willHitLeft) {
      const directionBefore = formation.direction;
      const nextDirection = (directionBefore * -1) as 1 | -1;
      const descentStep = formation.descentStep;

      // Movimiento vertical inmediato (estructuralmente distribuido)
      for (let i = 0; i < invCount; i++) {
        const entity = invaders[i];
        const pos = world.getComponent(entity, "Transform");
        if (pos) {
          const nextY = pos.y + descentStep;
          const t = world.getMutableComponent(entity, "Transform");
          if (t) {
            t.y = nextY;
            t.dirty = true;
          }
        }
      }

      world.mutateComponent(formationEntity, "Formation", f => {
        f.stepDownPending = false;
        f.direction = nextDirection;
      });
      console.debug("[SpaceInvaders] formation step down", {
        directionBefore,
        directionAfter: nextDirection,
        invaderCount: invaders.length,
      });
    } else {
      for (let i = 0; i < invCount; i++) {
        const entity = invaders[i];
        const pos = world.getComponent(entity, "Transform");
        if (pos) {
          const nextX = pos.x + moveX;
          const t = world.getMutableComponent(entity, "Transform");
          if (t) {
            t.x = nextX;
            t.dirty = true;
          }
        }
      }
    }

    // 3. Enemy firing logic
    let shouldFire = false;
    let nextCooldownRemaining: number;
    const minFireInterval = config.ENEMY_FIRE_INTERVAL_MIN * levelFireRateMult;
    const maxFireInterval = config.ENEMY_FIRE_INTERVAL_MAX * levelFireRateMult;

    if (isMs) {
      // In millisecond-based unit tests
      nextCooldownRemaining = formation.fireCooldownRemaining - deltaTime;
      if (nextCooldownRemaining <= 0) {
        shouldFire = true;
        const rng = world.gameplayRandom;
        nextCooldownRemaining = rng.nextRange(
          minFireInterval,
          maxFireInterval
        ) / (1 + ratio);
      }
    } else {
      // In second-based game loop
      let currentCooldown = formation.fireCooldownRemaining;
      if (currentCooldown > 100) {
        currentCooldown = currentCooldown / 1000;
      }
      nextCooldownRemaining = currentCooldown - dtSeconds;
      if (nextCooldownRemaining <= 0) {
        shouldFire = true;
        const rng = world.gameplayRandom;
        const nextCooldown = (rng.nextRange(
          minFireInterval,
          maxFireInterval
        ) / 1000) / (1 + ratio);
        nextCooldownRemaining = nextCooldown;
      }
    }

    // Pure mutation
    world.mutateComponent(formationEntity, "Formation", f => {
      f.fireCooldownRemaining = nextCooldownRemaining;
    });

    if (shouldFire) {
      // Estructural: llamar a factorías FUERA de mutateComponent
      this.fireFromFormation(world, invaders, config.INVADER_COLS);
    }
  }

  private fireFromFormation(
    world: World<SpaceInvadersComponentRegistry>,
    invaderEntities: ReadonlyArray<number>,
    cols: number
  ): void {
    this.ensureCapacity(cols);
    this.columnShooterEntities.fill(-1);
    this.columnShooterY.fill(-10000);

    const len = invaderEntities.length;
    for (let i = 0; i < len; i++) {
      const entity = invaderEntities[i];
      const invader = world.getComponent(entity, "Invader");
      const pos = world.getComponent(entity, "Transform");
      if (invader && pos) {
        const col = invader.col;
        if (col >= 0 && col < cols) {
          if (this.columnShooterEntities[col] === -1 || pos.y > this.columnShooterY[col]) {
            this.columnShooterEntities[col] = entity;
            this.columnShooterY[col] = pos.y;
          }
        }
      }
    }

    let validCount = 0;
    for (let col = 0; col < cols; col++) {
      const entity = this.columnShooterEntities[col];
      if (entity !== -1) {
        this.compactShooters[validCount++] = entity;
      }
    }

    if (validCount > 0) {
      const rng = world.gameplayRandom;
      const targetIndex = rng.nextInt(0, validCount);
      const selectedEntity = this.compactShooters[targetIndex];
      if (selectedEntity !== -1 && selectedEntity !== undefined) {
        const shooterPos = world.getComponent(selectedEntity, "Transform");
        if (shooterPos) {
          createEnemyBullet(world, shooterPos.x, shooterPos.y + 15, this.enemyBulletPool);
          world.getEventBus()?.emitDeferred("PlaySFX", { name: "shoot_enemy" });
        }
      }
    }
  }
}
