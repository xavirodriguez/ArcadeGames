import { System, World, WorldUtils, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import {
  requestHitStop,
  spawnFloatingText,
  triggerDamageVignette,
  bumpPlayerCombo,
  getPlayerCombo,
  comboScaledShake,
  comboSfxPitch,
  comboParticleColor
} from "../juice/ShmupJuiceHelpers";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import {
  DEFAULT_BOMB_STOCK_MAX,
  DEFAULT_BOSS_KILL_BOMB_REWARD,
  grantBombs
} from "../bombs/bombEconomy";

function playSfx(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  name: string,
  options?: { volume?: number; cooldownMs?: number; pitchRange?: number }
): void {
  if (world.isReSimulating) return;
  world.getEventBus()?.emitDeferred("PlaySFX", { name, ...options });
}

function firstPlayer(world: World<ShmupComponentRegistry, ShmupEventRegistry>): number | undefined {
  const players = world.query("ShmupPlayer");
  return players[0];
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
          // Hard damage juice: hit-stop + vignette
          requestHitStop(world, 3);
          triggerDamageVignette(world, 0.15, 0.9);
          return;
        }

        const enemy = world.getComponent(event.targetEntity, "ShmupEnemy");
        if (enemy) {
          world.mutateComponent(event.targetEntity, "Render", (render) => {
            render.hitFlashFrames = Math.max(render.hitFlashFrames ?? 0, 5);
          });
          const { combo } = getPlayerCombo(world);
          playSfx(world, "hit", {
            volume: 0.55,
            cooldownMs: 40,
            pitchRange: comboSfxPitch(combo)
          });
        }
      });
    }

    const config = world.getResource<ShmupConfig>("GameConfig");

    // 1. Process Enemy Destruction
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      const isBoss = enemy.archetype === "boss";
      const playerId = firstPlayer(world);
      let combo = 0;
      let multiplier = 1;
      if (playerId !== undefined) {
        const bumped = bumpPlayerCombo(world, playerId);
        combo = bumped.combo;
        multiplier = bumped.multiplier;
      }

      const award = Math.floor(enemy.score * multiplier);

      if (transform) {
        const tint = comboParticleColor(combo);
        spawnLayeredExplosion(world, transform.x, transform.y, {
          type: isBoss ? "boss" : "enemy",
          scale: isBoss ? 1.15 : 1,
          color: tint
        });
        if (isBoss) {
          Juice.playDeathJuice(world, entity, { shakeIntensity: 8.0, shakeDuration: 220 });
          requestHitStop(world, 5);
          playSfx(world, "explosion_large", { volume: 1.0, pitchRange: comboSfxPitch(combo) });
        } else {
          Juice.playHitJuice(world, entity, { shakeIntensity: 2.0, shakeDuration: 80 });
          comboScaledShake(world, 2.0, 80, combo);
          requestHitStop(world, combo >= 8 ? 3 : 2);
          playSfx(world, "explosion_small", {
            volume: 0.85,
            cooldownMs: 40,
            pitchRange: comboSfxPitch(combo)
          });
        }
        spawnFloatingText(
          world,
          transform.x,
          transform.y - 10,
          `+${award}`,
          combo >= 8 ? SHMUP_COLOR_TOKENS.gold.sunlight : SHMUP_COLOR_TOKENS.warning,
          0.75
        );
        if (combo >= 5 && combo % 5 === 0) {
          spawnFloatingText(
            world,
            transform.x + 12,
            transform.y - 28,
            `${combo} HIT!`,
            SHMUP_COLOR_TOKENS.player.primary,
            0.9
          );
        }
      }

      world.mutateSingleton("ShmupGameState", (state) => {
        state.score += award;
      });

      // Boss reward is gameplay state, so it also applies while resimulating.
      // The flag travels with the serializable enemy component, keeping the
      // reward single-shot even if this entity is processed again before the
      // deferred removal is flushed.
      if (isBoss && enemy.bombRewardGranted !== true) {
        world.mutateComponent(entity, "ShmupEnemy", (component) => {
          component.bombRewardGranted = true;
        });
        world.mutateSingleton("ShmupGameState", (state) => {
          state.bombsRemaining = grantBombs(
            state.bombsRemaining ?? config?.BOMB_STOCK_INITIAL ?? 3,
            config?.BOSS_KILL_BOMB_REWARD ?? DEFAULT_BOSS_KILL_BOMB_REWARD,
            config?.BOMB_STOCK_MAX ?? DEFAULT_BOMB_STOCK_MAX
          );
        });
      }

      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: award });
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
            requestHitStop(world, 4);
            triggerDamageVignette(world, 0.25, 1.0);
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
