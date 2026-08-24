import { System, World, EventBus } from "@tiny-aster/core";
import { NebulaDashComponentRegistry, NebulaDashEventRegistry } from "../types/NebulaDashRegistry";
import { NebulaDashConfig } from "../config/NebulaDashConfigSchema";

export class NebulaCollisionSystem extends System<NebulaDashComponentRegistry, NebulaDashEventRegistry> {
  private unsubscribeDeath?: () => void;

  public override onRegister(world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry>): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      this.unsubscribeDeath = eventBus.on("combat:death", (payload) => {
        const playerEntities = world.query("Player");
        if (playerEntities.includes(payload.entity)) {
          world.mutateSingleton("NebulaDashState", (state) => {
            state.isGameOver = true;
          });

          const comboEntity = world.query("Combo")[0];
          if (comboEntity !== undefined) {
            world.mutateComponent(comboEntity, "Combo", (c) => {
              c.combo = 0;
              c.multiplier = 1;
              c.timerRemaining = 0;
            });
          }
        }
      });
    }
  }

  public override dispose(): void {
    if (this.unsubscribeDeath) {
      this.unsubscribeDeath();
      this.unsubscribeDeath = undefined;
    }
  }

  public override update(world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry>, dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<NebulaDashConfig>("GameConfig");
    const maxMultiplier = config?.MAX_MULTIPLIER ?? 10;
    const timeoutDuration = (config?.COMBO_TIMEOUT ?? 2000) / 1000;

    // 1. Plasma Wall Ascent & Acceleration
    const plasmaEntities = world.query("PlasmaRisingWall", "Transform", "Velocity");
    for (const wallEntity of plasmaEntities) {
      world.mutateComponent(wallEntity, "PlasmaRisingWall", (w) => {
        w.ascentSpeed += w.acceleration * dt;
      });
      const wallComp = world.getComponent(wallEntity, "PlasmaRisingWall")!;

      world.mutateComponent(wallEntity, "Velocity", (v) => {
        v.vy = -wallComp.ascentSpeed;
      });
    }

    // 2. Obstacle Gap Crossing Detection
    const playerEntities = world.query("Player", "Transform", "Combo");
    if (playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];
    const playerTransform = world.getComponent(playerEntity, "Transform")!;

    const gapEntities = world.query("ObstacleGap", "Transform");
    for (const gapEntity of gapEntities) {
      const gapComp = world.getComponent(gapEntity, "ObstacleGap")!;
      if (gapComp.passed) continue;

      const gapTransform = world.getComponent(gapEntity, "Transform")!;
      // Player successfully climbed above the obstacle gap line
      if (playerTransform.y < gapTransform.y - 10) {
        world.mutateComponent(gapEntity, "ObstacleGap", (g) => {
          g.passed = true;
        });

        world.mutateComponent(playerEntity, "Combo", (c) => {
          c.combo += 1;
          c.multiplier = Math.min(maxMultiplier, 1 + Math.floor(c.combo / 5));
          c.timerRemaining = timeoutDuration;

          world.mutateSingleton("NebulaDashState", (state) => {
            state.score += 100 * c.multiplier;
          });
        });

        const eventBus = world.getEventBus() as EventBus;
        if (eventBus) {
          eventBus.emitDeferred("nebula:gap_passed", { gapEntity });
        }
      }
    }
  }
}
