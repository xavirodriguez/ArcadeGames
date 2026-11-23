import type { ShmupEnemyArchetype } from "./types/ShmupTypes";
import { isShmupBossWave } from "./boss/bossWaves";

/**
 * Chooses a visual identity from wave and spawn slot, never from movement or bullet pattern.
 * The function is pure so a replay with the same wave/spawn order remains deterministic.
 */
const STANDARD_ARCHETYPES: readonly ShmupEnemyArchetype[] = [
  "scout",
  "interceptor",
  "armored",
  "support",
  "scout",
  "interceptor",
];

export function selectShmupEnemyArchetype(wave: number, spawnIndex: number): ShmupEnemyArchetype {
  const safeWave = Math.max(1, Math.floor(wave));
  const safeIndex = Math.max(0, Math.floor(spawnIndex));

  // Same predicate as the spawn director: no boss visuals on non-boss waves.
  if (isShmupBossWave(safeWave) && safeIndex === 0) {
    return "boss";
  }

  const index = (safeWave - 1 + safeIndex) % STANDARD_ARCHETYPES.length;
  return STANDARD_ARCHETYPES[index] ?? "scout";
}
