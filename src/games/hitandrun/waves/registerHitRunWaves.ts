import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunWaveSystem, startWaveScript } from "./HitRunWaveSystem";
import { HitRunSectionWaveSystem } from "./HitRunSectionWaveSystem";
import { HitRunSectionPresentationSystem } from "../systems/HitRunSectionPresentationSystem";
import { registerHitRunEnemyPool } from "./HitRunEnemyPool";
import type { WaveScript } from "./HitRunWaveTypes";
import { WAVE_OPENING } from "./sampleWaves";

export interface RegisterWavesOptions {
  /** Script inicial (default: WAVE_OPENING). */
  script?: WaveScript;
  /**
   * Auto-start a script on register.
   * Belt mode should pass false and rely on HitRunSectionWaveSystem.
   */
  autoStart?: boolean;
  /** Drive waves from belt section waveId (default true). */
  sectionDriven?: boolean;
  defaultSpawnX?: number;
  defaultSpawnY?: number;
}

/**
 * Registra pool de enemigos + HitRunWaveSystem (+ SectionWave + presentation).
 */
export function registerHitRunWaves(
  world: World<CoreComponentRegistry>,
  opts: RegisterWavesOptions = {}
): HitRunWaveSystem {
  registerHitRunEnemyPool(world);

  const waveSys = new HitRunWaveSystem({
    defaultSpawnX: opts.defaultSpawnX,
    defaultSpawnY: opts.defaultSpawnY
  });

  world.addSystem(waveSys, { phase: SystemPhase.Simulation, priority: 5 });

  const sectionDriven = opts.sectionDriven !== false;
  if (sectionDriven) {
    world.addSystem(new HitRunSectionWaveSystem(), {
      phase: SystemPhase.Simulation,
      priority: 4
    });
    world.addSystem(new HitRunSectionPresentationSystem(), {
      phase: SystemPhase.Presentation,
      priority: 10
    });
  }

  const autoStart = opts.autoStart === true || (!sectionDriven && opts.autoStart !== false);
  if (autoStart) {
    startWaveScript(world, opts.script ?? WAVE_OPENING);
  }

  return waveSys;
}
