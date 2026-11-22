/**
 * Regression guard for the Hit & Run wave spawn timeline reachability.
 *
 * Context (execution evidence, 2026-11-22): the Playwright scenario
 * "keeps spawned enemies combat-capable after the wave spawn timeline
 * completes" failed on every CI run of `master` with
 * `spawnComplete: false` after 22 s of polling.
 *
 * Root cause: the section-0 wave script (`wave_goblins_s0`) ends at
 * t = 11.5 s of simulation time, but a player that does not move is defeated
 * by the first packs at ~6.7 s. The death flow then asks the UI for a
 * restart, the UI recreates the World and the wave director restarts from
 * `elapsed = 0`, so the spawn timeline can never be observed as complete.
 *
 * These tests pin that premise at the ECS level: a stationary player cannot
 * reach the end of the timeline, and the timeline does complete while the
 * player keeps distance from the wave with the real input bridge.
 */
import { HitAndRunGame } from "../HitAndRunGame";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE,
  type WaveDirectorState,
  type WaveScript
} from "../waves/HitRunWaveTypes";
import { DEATH_FLOW_RESOURCE, type HitRunDeathFlowState } from "../systems/HitRunDeathFlowSystem";

const DT = 1 / 60;

interface WaveTimelineSnapshot {
  scriptId: string | null;
  elapsed: number;
  nextEventIndex: number;
  eventCount: number;
  totalSpawned: number;
  expectedSpawnCount: number;
  active: boolean;
}

function readTimeline(game: HitAndRunGame): WaveTimelineSnapshot {
  const world = game.getWorld();
  const director = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  const script = world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
  const expectedSpawnCount =
    script?.events.reduce((total, event) => total + Math.max(1, event.count ?? 1), 0) ?? 0;
  return {
    scriptId: director?.scriptId ?? null,
    elapsed: director?.elapsed ?? 0,
    nextEventIndex: director?.nextEventIndex ?? 0,
    eventCount: script?.events.length ?? 0,
    totalSpawned: director?.totalSpawned ?? 0,
    expectedSpawnCount,
    active: director?.active ?? false
  };
}

function readPlayerHealth(game: HitAndRunGame): number | null {
  const world = game.getWorld();
  const players = world.query("BeltInput", "Health");
  if (players.length === 0) return null;
  const health = world.getComponent(players[0], "Health") as
    | { current?: number }
    | undefined;
  return health?.current ?? null;
}

function readDeathFlowActive(game: HitAndRunGame): boolean {
  const flow = game.getWorld().getResource<HitRunDeathFlowState>(DEATH_FLOW_RESOURCE);
  return flow?.active === true;
}

function readDeaths(game: HitAndRunGame): number {
  const runState = game.getWorld().getResource<{ deaths?: number }>("RunState");
  return runState?.deaths ?? 0;
}

async function simulate(options: {
  moveLeft: boolean;
  seconds: number;
}): Promise<HitAndRunGame> {
  const game = new HitAndRunGame({ seed: 20261106 });
  await game.init();
  const steps = Math.round(options.seconds / DT);
  for (let i = 0; i < steps; i++) {
    if (options.moveLeft) {
      game.setInputState({ moveLeft: true });
    }
    game.update(DT);
  }
  return game;
}

describe("Hit & Run wave spawn timeline reachability", () => {
  it("cannot reach the end of the section-0 timeline while the player stands still", async () => {
    const game = await simulate({ moveLeft: false, seconds: 12 });
    const timeline = readTimeline(game);

    expect(timeline.scriptId).toBe("wave_goblins_s0");
    expect(timeline.eventCount).toBe(4);
    // The player is defeated before the last scheduled event (t = 11.5 s).
    expect(readDeaths(game)).toBe(1);
    expect(readPlayerHealth(game)).toBe(0);
    expect(timeline.nextEventIndex).toBeLessThan(timeline.eventCount);
    expect(timeline.elapsed).toBeLessThan(11.5);

    game.destroy();
  }, 120000);

  it("completes the section-0 timeline while the player keeps distance from the wave", async () => {
    const game = await simulate({ moveLeft: true, seconds: 13 });
    const timeline = readTimeline(game);

    expect(timeline.scriptId).toBe("wave_goblins_s0");
    expect(readDeaths(game)).toBe(0);
    expect(readDeathFlowActive(game)).toBe(false);
    expect(readPlayerHealth(game)).toBeGreaterThan(0);
    expect(timeline.nextEventIndex).toBe(timeline.eventCount);
    expect(timeline.totalSpawned).toBe(timeline.expectedSpawnCount);
    expect(timeline.elapsed).toBeGreaterThanOrEqual(11.5);

    game.destroy();
  }, 120000);
});
