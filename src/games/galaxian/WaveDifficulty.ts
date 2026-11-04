import type { GalaxianConfig } from "./types/GalaxianConfigSchema";

function getWaveIndex(level: number): number {
  return Number.isFinite(level) ? Math.max(0, Math.floor(level) - 1) : 0;
}

/** Returns the bounded speed factor applied to scripted enemy dive paths. */
export function getWaveDiveSpeedMultiplier(config: GalaxianConfig, level: number): number {
  const multiplier = Math.pow(config.wave.speedMultiplierPerWave, getWaveIndex(level));
  return Math.min(config.wave.maxDiveSpeedMultiplier, multiplier);
}

/** Returns the next dive interval in seconds, with a configured lower bound. */
export function getWaveDiveIntervalSeconds(config: GalaxianConfig, level: number): number {
  const scaledIntervalMs =
    config.dive.intervalMs * Math.pow(config.wave.diveIntervalMultiplierPerWave, getWaveIndex(level));
  return Math.max(config.wave.minimumDiveIntervalMs, scaledIntervalMs) / 1000;
}

/** Returns the number of simultaneous dives, always allowing at least one attacker. */
export function getWaveMaxConcurrentDives(config: GalaxianConfig, level: number): number {
  const scaledConcurrentDives = Math.floor(
    config.dive.maxConcurrentDives * Math.pow(config.wave.speedMultiplierPerWave, getWaveIndex(level))
  );
  return Math.max(1, Math.min(config.wave.maxConcurrentDivesCap, scaledConcurrentDives));
}
