/**
 * Read-mostly E2E control surface for Out Run.
 *
 * The API is installed on `window.__outrunDebug` by the Out Run screen only when
 * `EXPO_PUBLIC_E2E_HOOKS === "true"`. It never touches gameplay rules: it only
 * writes into the existing ECS singletons (`RaceState`) so a browser test can
 * park the camera on a deterministic track position and freeze the simulation.
 *
 * Contract notes:
 * - `pause()` delegates to `BaseGame.pause()`, which sets the `IsPaused` world
 *   resource. Every Out Run gameplay system resolves its context through
 *   `resolveOutrunSystemContext`, which bails out while paused, so the
 *   simulation freezes while the presentation systems keep rendering.
 * - `setPlayerZ` / `setPlayerX` / `setSpeed` write the camera state directly so
 *   the captured frame does not depend on wall-clock timing.
 */

import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";
import { findSegmentIndexAtZ } from "../systems/TrafficSteering";

/** One entry of the generated track, used by browser tests to pick capture points. */
export interface OutrunE2EDebugTrackEntry {
  index: number;
  /** World-space Z of the segment start. */
  z: number;
  length: number;
  curve: number;
  hill: number;
  scenarioId: string | null;
}

/** Snapshot of the simulation state exposed to browser tests. */
export interface OutrunE2EDebugState {
  seed: number | null;
  playerZ: number;
  playerX: number;
  speed: number;
  lapTime: number;
  racePhase: string;
  isGameOver: boolean;
  trackLength: number;
  segmentCount: number;
  currentSegment: number;
  currentScenarioId: string | null;
  isPaused: boolean;
}

/** Control surface installed on `window.__outrunDebug`. */
export interface OutrunE2EDebugApi {
  /** Requests a deterministic seed; the host rebuilds the game with it. */
  setSeed: (seed: number) => void;
  setPlayerZ: (z: number) => void;
  setPlayerX: (x: number) => void;
  setSpeed: (speed: number) => void;
  setRacePhase: (phase: "countdown" | "racing" | "finished") => void;
  pause: () => void;
  resume: () => void;
  getState: () => OutrunE2EDebugState;
  getTrackProfile: () => OutrunE2EDebugTrackEntry[];
}

/** Minimal surface the debug API needs from the running game. */
export interface OutrunE2EDebugGame {
  getWorld: () => {
    getSingleton: (type: "RaceState") => RaceStateComponent | undefined;
    mutateSingleton: (type: "RaceState", mutate: (state: RaceStateComponent) => void) => void;
    getResource: <T>(key: string) => T | undefined;
  };
  getSeed: () => number;
  pause: () => void;
  resume: () => void;
  isPausedState: () => boolean;
}

export interface OutrunE2EDebugActions {
  /** Rebuilds the game with the requested deterministic seed. */
  setSeed: (seed: number) => void;
}

function readRoadData(game: OutrunE2EDebugGame): RoadData | undefined {
  return game.getWorld().getResource<RoadData>("RoadData");
}

/**
 * Builds the E2E control surface for a live game instance.
 *
 * @param game - Live game instance (usually `OutrunGame`).
 * @param actions - Host callbacks that cannot be expressed through the world.
 */
export function createOutrunE2EDebugApi(
  game: OutrunE2EDebugGame,
  actions: OutrunE2EDebugActions
): OutrunE2EDebugApi {
  const world = game.getWorld();

  const mutateState = (mutate: (state: RaceStateComponent) => void): void => {
    world.mutateSingleton("RaceState", mutate);
  };

  const setPlayerZ = (z: number): void => {
    const roadData = readRoadData(game);
    mutateState((state) => {
      state.playerZ = z;
      if (roadData && roadData.trackLength > 0) {
        state.currentSegment = findSegmentIndexAtZ(
          roadData.segments,
          z,
          roadData.trackLength
        );
      }
    });
  };

  const getState = (): OutrunE2EDebugState => {
    const state = world.getSingleton("RaceState");
    const roadData = readRoadData(game);
    const segmentIndex = state?.currentSegment ?? 0;
    const currentSegment = roadData?.segments[segmentIndex];
    return {
      seed: game.getSeed(),
      playerZ: state?.playerZ ?? 0,
      playerX: state?.playerX ?? 0,
      speed: state?.speed ?? 0,
      lapTime: state?.lapTime ?? 0,
      racePhase: state?.racePhase ?? "racing",
      isGameOver: state?.isGameOver ?? false,
      trackLength: roadData?.trackLength ?? 0,
      segmentCount: roadData?.segments.length ?? 0,
      currentSegment: segmentIndex,
      currentScenarioId: currentSegment?.scenarioId ?? null,
      isPaused: game.isPausedState()
    };
  };

  const getTrackProfile = (): OutrunE2EDebugTrackEntry[] => {
    const roadData = readRoadData(game);
    if (!roadData) return [];
    const entries: OutrunE2EDebugTrackEntry[] = [];
    let z = 0;
    for (const segment of roadData.segments) {
      entries.push({
        index: segment.index,
        z,
        length: segment.length,
        curve: segment.curve,
        hill: segment.hill,
        scenarioId: segment.scenarioId ?? null
      });
      z += segment.length;
    }
    return entries;
  };

  return {
    setSeed: (seed: number) => actions.setSeed(seed),
    setPlayerZ,
    setPlayerX: (x: number) => mutateState((state) => { state.playerX = x; }),
    setSpeed: (speed: number) => mutateState((state) => { state.speed = speed; }),
    setRacePhase: (phase) => mutateState((state) => {
      state.racePhase = phase;
      if (phase !== "countdown") state.countdownTime = 0;
    }),
    pause: () => game.pause(),
    resume: () => game.resume(),
    getState,
    getTrackProfile
  };
}
