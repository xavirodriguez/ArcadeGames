import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { DEFAULT_GRAZE_MARGIN, DEFAULT_GRAZE_SCORE, evaluateGraze } from "../graze/grazeMath";

/**
 * Awards score when the player near-misses enemy bullets (AUD-P2-01).
 * Distance check only — no second collider / no Damage on graze ring.
 */
export class ShmupGrazeSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  /** Entity ids of enemy bullets that already granted a graze credit. */
  private readonly grazedBullets = new Set<number>();

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
    const alive = new Set(bullets);
    for (const id of this.grazedBullets) {
      if (!alive.has(id)) this.grazedBullets.delete(id);
    }

    for (const bullet of bullets) {
      const bt = world.getComponent(bullet, "Transform");
      if (!bt) continue;

      const { graze } = evaluateGraze({
        playerX: playerT.x,
        playerY: playerT.y,
        bulletX: bt.x,
        bulletY: bt.y,
        hitRadius,
        grazeMargin,
        alreadyGrazed: this.grazedBullets.has(bullet)
      });

      if (!graze) continue;

      this.grazedBullets.add(bullet);
      world.mutateSingleton("ShmupGameState", (s) => {
        s.score += grazeScore;
        s.grazeCount = (s.grazeCount ?? 0) + 1;
      });
      world.getEventBus()?.emitDeferred("shmup:graze", { bullet, score: grazeScore });
    }
  }
}
