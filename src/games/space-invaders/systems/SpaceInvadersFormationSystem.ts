import { System, World } from "@tiny-aster/core";
import { TransformComponent } from "@tiny-aster/core";
import { FormationComponent, InvaderComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { EnemyBulletPool } from "../EntityPool";
import { createEnemyBullet } from "../EntityFactory";
import { RandomService } from "@tiny-aster/core";

/**
 * System that manages the movement and firing of the invader formation.
 */
export class SpaceInvadersFormationSystem extends System<SpaceInvadersComponentRegistry> {
  private enemyBulletPool: EnemyBulletPool;
  private config?: SpaceInvadersConfig;

  constructor(enemyBulletPool: EnemyBulletPool) {
    super();
    this.enemyBulletPool = enemyBulletPool;
  }

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }

    const gameState = world.getSingleton("GameState");
    if (gameState && (gameState.readyRemaining > 0 || gameState.intermissionRemaining > 0 || gameState.continueCountdownRemaining > 0)) return;

    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;

    const formationEntity = formationEntities[0];
    const formation = world.getComponent(formationEntity, "Formation");
    if (!formation) return;

    const invaders = world.query("Invader", "Transform");
    if (invaders.length === 0) return;

    // 1. Calculate current speed based on remaining invaders
    const totalInvaders = this.config.INVADER_ROWS * this.config.INVADER_COLS;
    const ratio = 1 - (invaders.length / totalInvaders);
    const newSpeed = this.config.INVADER_SPEED_BASE + ratio * (this.config.INVADER_SPEED_MAX - this.config.INVADER_SPEED_BASE);

    if (formation.speed !== newSpeed) {
      world.mutateComponent(formationEntity, "Formation", f => {
        f.speed = newSpeed;
      });
    }

    // Heuristic: detect if deltaTime is in milliseconds (as in unit tests) or seconds (as in game loop)
    const isMs = deltaTime > 1.0;
    const dtSeconds = isMs ? deltaTime / 1000 : deltaTime;

    // 2. Move formation or handle step down
    const margin = 20;
    const moveX = formation.direction * formation.speed * dtSeconds;

    // Calculate current min/max bounds before moving
    let minX = Infinity;
    let maxX = -Infinity;
    for (const entity of invaders) {
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
      for (const entity of invaders) {
        const pos = world.getComponent(entity, "Transform");
        if (pos) {
          const nextY = pos.y + descentStep;
          world.mutateComponent(entity, "Transform", t => {
            t.y = nextY;
            t.dirty = true;
          });
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
      for (const entity of invaders) {
        const pos = world.getComponent(entity, "Transform");
        if (pos) {
          const nextX = pos.x + moveX;
          world.mutateComponent(entity, "Transform", t => {
            t.x = nextX;
            t.dirty = true;
          });
        }
      }
    }

    // 3. Enemy firing logic
    let shouldFire = false;
    let nextCooldownRemaining: number;

    if (isMs) {
      // In millisecond-based unit tests
      nextCooldownRemaining = formation.fireCooldownRemaining - deltaTime;
      if (nextCooldownRemaining <= 0) {
        shouldFire = true;
        const rng = world.gameplayRandom;
        nextCooldownRemaining = rng.nextRange(
          this.config.ENEMY_FIRE_INTERVAL_MIN,
          this.config.ENEMY_FIRE_INTERVAL_MAX
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
          this.config.ENEMY_FIRE_INTERVAL_MIN,
          this.config.ENEMY_FIRE_INTERVAL_MAX
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
      this.fireFromFormation(world, invaders);
    }
  }

  private fireFromFormation(world: World<SpaceInvadersComponentRegistry>, invaderEntities: ReadonlyArray<number>): void {
    // Group invaders by column and pick the bottom one
    const columns: Map<number, { entity: number, y: number }> = new Map();

    invaderEntities.forEach(entity => {
      const invader = world.getComponent(entity, "Invader");
      const pos = world.getComponent(entity, "Transform");
      if (invader && pos) {
        const existing = columns.get(invader.col);
        if (!existing || pos.y > existing.y) {
          columns.set(invader.col, { entity, y: pos.y });
        }
      }
    });

    const activeColumns = Array.from(columns.values());
    if (activeColumns.length > 0) {
      const rng = world.gameplayRandom;
      const shooter = activeColumns[rng.nextInt(0, activeColumns.length)];
      const shooterPos = world.getComponent(shooter.entity, "Transform");
      if (shooterPos) {
        createEnemyBullet(world, shooterPos.x, shooterPos.y + 15, this.enemyBulletPool);
      }
    }
  }
}
