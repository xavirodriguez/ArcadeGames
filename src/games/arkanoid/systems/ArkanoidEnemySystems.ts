import { System, World, WorldUtils } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";
import { ArkanoidEnemyFactory } from "../enemies/ArkanoidEnemyFactory";

export class EnemySpawnSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  private spawnCooldown = 12.0;
  private timer = 4.0;
  private maxEnemies = 3;

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const state = world.getSingleton("ArkanoidState");
    if (!state || state.isGameOver || state.level === 33) return;

    const activeEnemies = world.query("Enemy");
    if (activeEnemies.length >= this.maxEnemies) return;

    this.timer -= deltaTime;
    if (this.timer <= 0) {
      this.timer = this.spawnCooldown;
      const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

      const spawnFromLeft = world.gameplayRandom.next() > 0.5;
      const spawnX = spawnFromLeft ? 120 : config.SCREEN_WIDTH - 120;
      const spawnY = 40;

      const patterns: Array<"horizontal" | "sine" | "arc" | "swoop"> = ["sine", "horizontal", "arc", "swoop"];
      const patternIndex = Math.floor(world.gameplayRandom.next() * patterns.length);

      ArkanoidEnemyFactory.createEnemy(world, spawnX, spawnY, patterns[patternIndex]);

      const eventBus = world.getEventBus();
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "hit" });
      }
    }
  }
}

export class EnemyMovementSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const enemies = world.query("Enemy", "Transform", "Velocity");
    const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

    for (let i = 0; i < enemies.length; i++) {
      const eEntity = enemies[i];
      if (!WorldUtils.isEntityActive(world, eEntity)) continue;

      const enemy = world.getComponent(eEntity, "Enemy");
      const transform = world.getComponent(eEntity, "Transform");

      if (!enemy || !transform) continue;

      let newTimer = (enemy.timer || 0) + deltaTime;
      world.mutateComponent(eEntity, "Enemy", (e) => {
        e.timer = newTimer;
      });

      let nextX = transform.x;
      let nextY = transform.y + 40 * deltaTime;
      const startX = enemy.startX ?? transform.x;
      const startY = enemy.startY ?? transform.y;

      switch (enemy.pattern) {
        case "sine":
          nextX = startX + Math.sin(newTimer * 3) * 60;
          break;
        case "horizontal":
          nextX = startX + Math.sin(newTimer * 2) * 120;
          break;
        case "arc":
          nextX = startX + Math.cos(newTimer * 2) * 80;
          break;
        case "swoop":
          nextX = startX + Math.sin(newTimer * 4) * 100;
          nextY = startY + newTimer * 60;
          break;
      }

      if (nextY > config.SCREEN_HEIGHT + 40) {
        world.getCommandBuffer().removeEntity(eEntity);
        continue;
      }

      world.mutateComponent(eEntity, "Transform", (t) => {
        t.x = nextX;
        t.y = nextY;
        t.dirty = true;
      });
    }
  }
}

export class EnemyRulesSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const enemies = world.query("Enemy", "Transform", "CollisionEvents");
    for (let i = 0; i < enemies.length; i++) {
      const eEntity = enemies[i];
      if (!WorldUtils.isEntityActive(world, eEntity)) continue;

      const events = world.getComponent(eEntity, "CollisionEvents");
      if (!events) continue;

      for (const col of events.collisions) {
        const other = col.otherEntity;
        if (!WorldUtils.isEntityActive(world, other)) continue;

        if (world.hasComponent(other, "Ball")) {
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("combat:death", { entity: eEntity, attackerEntity: other });
          }
          break;
        } else if (world.hasComponent(other, "Paddle")) {
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("combat:death", { entity: eEntity, attackerEntity: other });
          }
          break;
        }
      }
    }
  }
}
