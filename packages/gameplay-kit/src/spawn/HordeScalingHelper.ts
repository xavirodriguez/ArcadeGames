import { WaveDefinition, SpawnRequest } from "./components/SpawnComponents";

/**
 * Configuration parameters for procedural parametric horde scaling across waves.
 * @public
 */
export interface HordeScalingConfig {
  /** Optional base prefix string for generated wave IDs (defaults to "wave"). */
  baseWaveId?: string;
  /** Base number of enemies in wave 0 (defaults to 5). */
  baseCount: number;
  /** Growth rate multiplier per wave (e.g. 1.2 for 20% exponential growth per wave). */
  growthFactor: number;
  /** Maximum enemy spawn count cap per wave. */
  maxCount?: number;
  /** Base delay between enemy spawns in seconds (defaults to 1.0s). */
  baseSpawnInterval: number;
  /** Minimum delay floor between spawns in seconds (defaults to 0.1s). */
  minSpawnInterval?: number;
  /** Rate at which spawn interval decreases per wave in seconds (defaults to 0.05s). */
  intervalDecayPerWave?: number;
  /** List of candidate enemy blueprint IDs to spawn. */
  enemyBlueprints: string[];
  /** Post-wave intermission cooldown in seconds (defaults to 3.0s). */
  cooldown?: number;
  /** Interval of waves resulting in a boss encounter (e.g. every 5th wave). */
  bossWaveInterval?: number;
  /** Blueprint ID for boss encounters. */
  bossBlueprintId?: string;
}

/**
 * Generates a parametrically scaled `WaveDefinition` for a given wave index.
 *
 * @remarks
 * Calculates enemy density curves, decaying spawn rhythm intervals, and periodic boss waves
 * to convert discrete wave directors into infinite procedural horde scaling systems.
 *
 * @param waveIndex - 0-based wave index.
 * @param config - Horde scaling configuration parameters.
 * @returns Fully populated `WaveDefinition` compatible with `SpawnDirectorSystem`.
 * @public
 */
export function generateScaledWave(
  waveIndex: number,
  config: HordeScalingConfig
): WaveDefinition {
  const isBossWave =
    config.bossWaveInterval !== undefined &&
    config.bossWaveInterval > 0 &&
    (waveIndex + 1) % config.bossWaveInterval === 0;

  const waveId = `${config.baseWaveId ?? "wave"}_${waveIndex + 1}`;
  const cooldown = config.cooldown ?? 3.0;

  if (isBossWave && config.bossBlueprintId) {
    return {
      id: waveId,
      isBossWave: true,
      cooldown,
      spawns: [
        {
          blueprintId: config.bossBlueprintId,
          args: { waveIndex },
          delay: 0,
        },
      ],
    };
  }

  // Calculate scaled enemy count: baseCount * (growthFactor ^ waveIndex)
  const rawCount = Math.floor(config.baseCount * Math.pow(config.growthFactor, waveIndex));
  const count = config.maxCount !== undefined ? Math.min(config.maxCount, rawCount) : rawCount;

  // Calculate scaled spawn interval rhythm
  const minInterval = config.minSpawnInterval ?? 0.1;
  const intervalDecay = config.intervalDecayPerWave ?? 0.05;
  const spawnInterval = Math.max(minInterval, config.baseSpawnInterval - waveIndex * intervalDecay);

  const spawns: SpawnRequest[] = [];
  const blueprints = config.enemyBlueprints.length > 0 ? config.enemyBlueprints : ["enemy"];

  let currentDelay = 0;
  for (let i = 0; i < count; i++) {
    // Deterministic selection of enemy blueprint across candidate pool
    const blueprintId = blueprints[i % blueprints.length];

    spawns.push({
      blueprintId,
      args: { waveIndex, spawnIndex: i },
      delay: currentDelay,
    });

    currentDelay += spawnInterval;
  }

  return {
    id: waveId,
    isBossWave: false,
    cooldown,
    spawns,
  };
}
