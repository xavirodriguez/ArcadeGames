import { System, World, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { DEFAULT_GRAZE_MARGIN, DEFAULT_GRAZE_SCORE, evaluateGraze } from "../graze/grazeMath";
import {
  spawnFloatingText,
  spawnGrazeSparks
} from "../juice/ShmupJuiceHelpers";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

/**
 * Awards score when the player near-misses enemy bullets (AUD-P2-01).
 * Distance check only — no second collider / no Damage on graze ring.
 * Juice: flash, cyan sparks, floating GRAZE text, distinct SFX.
 */
export class ShmupGrazeSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _dt: number): void {
    const state = world.getSingleton("ShmupGameState");
    if (state?.isGameOver) return;

    const config = world.getResource<ShmupConfig>("GameConfig");
    const hitRadius = config?.PLAYER_COLLIDER_RADIUS ?? 2.5;
    const grazeMargin = config?.GRAZE_MARGIN ?? DEFAULT_GRAZE_MARGIN;
    const grazeScore = config?.GRAZE_SCORE ?? DEFAULT_GRAZE_SCORE;

    const players = world.query("ShmupPlayer", "Transform");
    if (players.length === 0) return;
    const player = players[0];
    const playerT = world.getComponent(player, "Transform");
    if (!playerT) return;

    const bullets = world.query("ShmupEnemyBullet", "Transform");

    for (const bullet of bullets) {
      const bt = world.getComponent(bullet, "Transform");
      const bulletTag = world.getComponent(bullet, "ShmupEnemyBullet");
      if (!bt || !bulletTag) continue;

      const { graze } = evaluateGraze({
        playerX: playerT.x,
        playerY: playerT.y,
        bulletX: bt.x,
        bulletY: bt.y,
        hitRadius,
        grazeMargin,
        alreadyGrazed: bulletTag.grazed === true
      });

      if (!graze) continue;

      world.mutateComponent(bullet, "ShmupEnemyBullet", (tag) => {
        tag.grazed = true;
      });
      world.mutateSingleton("ShmupGameState", (s) => {
        s.score += grazeScore;
        s.grazeCount = (s.grazeCount ?? 0) + 1;
      });
      world.getEventBus()?.emitDeferred("shmup:graze", { bullet, score: grazeScore });

      if (!world.isReSimulating) {
        world.mutateComponent(player, "Render", (r) => {
          r.hitFlashFrames = Math.max(r.hitFlashFrames ?? 0, 4);
        });
        Juice.flash(world, player, 4);
        spawnGrazeSparks(world, (playerT.x + bt.x) * 0.5, (playerT.y + bt.y) * 0.5);
        spawnFloatingText(
          world,
          playerT.x,
          playerT.y - 18,
          `GRAZE +${grazeScore}`,
          SHMUP_COLOR_TOKENS.player.primary,
          0.55
        );
        world.getEventBus()?.emitDeferred("PlaySFX", {
          name: "score",
          volume: 0.55,
          pitchRange: 0.12,
          cooldownMs: 50
        });
      }
    }
  }
}
