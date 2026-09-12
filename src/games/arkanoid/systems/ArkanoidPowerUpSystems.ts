import { System, World, WorldUtils, Juice, CoreComponentRegistry, Entity, EntityBuilder, ShapeType, BoxShape } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry, CapsuleType } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";
import { ArkanoidEntityFactory } from "../EntityFactory";

export class ArkanoidPowerUpSpawnSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override onRegister(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.on("arkanoid:brick_destroyed", (event: any) => {
        if (event.powerUp) {
          this.spawnCapsule(world, event.x, event.y, event.powerUp);
        }
      });
    }
  }

  public spawnCapsule(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
    x: number,
    y: number,
    type: CapsuleType
  ): void {
    const capsuleEntity = EntityBuilder.createDeferred(world)
      .withTransform({ x, y, dirty: true })
      .withVelocity({ vx: 0, vy: 120 })
      .withRender({ shape: "box", size: 16, color: this.getCapsuleColor(type), order: 3 })
      .withCollider({
        shape: { type: ShapeType.Box, width: 20, height: 12 } as BoxShape,
        layer: 4,
        mask: 1
      })
      .withCollisionEvents()
      .build();

    world.getCommandBuffer().addComponent(capsuleEntity, {
      type: "Capsule",
      capsuleType: type,
      speed: 120
    });
    world.getCommandBuffer().addComponent(capsuleEntity, {
      type: "Tag",
      tags: ["Capsule", type]
    });
  }

  private getCapsuleColor(type: CapsuleType): string {
    switch (type) {
      case "E": return "#00FFDD"; // Blue/cyan Expand
      case "L": return "#FF0055"; // Red Laser
      case "C": return "#00FF66"; // Green Catch
      case "S": return "#FF9900"; // Orange Slow
      case "M": return "#CC00FF"; // Cyan/Purple Multiball
      case "B": return "#FFD700"; // Gold Break/Exit
      case "P": return "#FFFFFF"; // Extra Life
    }
  }

  public override update(_world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {}
}

export class ArkanoidActivePowerUpSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  private config?: ArkanoidConfig;

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    this.config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

    const capsules = world.query("Capsule", "Transform", "Velocity");
    const paddles = world.query("Paddle", "Transform");
    const paddleEntity = paddles[0];
    const paddlePos = paddleEntity !== undefined ? world.getComponent(paddleEntity, "Transform") : undefined;

    for (let i = 0; i < capsules.length; i++) {
      const cEntity = capsules[i];
      if (!WorldUtils.isEntityActive(world, cEntity)) continue;

      const capsule = world.getComponent(cEntity, "Capsule");
      const cPos = world.getComponent(cEntity, "Transform");

      if (!capsule || !cPos) continue;

      if (cPos.y > this.config.SCREEN_HEIGHT + 30) {
        world.getCommandBuffer().removeEntity(cEntity);
        continue;
      }

      if (paddlePos && paddleEntity !== undefined) {
        const pHalfW = this.config.PADDLE_WIDTH / 2;
        const pHalfH = this.config.PADDLE_HEIGHT / 2;

        if (
          cPos.x >= paddlePos.x - pHalfW - 10 &&
          cPos.x <= paddlePos.x + pHalfW + 10 &&
          cPos.y >= paddlePos.y - pHalfH - 10 &&
          cPos.y <= paddlePos.y + pHalfH + 10
        ) {
          this.applyCapsule(world, paddleEntity, capsule.capsuleType, cPos.x, cPos.y);
          world.getCommandBuffer().removeEntity(cEntity);
        }
      }
    }
  }

  public applyCapsule(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
    paddleEntity: Entity,
    type: CapsuleType,
    x: number,
    y: number
  ): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emitDeferred("arkanoid:powerup_collected", { capsuleType: type, x, y });
      if (!world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "level_up" });
      }
    }

    Juice.squash(world as World<CoreComponentRegistry>, paddleEntity, 1.3, 0.7, 150);

    // Instant effect P: Extra Life
    if (type === "P") {
      world.mutateSingleton("ArkanoidState", (s) => {
        s.lives += 1;
      });
      return;
    }

    // Instant effect M: Multiball (Disrupt)
    if (type === "M") {
      const balls = world.query("Ball", "Transform", "Velocity");
      if (balls.length > 0 && balls.length < 9) {
        const mainBall = balls[0];
        const mainPos = world.getComponent(mainBall, "Transform");
        const mainVel = world.getComponent(mainBall, "Velocity");
        if (mainPos && mainVel) {
          const speed = Math.sqrt(mainVel.vx * mainVel.vx + mainVel.vy * mainVel.vy) || 300;

          const b2 = ArkanoidEntityFactory.createBall(world);
          world.mutateComponent(b2, "Transform", (t) => { t.x = mainPos.x; t.y = mainPos.y; t.dirty = true; });
          world.mutateComponent(b2, "Ball", (b) => { b.isAttached = false; });
          world.mutateComponent(b2, "Velocity", (v) => { v.vx = Math.cos(-Math.PI / 3) * speed; v.vy = Math.sin(-Math.PI / 3) * speed; });

          const b3 = ArkanoidEntityFactory.createBall(world);
          world.mutateComponent(b3, "Transform", (t) => { t.x = mainPos.x; t.y = mainPos.y; t.dirty = true; });
          world.mutateComponent(b3, "Ball", (b) => { b.isAttached = false; });
          world.mutateComponent(b3, "Velocity", (v) => { v.vx = Math.cos(-2 * Math.PI / 3) * speed; v.vy = Math.sin(-2 * Math.PI / 3) * speed; });
        }
      }
      return;
    }

    // Persistent replacement rule: revert previous active state
    world.mutateComponent(paddleEntity, "Paddle", (p) => {
      p.isExpanded = false;
      p.isLaserActive = false;
      p.isCatchActive = false;
    });

    world.mutateSingleton("ArkanoidState", (s) => {
      s.activePowerUp = type;
    });

    switch (type) {
      case "E":
        world.mutateComponent(paddleEntity, "Paddle", (p) => { p.isExpanded = true; });
        break;
      case "L":
        world.mutateComponent(paddleEntity, "Paddle", (p) => { p.isLaserActive = true; });
        break;
      case "C":
        world.mutateComponent(paddleEntity, "Paddle", (p) => { p.isCatchActive = true; });
        break;
      case "S":
        const balls = world.query("Ball", "Velocity");
        for (let i = 0; i < balls.length; i++) {
          const bEntity = balls[i];
          world.mutateComponent(bEntity, "Velocity", (v) => {
            v.vx *= 0.7;
            v.vy *= 0.7;
          });
        }
        break;
      case "B":
        world.mutateSingleton("ArkanoidState", (s) => { s.portalActive = true; });
        break;
    }
  }
}

export class ArkanoidLaserSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const lasers = world.query("LaserProjectile", "Transform", "CollisionEvents");
    for (let i = 0; i < lasers.length; i++) {
      const lEntity = lasers[i];
      if (!WorldUtils.isEntityActive(world, lEntity)) continue;

      const events = world.getComponent(lEntity, "CollisionEvents");
      if (!events) continue;

      for (const col of events.collisions) {
        const other = col.otherEntity;
        if (!WorldUtils.isEntityActive(world, other)) continue;

        if (world.hasComponent(other, "Brick")) {
          const brick = world.getComponent(other, "Brick");
          const health = world.getComponent(other, "Health");

          if (brick && brick.material !== "gold" && health) {
            const eventBus = world.getEventBus();
            world.mutateComponent(other, "Health", (h) => {
              h.current = Math.max(0, h.current - 1);
            });
            world.mutateComponent(other, "Brick", (b) => {
              b.hp = Math.max(0, b.hp - 1);
            });

            if (eventBus) {
              if (health.current - 1 <= 0) {
                eventBus.emitDeferred("combat:death", { entity: other, attackerEntity: lEntity });
              } else {
                eventBus.emitDeferred("combat:hit", { targetEntity: other, attackerEntity: lEntity, damage: 1 });
              }
            }
          }
          world.getCommandBuffer().removeEntity(lEntity);
          break;
        } else if (world.hasComponent(other, "Enemy")) {
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("combat:death", { entity: other, attackerEntity: lEntity });
          }
          world.getCommandBuffer().removeEntity(lEntity);
          break;
        }
      }
    }
  }
}
