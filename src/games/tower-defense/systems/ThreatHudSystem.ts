import { System, SystemPhase, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  GameStateComponent,
  ThreatInfo,
} from "../types/TowerDefenseTypes";

/**
 * Keeps ThreatInfo resource updated for HUD.
 * remainingInWave ≈ still pending to spawn + currently alive.
 */
export class ThreatHudSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Presentation;

  update(world: World<TowerDefenseComponentRegistry>, _dt: number): void {
    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
    const alive = world.query("Creep").length;
    let remainingInWave = alive;
    const director = world.query("SpawnDirector")[0];
    if (director !== undefined) {
      const sd = world.getComponent(director, "SpawnDirector") as { enemiesRemaining?: number } | undefined;
      if (typeof sd?.enemiesRemaining === "number") {
        remainingInWave = sd.enemiesRemaining;
      }
    }
    world.setResource<ThreatInfo>("ThreatInfo", {
      alive,
      remainingInWave,
      waveIndex: gs?.wave ?? 0,
    });
  }
}
