import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import { nextBossPhase, resolveBossPhase } from "../boss/bossPhase";
import { createBossPatternConfig } from "../boss/bossPatterns";

/**
 * Maps boss health ratios to attack phases. The system holds no mutable state:
 * the only phase authority is the serializable `BossPhase` component, so a
 * snapshot rewind restores the exact attack pattern as well.
 */
export class ShmupBossPhaseSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _deltaTime: number): void {
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!config) return;
    const wave = world.getSingleton("ShmupGameState")?.wave ?? 1;
    const baseBulletSpeed = config.ENEMY_BULLET_SPEED ?? 280;

    for (const entity of world.query("ShmupEnemy", "Health", "BossPhase", "BulletPattern")) {
      const health = world.getComponent(entity, "Health");
      const bossPhase = world.getComponent(entity, "BossPhase");
      const pattern = world.getMutableComponent(entity, "BulletPattern");
      if (!health || !bossPhase || !pattern) continue;

      const candidate = resolveBossPhase(health.current, health.max);
      const resolved = nextBossPhase(bossPhase.phase, candidate);
      if (resolved === bossPhase.phase) continue;

      world.mutateComponent(entity, "BossPhase", (component) => {
        component.phase = resolved;
      });
      // Replace (never mutate) the config and reset the spiral sequence so a
      // phase change replays deterministically from phase zero.
      pattern.config = createBossPatternConfig(resolved, baseBulletSpeed, wave);
      pattern.phase = 0;
    }
  }
}
