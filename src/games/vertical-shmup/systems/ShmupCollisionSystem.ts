import { System, World, WorldUtils, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import { JuiceOrchestrator } from "../../shared/rendering/JuiceOrchestrator";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

export class ShmupCollisionSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  private subscribed = false;

  public override onRegister(world: World<ShmupComponentRegistry, ShmupEventRegistry>): void {
    this.subscribe(world);
  }

  private subscribe(world: World<ShmupComponentRegistry, ShmupEventRegistry>): void {
    if (this.subscribed) return;
    this.subscribed = true;
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
          return;
        }

        // Enemy hits need an equally immediate visual response, without changing combat state.
        const enemy = world.getComponent(event.targetEntity, "ShmupEnemy");
        if (enemy) {
          world.mutateComponent(event.targetEntity, "Render", (render) => {
            render.hitFlashFrames = Math.max(render.hitFlashFrames ?? 0, 5);
          });
        }
      });
      world.getEventBus()?.on("combat:shield_absorbed", (event) => {
        if (!event || typeof event.targetEntity !== "number" || world.isReSimulating) return;
        const transform = world.getComponent(event.targetEntity, "Transform");
        if (!transform) return;
        new JuiceOrchestrator(world).spawn("pixelfx_shield_pulse", {
          x: transform.worldX ?? transform.x,
          y: transform.worldY ?? transform.y,
          tint: SHMUP_COLOR_TOKENS.player.primary,
          scale: 1.15,
          ttl: 0.34
        });
      });
  }
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    this.subscribe(world);

    // 0. Recharge explicit shield charges independently from temporary hit invulnerability.
    for (const entity of world.query("ShmupPlayer", "Shield")) {
      const shield = world.getMutableComponent(entity, "Shield");
      if (!shield || shield.charges >= shield.maxCharges) continue;
      shield.rechargeRemaining = Math.max(0, shield.rechargeRemaining - Math.max(0, deltaTime));
      if (shield.rechargeRemaining <= 0) {
        shield.charges = Math.min(shield.maxCharges, shield.charges + 1);
      }
    }

    // 1. Process Enemy Destruction
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      if (transform) {
        spawnLayeredExplosion(world, transform.x, transform.y, { type: "enemy" });
        Juice.playHitJuice(world, entity, { shakeIntensity: 2.0, shakeDuration: 80 });
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
          }
          world.mutateSingleton("ShmupGameState", (state) => {
            state.isGameOver = true;
          });
        }
      }
    }

  }
}
