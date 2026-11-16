import { System, World, WorldUtils, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";

function playSfx(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  name: string,
  options?: { volume?: number; cooldownMs?: number; pitchRange?: number }
): void {
  if (world.isReSimulating) return;
  world.getEventBus()?.emitDeferred("PlaySFX", { name, ...options });
}

export class ShmupCollisionSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  private subscribed = false;

  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _deltaTime: number): void {
    if (!this.subscribed) {
      this.subscribed = true;
      world.getEventBus()?.on("combat:hit", (event) => {
        if (!event || typeof event.targetEntity !== "number") return;
        const player = world.getComponent(event.targetEntity, "ShmupPlayer");
        if (player) {
          world.mutateComponent(event.targetEntity, "Health", (health) => {
            health.invulnerableRemaining = 1.5;
          });
          world.mutateComponent(event.targetEntity, "Render", (render) => {
            render.hitFlashFrames = 10;
          });
          Juice.playHitJuice(world, event.targetEntity, { shakeIntensity: 4.0, shakeDuration: 120 });
          playSfx(world, "hit", { volume: 0.9, cooldownMs: 80 });
          return;
        }

        const enemy = world.getComponent(event.targetEntity, "ShmupEnemy");
        if (enemy) {
          world.mutateComponent(event.targetEntity, "Render", (render) => {
            render.hitFlashFrames = Math.max(render.hitFlashFrames ?? 0, 5);
          });
          playSfx(world, "hit", { volume: 0.55, cooldownMs: 40, pitchRange: 0.08 });
        }
      });
    }

    // 1. Process Enemy Destruction
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      if (transform) {
        const isBoss = enemy.archetype === "boss";
        spawnLayeredExplosion(world, transform.x, transform.y, {
          type: isBoss ? "boss" : "enemy",
          scale: isBoss ? 1.15 : 1
        });
        if (isBoss) {
          Juice.playDeathJuice(world, entity, { shakeIntensity: 8.0, shakeDuration: 220 });
          playSfx(world, "explosion_large", { volume: 1.0 });
        } else {
          Juice.playHitJuice(world, entity, { shakeIntensity: 2.0, shakeDuration: 80 });
          playSfx(world, "explosion_small", { volume: 0.85, cooldownMs: 40 });
        }
      }

      world.mutateSingleton("ShmupGameState", (state) => {
        state.score += enemy.score;
      });
      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: enemy.score });
      WorldUtils.removeOrReclaim(world, entity);
    }

    // 2. Process Player Damage, Invulnerability & Lives Sync
    for (const entity of world.query("ShmupPlayer", "Health")) {
      const health = world.getMutableComponent(entity, "Health");
      if (!health) continue;

      world.mutateSingleton("ShmupGameState", (state) => {
        state.lives = Math.max(0, health.current);
      });

      if (health.current <= 0) {
        const alreadyGameOver = world.getSingleton("ShmupGameState")?.isGameOver === true;
        if (!alreadyGameOver) {
          const transform = world.getComponent(entity, "Transform");
          if (transform) {
            spawnLayeredExplosion(world, transform.x, transform.y, { type: "ship" });
            Juice.playDeathJuice(world, entity, { shakeIntensity: 6.0, shakeDuration: 180 });
            playSfx(world, "explosion_large", { volume: 1.0 });
            playSfx(world, "game_over", { volume: 0.9 });
          }
          world.mutateSingleton("ShmupGameState", (state) => {
            state.isGameOver = true;
          });
        }
      }
    }
  }
}
