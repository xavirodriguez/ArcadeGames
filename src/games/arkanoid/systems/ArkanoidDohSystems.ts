import { System, World, WorldUtils, Juice, CoreComponentRegistry, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { DohFactory, DOH_REQUIRED_HITS } from "../boss/DohFactory";

export class DohAttackSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const bossEntities = world.query("Boss", "Transform");
    const bossEntity = bossEntities[0];
    if (bossEntity === undefined || !WorldUtils.isEntityActive(world, bossEntity)) return;

    const boss = world.getComponent(bossEntity, "Boss");
    const pos = world.getComponent(bossEntity, "Transform");
    if (!boss || !pos) return;

    if (boss.state === "intro") {
      let newIntro = boss.introTimer - deltaTime;
      if (newIntro <= 0) {
        world.mutateComponent(bossEntity, "Boss", (b) => {
          b.state = "idle";
          b.introTimer = 0;
        });
      } else {
        world.mutateComponent(bossEntity, "Boss", (b) => {
          b.introTimer = newIntro;
        });
      }
      return;
    }

    if (boss.state === "damaged") {
      let newDamaged = boss.damagedTimer - deltaTime;
      if (newDamaged <= 0) {
        world.mutateComponent(bossEntity, "Boss", (b) => {
          b.state = "idle";
          b.damagedTimer = 0;
        });
      } else {
        world.mutateComponent(bossEntity, "Boss", (b) => {
          b.damagedTimer = newDamaged;
        });
      }
      return;
    }

    if (boss.state === "defeated") return;

    let newAttackTimer = boss.attackTimer - deltaTime;
    if (newAttackTimer <= 0) {
      world.mutateComponent(bossEntity, "Boss", (b) => {
        b.attackTimer = 2.5;
        b.state = "attack";
      });

      const paddleEntities = world.query("Paddle", "Transform");
      const paddlePos = paddleEntities[0] !== undefined ? world.getComponent(paddleEntities[0], "Transform") : undefined;

      const targetX = paddlePos ? paddlePos.x : pos.x;
      const targetY = paddlePos ? paddlePos.y : pos.y + 400;

      const angle = Math.atan2(targetY - pos.y, targetX - pos.x);

      DohFactory.createBossProjectile(world, pos.x - 20, pos.y + 40, Math.cos(angle - 0.2) * 180, Math.sin(angle - 0.2) * 180);
      DohFactory.createBossProjectile(world, pos.x, pos.y + 40, Math.cos(angle) * 200, Math.sin(angle) * 200);
      DohFactory.createBossProjectile(world, pos.x + 20, pos.y + 40, Math.cos(angle + 0.2) * 180, Math.sin(angle + 0.2) * 180);

      const eventBus = world.getEventBus();
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "hit" });
      }
    } else {
      world.mutateComponent(bossEntity, "Boss", (b) => {
        b.attackTimer = newAttackTimer;
      });
    }
  }
}

export class DohRulesSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override onRegister(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.on("combat:hit", (event: any) => {
        const target = event.targetEntity;
        if (target && world.hasComponent(target, "Boss")) {
          this.handleDohHit(world, target, event.attackerEntity);
        }
      });
    }
  }

  public handleDohHit(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, bossEntity: Entity, attackerEntity?: Entity): void {
    if (!WorldUtils.isEntityActive(world, bossEntity)) return;

    if (attackerEntity && world.hasComponent(attackerEntity, "LaserProjectile")) {
      return;
    }

    const boss = world.getComponent(bossEntity, "Boss");
    if (!boss || boss.state === "intro" || boss.state === "defeated" || boss.damagedTimer > 0) return;

    const nextHits = boss.hitsReceived + 1;
    const hitsRemaining = DOH_REQUIRED_HITS - nextHits;

    world.mutateComponent(bossEntity, "Boss", (b) => {
      b.hitsReceived = nextHits;
      b.hp = Math.max(0, DOH_REQUIRED_HITS - nextHits);
      b.state = nextHits >= DOH_REQUIRED_HITS ? "defeated" : "damaged";
      b.damagedTimer = 0.3;
    });

    Juice.shake(world as World<CoreComponentRegistry>, 8, 200);

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emitDeferred("arkanoid:doh_hit", { hitsRemaining });
      if (!world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "explosion" });
      }
    }

    if (nextHits >= DOH_REQUIRED_HITS) {
      world.mutateSingleton("ArkanoidState", (s) => {
        s.score += 10000;
        s.isVictory = true;
        s.bricksRemaining = 0;
      });

      if (eventBus) {
        eventBus.emitDeferred("arkanoid:doh_defeated", {});
        if (!world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "level_up" });
        }
      }

      world.getCommandBuffer().removeEntity(bossEntity);
    }
  }

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const projEntities = world.query("BossProjectile", "Transform", "CollisionEvents");
    const paddleEntities = world.query("Paddle");

    const paddleEntity = paddleEntities[0];
    if (paddleEntity === undefined) return;

    for (let i = 0; i < projEntities.length; i++) {
      const pEntity = projEntities[i];
      if (!WorldUtils.isEntityActive(world, pEntity)) continue;

      const events = world.getComponent(pEntity, "CollisionEvents");
      if (!events) continue;

      for (const col of events.collisions) {
        if (col.otherEntity === paddleEntity) {
          world.mutateSingleton("ArkanoidState", (s) => {
            s.lives = Math.max(0, s.lives - 1);
            if (s.lives <= 0) s.isGameOver = true;
          });

          Juice.shake(world as World<CoreComponentRegistry>, 10, 300);
          world.getCommandBuffer().removeEntity(pEntity);
          break;
        }
      }
    }
  }
}
