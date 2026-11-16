import { System, World, WorldUtils, Juice, hasInputAction } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import { requestHitStop, spawnFloatingText, triggerDamageVignette } from "../juice/ShmupJuiceHelpers";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

const DEFAULT_STOCK = 3;
const DEFAULT_INVULN = 1.5;
const DEFAULT_ENEMY_DAMAGE = 2;
const DEFAULT_BOSS_DAMAGE = 1;

export class ShmupBombSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  private bombHeld = false;

  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _dt: number): void {
    if (world.getResource("IsPaused") === true) return;
    const state = world.getSingleton("ShmupGameState");
    if (!state || state.isGameOver) {
      this.bombHeld = false;
      return;
    }

    const config = world.getResource<ShmupConfig>("GameConfig");
    const inputState = world.getSingleton("InputState") as { buttons?: Record<string, boolean> } | undefined;
    const touchState = world.getResource<{ getButton?: (name: string) => boolean }>("TouchInputState");

    let bombDown = Boolean(inputState?.buttons?.bomb);
    if (touchState?.getButton?.("bomb")) bombDown = true;

    for (const entity of world.query("ShmupPlayer", "Input")) {
      const input = world.getComponent(entity, "Input");
      if (input && hasInputAction(input.actions as never, "bomb" as never)) {
        bombDown = true;
      }
    }

    const risingEdge = bombDown && !this.bombHeld;
    this.bombHeld = bombDown;
    if (!risingEdge) return;

    const stock = state.bombsRemaining ?? config?.BOMB_STOCK_INITIAL ?? DEFAULT_STOCK;
    if (stock <= 0) return;

    this.detonate(world, config);
  }

  private detonate(world: World<ShmupComponentRegistry, ShmupEventRegistry>, config: ShmupConfig | undefined): void {
    const invuln = config?.BOMB_INVULN_DURATION ?? DEFAULT_INVULN;
    const enemyDmg = config?.BOMB_ENEMY_DAMAGE ?? DEFAULT_ENEMY_DAMAGE;
    const bossDmg = config?.BOMB_BOSS_DAMAGE ?? DEFAULT_BOSS_DAMAGE;

    let bulletsCleared = 0;
    for (const bullet of [...world.query("ShmupEnemyBullet")]) {
      WorldUtils.removeOrReclaim(world, bullet);
      bulletsCleared += 1;
    }

    let enemiesHit = 0;
    for (const enemy of world.query("ShmupEnemy", "Health")) {
      const enemyComp = world.getComponent(enemy, "ShmupEnemy");
      const health = world.getComponent(enemy, "Health");
      if (!enemyComp || !health || health.current <= 0) continue;
      const amount = enemyComp.archetype === "boss" ? bossDmg : enemyDmg;
      world.mutateComponent(enemy, "Health", (h) => {
        h.current = Math.max(0, h.current - amount);
      });
      world.mutateComponent(enemy, "Render", (r) => {
        r.hitFlashFrames = Math.max(r.hitFlashFrames ?? 0, 8);
      });
      enemiesHit += 1;
    }

    for (const player of world.query("ShmupPlayer", "Health", "Transform")) {
      world.mutateComponent(player, "Health", (h) => {
        h.invulnerableRemaining = Math.max(h.invulnerableRemaining ?? 0, invuln);
      });
      const transform = world.getComponent(player, "Transform");
      if (transform) {
        spawnLayeredExplosion(world, transform.x, transform.y, { type: "boss", scale: 1.25 });
        Juice.playDeathJuice(world, player, { shakeIntensity: 7.0, shakeDuration: 200 });
        spawnFloatingText(world, transform.x, transform.y - 24, "BOMB", SHMUP_COLOR_TOKENS.warning, 0.8);
      }
    }

    world.mutateSingleton("ShmupGameState", (s) => {
      const current = s.bombsRemaining ?? config?.BOMB_STOCK_INITIAL ?? DEFAULT_STOCK;
      s.bombsRemaining = Math.max(0, current - 1);
    });

    world.getEventBus()?.emitDeferred("shmup:bomb", {
      bulletsCleared,
      enemiesHit,
      bombsRemaining: world.getSingleton("ShmupGameState")?.bombsRemaining ?? 0
    });

    requestHitStop(world, 3);
    triggerDamageVignette(world, 0.12, 0.45);

    if (!world.isReSimulating) {
      world.getEventBus()?.emitDeferred("PlaySFX", {
        name: "explosion_large",
        volume: 1.0,
        pitchRange: 0.04
      });
    }
  }
}
