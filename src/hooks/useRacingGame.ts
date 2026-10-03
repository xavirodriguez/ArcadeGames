import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { RacingGame, RacingGameState, RacingInputState } from "../games/racing";

const INITIAL_STATE: RacingGameState = {
  type: "RacingState",
  phase: "countdown",
  countdownRemaining: 3,
  currentLap: 1,
  totalLaps: 3,
  lastLapTime: 0,
  bestLapTime: null,
  raceTime: 0,
  isGameOver: false,
  position: 1
};

export function useRacingGame(started: boolean, seed?: number) {
  const [activeMutators] = useState<readonly never[]>([]);
  const options = useMemo(() => ({ activeMutators }), [activeMutators]);
  const { game, gameState, handleInput, isPaused, isReady, togglePause, restart } =
    useGame<RacingGame, RacingGameState, RacingInputState>(
      started ? RacingGame : null,
      false,
      { gameOptions: options, initialState: INITIAL_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("racing-high-score");
  useEffect(() => {
    if (gameState?.isGameOver) updateHighScore(Math.round(gameState.raceTime * 1000) * -1);
  }, [gameState?.isGameOver, gameState?.raceTime, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}
