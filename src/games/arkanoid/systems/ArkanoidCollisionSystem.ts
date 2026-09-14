import {
  System,
  World,
  WorldUtils,
  Juice,
  CoreComponentRegistry,
  createEmitter,
  Entity
} from "@tiny-aster/core";
import { spawnScorePopup } from "@tiny-aster/gameplay-kit";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

export class ArkanoidCollisionSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  private config?: ArkanoidConfig;
  private processedPairs = new Set<string>();

  public override onRegister(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>): void {
    this.config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
    // TODO(refactor): código duplicado detectado (bloque) con space-invaders/systems/SpaceInvadersCollisionSystem.ts:52-63. Considerar extraer a función compartida. Ref: 4d167694
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.on("combat:hit", (event: any) => {
        this.onCombatHit(world, event);
      });
      eventBus.on("combat:death", (event: any) => {
        this.onCombatDeath(world, event);
      });
    }
  }

  private onCombatHit(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, event: any): void {
    const target = event.targetEntity;
    if (!target || !WorldUtils.isEntityActive(world, target)) return;

    if (world.hasComponent(target, "Brick")) {
      world.mutateComponent(target, "Render", (render) => {
        render.hitFlashFrames = 4;
      });

      world.setResource("GameplayFreeze", { remaining: 0.04 });
      Juice.squash(world as World<CoreComponentRegistry>, target, 1.15, 0.85, 120);

      const pos = world.getComponent(target, "Transform");
      if (pos) {
        const sparkEmitter = createEmitter(world as World<CoreComponentRegistry>, {
          type: "spark",
          x: pos.x,
          y: pos.y,
          rate: 0,
          burst: true,
          count: 4,
          lifetime: [0.1, 0.25],
          speed: [60, 150],
          size: [2, 4],
          color: ["#00FFFF", "#FFFFFF", "#FF0055"],
          angle: [0, 360],
          loop: false
        });
        world.getCommandBuffer().addComponent(sparkEmitter, { type: "TTL", timeLeft: 0.25, remaining: 0.25 });
      }

      const eventBus = world.getEventBus();
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "hit" });
      }
    }
  }

  private onCombatDeath(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, event: any): void {
    const target = event.entity;
    if (!target || !WorldUtils.isEntityActive(world, target)) return;

    if (world.hasComponent(target, "Brick")) {
      const brick = world.getComponent(target, "Brick");
      const pos = world.getComponent(target, "Transform");
      const state = world.getSingleton("ArkanoidState");

      if (brick && pos && state) {
        // Reset anti-stuck counter when a brick is destroyed
        const balls = world.query("Ball");
        for (let bIdx = 0; bIdx < balls.length; bIdx++) {
          world.mutateComponent(balls[bIdx], "Ball", (b) => {
            b.stuckBounces = 0;
          });
        }

        let nextMultiplier = 1;
        const comboEntities = world.query("Combo");
        const comboEntity = comboEntities[0];
        if (comboEntity !== undefined) {
          world.mutateComponent(comboEntity, "Combo", (c) => {
            c.combo += 1;
            c.timerRemaining = (this.config?.COMBO_TIMEOUT ?? 2000) / 1000;
            c.multiplier = Math.min(this.config?.MAX_MULTIPLIER ?? 10, 1 + Math.floor(c.combo / 4));
            nextMultiplier = c.multiplier;
          });
        }

        const pointsGained = brick.points * nextMultiplier;
        world.mutateSingleton("ArkanoidState", (s) => {
          s.score += pointsGained;
          s.bricksRemaining = Math.max(0, s.bricksRemaining - 1);
        });

        let popupColor = "#00FFFF";
        if (nextMultiplier >= 6) popupColor = "#FFD700";
        else if (nextMultiplier >= 3) popupColor = "#FF00FF";

        const popupText = nextMultiplier > 1 ? `+${pointsGained} (x${nextMultiplier})` : `+${pointsGained}`;
        spawnScorePopup(world, pos.x, pos.y, popupText, popupColor);

        const explosionEmitter = createEmitter(world as World<CoreComponentRegistry>, {
          type: "spark",
          x: pos.x,
          y: pos.y,
          rate: 0,
          burst: true,
          count: 10,
          lifetime: [0.15, 0.35],
          speed: [80, 220],
          size: [3, 6],
          color: [popupColor, "#FFFFFF", "#FF0055"],
          angle: [0, 360],
          loop: false
        });
        world.getCommandBuffer().addComponent(explosionEmitter, { type: "TTL", timeLeft: 0.35, remaining: 0.35 });

        Juice.shake(world as World<CoreComponentRegistry>, nextMultiplier >= 4 ? 5 : 3, 120);

        if (brick.kind === "explosive") {
          this.triggerExplosiveAOE(world, pos.x, pos.y);
        }

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emitDeferred("arkanoid:brick_destroyed", {
            entity: target,
            kind: brick.kind,
            points: pointsGained,
            x: pos.x,
            y: pos.y,
            powerUp: brick.powerUp
          });
          if (!world.isReSimulating) {
            eventBus.emitDeferred("PlaySFX", { name: "explosion" });
          }
        }
      }

      world.getCommandBuffer().removeEntity(target);
    }
  }

  private triggerExplosiveAOE(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, cx: number, cy: number): void {
    const bricks = world.query("Brick", "Transform", "Health");
    const radius = 100;

    for (let i = 0; i < bricks.length; i++) {
      const bEntity = bricks[i];
      if (!WorldUtils.isEntityActive(world, bEntity)) continue;

      const bPos = world.getComponent(bEntity, "Transform");
      const bHealth = world.getComponent(bEntity, "Health");

      if (bPos && bHealth && bHealth.current > 0) {
        const dx = bPos.x - cx;
        const dy = bPos.y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          world.mutateComponent(bEntity, "Health", (h) => {
            h.current = Math.max(0, h.current - 1);
          });
          const eventBus = world.getEventBus();
          if (eventBus) {
            if (bHealth.current - 1 <= 0) {
              eventBus.emitDeferred("combat:death", { entity: bEntity });
            } else {
              eventBus.emitDeferred("combat:hit", { targetEntity: bEntity, damage: 1 });
            }
          }
        }
      }
    }
  }

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    this.config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

    this.processedPairs.clear();

    const ballEntities = world.query("Ball", "Transform", "Velocity");
    const paddleEntities = world.query("Paddle", "Transform");

    const paddleEntity = paddleEntities[0];
    const paddlePos = paddleEntity !== undefined ? world.getComponent(paddleEntity, "Transform") : undefined;
    const paddleComp = paddleEntity !== undefined ? world.getComponent(paddleEntity, "Paddle") : undefined;

    for (let i = 0; i < ballEntities.length; i++) {
      const ballEntity = ballEntities[i];
      if (!WorldUtils.isEntityActive(world, ballEntity)) continue;

      const ball = world.getComponent(ballEntity, "Ball");
      const transform = world.getComponent(ballEntity, "Transform");
      const velocity = world.getComponent(ballEntity, "Velocity");

      if (!ball || ball.isAttached || !transform || !velocity) continue;

      const radius = this.config.BALL_SIZE;

      // Anti-stuck check
      const stuckCount = ball.stuckBounces ?? 0;
      if (stuckCount >= 16) {
        const speed = Math.max(200, Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy));
        const rndSign = world.gameplayRandom.next() > 0.5 ? 1 : -1;
        const nudgeAngle = Math.PI / 4 * rndSign; // 45 degree nudge down
        world.mutateComponent(ballEntity, "Velocity", (v) => {
          v.vx = Math.sin(nudgeAngle) * speed;
          v.vy = Math.abs(Math.cos(nudgeAngle) * speed); // Force downward towards paddle
        });
        world.mutateComponent(ballEntity, "Ball", (b) => {
          b.stuckBounces = 0;
        });
      }

      if (transform.x - radius < 0) {
        world.mutateComponent(ballEntity, "Transform", (t) => { t.x = radius; t.dirty = true; });
        world.mutateComponent(ballEntity, "Velocity", (v) => { v.vx = Math.abs(v.vx); });
        world.mutateComponent(ballEntity, "Ball", (b) => { b.stuckBounces = (b.stuckBounces ?? 0) + 1; });
        this.playSFX(world, "hit");
      } else if (transform.x + radius > this.config.SCREEN_WIDTH) {
        world.mutateComponent(ballEntity, "Transform", (t) => { t.x = this.config!.SCREEN_WIDTH - radius; t.dirty = true; });
        world.mutateComponent(ballEntity, "Velocity", (v) => { v.vx = -Math.abs(v.vx); });
        world.mutateComponent(ballEntity, "Ball", (b) => { b.stuckBounces = (b.stuckBounces ?? 0) + 1; });
        this.playSFX(world, "hit");
      }

      if (transform.y - radius < 0) {
        world.mutateComponent(ballEntity, "Transform", (t) => { t.y = radius; t.dirty = true; });
        world.mutateComponent(ballEntity, "Velocity", (v) => { v.vy = Math.abs(v.vy); });
        world.mutateComponent(ballEntity, "Ball", (b) => { b.stuckBounces = (b.stuckBounces ?? 0) + 1; });
        this.playSFX(world, "hit");
      }

      if (paddlePos && paddleComp && velocity.vy > 0) {
        const pWidth = paddleComp.isExpanded ? this.config.PADDLE_WIDTH * 1.5 : this.config.PADDLE_WIDTH;
        const pHalfW = pWidth / 2;
        const pHalfH = this.config.PADDLE_HEIGHT / 2;

        if (
          transform.x + radius >= paddlePos.x - pHalfW &&
          transform.x - radius <= paddlePos.x + pHalfW &&
          transform.y + radius >= paddlePos.y - pHalfH &&
          transform.y - radius <= paddlePos.y + pHalfH
        ) {
          const currentSpeed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
          const newSpeed = Math.min(currentSpeed * this.config.BALL_ACCELERATION, this.config.BALL_SPEED_MAX);
          const offsetX = transform.x - paddlePos.x;

          if (paddleComp.isCatchActive) {
            world.mutateComponent(ballEntity, "Ball", (b) => {
              b.isAttached = true;
              b.attachedOffsetX = offsetX;
              // TODO(refactor): código duplicado detectado (bloque) con arkanoid/systems/ArkanoidCollisionSystem.ts:413-421. Considerar extraer a función compartida. Ref: 024e3b8e
              b.speed = newSpeed;
              b.stuckBounces = 0;
            });
            world.mutateComponent(ballEntity, "Velocity", (v) => {
              v.vx = 0;
              v.vy = 0;
            });
            world.mutateComponent(ballEntity, "Transform", (t) => {
              t.x = paddlePos.x + offsetX;
              t.y = paddlePos.y - pHalfH - radius;
              t.dirty = true;
            });
            Juice.squash(world as World<CoreComponentRegistry>, paddleEntity, 1.2, 0.8, 100);
            this.playSFX(world, "hit");
          } else {
            const rawOffset = offsetX / pHalfW;
            const hitOffset = Math.max(-0.9, Math.min(0.9, rawOffset));

            const maxAngleShift = Math.PI / 3;
            const spinEffect = paddleComp.lastVelocityX * 0.0008;
            const bounceAngle = -Math.PI / 2 + hitOffset * maxAngleShift + spinEffect;

            const minVy = -Math.max(60, newSpeed * 0.25);

            world.mutateComponent(ballEntity, "Velocity", (v) => {
              let calcVx = Math.cos(bounceAngle) * newSpeed;
              let calcVy = Math.sin(bounceAngle) * newSpeed;
              if (calcVy > minVy) calcVy = minVy;
              v.vx = calcVx;
              v.vy = calcVy;
            });

            world.mutateComponent(ballEntity, "Transform", (t) => {
              t.y = paddlePos.y - pHalfH - radius;
              t.dirty = true;
            });

            world.mutateComponent(ballEntity, "Ball", (b) => {
              b.stuckBounces = 0;
            });

            Juice.squash(world as World<CoreComponentRegistry>, paddleEntity, 1.2, 0.8, 100);
            this.playSFX(world, "hit");
          }
        }
      }

      const eventsComp = world.getComponent(ballEntity, "CollisionEvents");
      if (eventsComp) {
        for (const col of eventsComp.collisions) {
          const other = col.otherEntity;
          if (!WorldUtils.isEntityActive(world, other) || !world.hasComponent(other, "Brick")) continue;

          const pairKey = `${Math.min(ballEntity, other)}_${Math.max(ballEntity, other)}`;
          if (this.processedPairs.has(pairKey)) continue;
          this.processedPairs.add(pairKey);

          const brickPos = world.getComponent(other, "Transform");
          if (brickPos) {
            const bHalfW = this.config.BRICK_WIDTH / 2;
            const bHalfH = this.config.BRICK_HEIGHT / 2;

            const dx = transform.x - brickPos.x;
            const dy = transform.y - brickPos.y;

            const overlapX = bHalfW + radius - Math.abs(dx);
            const overlapY = bHalfH + radius - Math.abs(dy);

            world.mutateComponent(ballEntity, "Ball", (b) => {
              b.stuckBounces = (b.stuckBounces ?? 0) + 1;
            });

            if (overlapX < overlapY) {
              const signX = dx !== 0 ? (dx > 0 ? 1 : -1) : (velocity.vx >= 0 ? 1 : -1);
              world.mutateComponent(ballEntity, "Velocity", (v) => {
                v.vx = Math.abs(v.vx) * signX;
              });
              world.mutateComponent(ballEntity, "Transform", (t) => {
                t.x = brickPos.x + signX * (bHalfW + radius);
                t.dirty = true;
              });
            } else {
              const signY = dy !== 0 ? (dy > 0 ? 1 : -1) : (velocity.vy >= 0 ? 1 : -1);
              world.mutateComponent(ballEntity, "Velocity", (v) => {
                v.vy = Math.abs(v.vy) * signY;
              });
              world.mutateComponent(ballEntity, "Transform", (t) => {
                t.y = brickPos.y + signY * (bHalfH + radius);
                t.dirty = true;
              });
            }
          }
        }
      }

      if (transform.y - radius > this.config.SCREEN_HEIGHT || transform.y > this.config.PADDLE_Y + 50) {
        this.handleBallLost(world, ballEntity);
      }
    }
  }

  private handleBallLost(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, ballEntity: Entity): void {
    const state = world.getSingleton("ArkanoidState");
    if (!state || state.isGameOver) return;

    const allBalls = world.query("Ball");
    let activeBallCount = 0;
    for (let i = 0; i < allBalls.length; i++) {
      if (WorldUtils.isEntityActive(world, allBalls[i])) {
        activeBallCount++;
      }
    }

    if (activeBallCount > 1) {
      world.getCommandBuffer().removeEntity(ballEntity);
      return;
    }

    let remainingLives = state.lives - 1;
    world.mutateSingleton("ArkanoidState", (s) => {
      s.lives = remainingLives;
      if (remainingLives <= 0) {
        s.isGameOver = true;
      }
    });

    if (remainingLives > 0) {
      const paddleEntities = world.query("Paddle", "Transform");
      const paddleEntity = paddleEntities[0];

      if (paddleEntity !== undefined) {
        world.mutateComponent(paddleEntity, "Paddle", (p) => {
          p.isLaserActive = false;
          p.isExpanded = false;
          p.isCatchActive = false;
          p.laserCooldown = 0;
        });
      }
      world.mutateSingleton("ArkanoidState", (s) => {
        s.activePowerUp = null;
      });

      const paddlePos = paddleEntity !== undefined ? world.getComponent(paddleEntity, "Transform") : undefined;
      const paddleX = paddlePos ? paddlePos.x : this.config?.SCREEN_CENTER_X ?? 400;
      const paddleY = paddlePos ? paddlePos.y : this.config?.PADDLE_Y ?? 550;
      const pHalfH = (this.config?.PADDLE_HEIGHT ?? 16) / 2;
      const ballRadius = this.config?.BALL_SIZE ?? 8;

      world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = true;
        b.attachedOffsetX = 0;
        b.stuckBounces = 0;
      });
      world.mutateComponent(ballEntity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = 0;
      });
      world.mutateComponent(ballEntity, "Transform", (t) => {
        t.x = paddleX;
        t.y = paddleY - pHalfH - ballRadius;
        t.dirty = true;
      });

      const eventBus = world.getEventBus();
      if (eventBus) {
        eventBus.emitDeferred("arkanoid:ball_lost", { entity: ballEntity, remainingLives });
        if (!world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "hit" });
        }
      }
    } else {
      const eventBus = world.getEventBus();
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "game_over" });
      }
    }
  }

  private playSFX(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, name: string): void {
    const eventBus = world.getEventBus();
    if (eventBus && !world.isReSimulating) {
      eventBus.emitDeferred("PlaySFX", { name });
    }
  }
}
