import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunWaveSystem, startWaveScript } from "./HitRunWaveSystem";
import { registerHitRunEnemyPool } from "./HitRunEnemyPool";
import type { WaveScript } from "./HitRunWaveTypes";
import { WAVE_OPENING } from "./sampleWaves";

export interface RegisterWavesOptions {
  /** Script inicial (default: WAVE_OPENING). */
  script?: WaveScript;
  /** No arrancar automáticamente. */
  autoStart?: boolean;
  defaultSpawnX?: number;
  defaultSpawnY?: number;
}

/**
 * Registra pool de enemigos + HitRunWaveSystem y opcionalmente arranca un script.
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

  const autoStart = opts.autoStart !== false;
  if (autoStart) {
    startWaveScript(world, opts.script ?? WAVE_OPENING);
  }

  return waveSys;
}
