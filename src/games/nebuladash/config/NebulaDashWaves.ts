import { World } from "@tiny-aster/core";
import { WaveDefinition } from "../../shared/spawn/components/SpawnComponents";

/**
 * Generates deterministic vertical wave definitions for Nebula Dash.
 * Uses world.gameplayRandom exclusively to generate barrier and floating asteroid patterns.
 */
export function generateNebulaDashWaves(world: World<any>): WaveDefinition[] {
  const rng = world.gameplayRandom;
  const wasLocked = rng.isLocked();
  if (wasLocked) rng.unlock();

  const waves: WaveDefinition[] = [];

  try {
    for (let waveIndex = 0; waveIndex < 5; waveIndex++) {
      const spawns = [];
      const barrierCount = 3 + waveIndex;

      for (let i = 0; i < barrierCount; i++) {
        const gapX = 150 + Math.floor(rng.next() * 500);
        const yPos = 400 - (i * 250);
        const delay = i * 2.0;

        // Alternate or mix obstacle gaps and floating asteroids
        spawns.push({
          blueprintId: "obstacle_gap",
          args: { x: gapX, y: yPos, gapWidth: Math.max(80, 140 - waveIndex * 10) },
          delay
        });

        if (rng.next() > 0.4) {
          const astX = 100 + Math.floor(rng.next() * 600);
          const vx = (rng.next() - 0.5) * 80;
          spawns.push({
            blueprintId: "floating_asteroid",
            args: { x: astX, y: yPos - 100, vx, vy: 20 },
            delay: delay + 0.5
          });
        }
      }

      waves.push({
        id: `nebula_wave_${waveIndex + 1}`,
        spawns,
        cooldown: 3.0
      });
    }
  } finally {
    if (wasLocked) rng.lock();
  }

  return waves;
}
