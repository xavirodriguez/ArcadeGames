import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunWaveSystem, startWaveScript } from "../waves/HitRunWaveSystem";
import {
  ENEMY_POOL_RESOURCE,
  WAVE_DIRECTOR_RESOURCE,
  type HitRunEnemySpawnParams,
  type IHitRunEnemyPool,
  type WaveDirectorState,
  type WaveScript
} from "../waves/HitRunWaveTypes";

interface WaveReplay {
  spawns: HitRunEnemySpawnParams[];
  state: {
    scriptId: string;
    active: boolean;
    nextEventIndex: number;
    totalSpawned: number;
    pendingStaggers: Array<{
      eventIndex: number;
      remaining: number;
      nextSpawnAt: number;
      spawned: number;
    }>;
    elapsed: number;
  };
}

const SCRIPT: WaveScript = {
  id: "deterministic-replay",
  events: [
    {
      t: 0,
      type: "popcorn",
      count: 5,
      formation: "scatter",
      spacing: 36,
      x: 220,
      y: 400,
      tags: ["first-pack"]
    },
    {
      t: 0.5,
      type: "charger",
      count: 3,
      formation: "column",
      spacing: 32,
      interval: 0.1,
      x: 360,
      y: 420,
      tags: ["staggered-pack"]
    }
  ]
};

function replayWave(deltaTime: number, frames: number): WaveReplay {
  const world = new World<CoreComponentRegistry>();
  const spawns: HitRunEnemySpawnParams[] = [];

  const pool: IHitRunEnemyPool = {
    acquireEnemy(_world: unknown, params: HitRunEnemySpawnParams): number {
      spawns.push({
        ...params,
        tags: params.tags ? [...params.tags] : undefined
      });
      return spawns.length;
    }
  };

  world.setResource(ENEMY_POOL_RESOURCE, pool);
  startWaveScript(world, {
    ...SCRIPT,
    events: SCRIPT.events.map((event) => ({ ...event, tags: event.tags ? [...event.tags] : undefined }))
  });

  const system = new HitRunWaveSystem();
  for (let frame = 0; frame < frames; frame++) {
    system.update(world, deltaTime);
  }

  const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  if (!state) throw new Error("Wave director state was not initialized.");

  return {
    spawns,
    state: {
      scriptId: state.scriptId,
      active: state.active,
      nextEventIndex: state.nextEventIndex,
      totalSpawned: state.totalSpawned,
      pendingStaggers: state.pendingStaggers.map((pending) => ({
        eventIndex: pending.eventIndex,
        remaining: pending.remaining,
        nextSpawnAt: pending.nextSpawnAt,
        spawned: pending.spawned
      })),
      elapsed: state.elapsed
    }
  };
}

describe("Hit & Run deterministic wave replay", () => {
  it("produces the same spawn stream at 30 Hz and 60 Hz for equal simulation time", () => {
    const at60Hz = replayWave(1 / 60, 120);
    const at30Hz = replayWave(1 / 30, 60);

    expect(at60Hz.spawns).toEqual(at30Hz.spawns);
    expect(at60Hz.state.scriptId).toBe(at30Hz.state.scriptId);
    expect(at60Hz.state.active).toBe(at30Hz.state.active);
    expect(at60Hz.state.nextEventIndex).toBe(2);
    expect(at30Hz.state.nextEventIndex).toBe(2);
    expect(at60Hz.state.totalSpawned).toBe(8);
    expect(at30Hz.state.totalSpawned).toBe(8);
    expect(at60Hz.state.pendingStaggers).toEqual([]);
    expect(at30Hz.state.pendingStaggers).toEqual([]);
    expect(at60Hz.state.elapsed).toBeCloseTo(at30Hz.state.elapsed, 8);
  });
});
