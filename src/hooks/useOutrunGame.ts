import { useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { OutrunGame } from "../games/outrun";
import type { RaceStateComponent, OutrunInput } from "../games/outrun";
import { DEFAULT_OUTRUN_CONFIG } from "../games/outrun/types/OutrunConfigSchema";

const INITIAL_STATE: RaceStateComponent = {
  type: "RaceState",
  playerZ: 0,
  playerX: 0,
  speed: 0,
  lapTime: 0,
  isGameOver: false,
  position: 1,
  currentSegment: 0,
  racePhase: "countdown",
  countdownTime: DEFAULT_OUTRUN_CONFIG.countdownDurationSeconds,
  timeLeft: DEFAULT_OUTRUN_CONFIG.raceTimeLimitSeconds,
  checkpointsPassed: 0,
  checkpointsTotal: 3
};

export function useOutrunGame(started: boolean, seed?: number) {
  const [activeMutators] = useState<readonly never[]>([]);
  const options = useMemo(
    () => ({ activeMutators, startCountdown: true }),
    [activeMutators]
  );
  const { game, gameState, handleInput, isPaused, isReady, togglePause, restart } =
    useGame<OutrunGame, RaceStateComponent, OutrunInput>(
      started ? OutrunGame : null,
      false,
      { gameOptions: options, initialState: INITIAL_STATE, seed }
    );

  return {
    game,
    gameState: gameState ?? INITIAL_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    seed: game?.getSeed?.(),
    restartWithSeed: restart
  };
}
