import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { EnemyBulletPool } from "../EntityPool";
import { createEnemyBullet } from "../EntityFactory";
import { tickBulletPattern, computeBulletPatternAngles } from "../../shared/BulletPatternSystem";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

export class ShmupBulletPatternSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    if (!pool) return;
    const player = world.query("ShmupPlayer", "Transform")[0];
    const target = player === undefined ? undefined : world.getComponent(player, "Transform");

    for (const entity of world.query("ShmupEnemy", "Transform", "BulletPattern")) {
      const pattern = world.getMutableComponent(entity, "BulletPattern");
      const transform = world.getComponent(entity, "Transform");
      if (!pattern || !transform) continue;

      const next = tickBulletPattern(pattern, deltaTime, pattern.config);
      pattern.cooldownRemaining = next.cooldownRemaining;
      pattern.phase = next.phase;
      if (pattern.cooldownRemaining > 0) continue;

      const aim = Math.atan2((target?.y ?? transform.y + 1) - transform.y, (target?.x ?? transform.x) - transform.x);
      let bulletColor: string = SHMUP_COLOR_TOKENS.bullet.warm;
      if (pattern.config.kind === "aimed") {
        bulletColor = SHMUP_COLOR_TOKENS.bullet.hot;
      } else if (pattern.config.kind === "spread" || pattern.config.kind === "ring") {
        bulletColor = SHMUP_COLOR_TOKENS.bullet.special;
      }

      for (const angle of computeBulletPatternAngles(pattern.config, aim, pattern.phase)) {
        createEnemyBullet(
          world,
          transform.x,
          transform.y + 10,
          Math.cos(angle) * pattern.config.speed,
          Math.sin(angle) * pattern.config.speed,
          pool,
          bulletColor
        );
      }
      pattern.cooldownRemaining = 1 / Math.max(0.001, pattern.config.ratePerSec);
    }
  }
}
