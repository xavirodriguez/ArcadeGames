import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { FroggerGame, FroggerState, FroggerInput } from "../games/frogger";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";

const INITIAL_FROGGER_STATE: FroggerState = {
  score: 0,
  lives: 3,
  level: 1,
  isGameOver: false,
  isWin: false,
  occupiedLilyPads: 0,
  totalLilyPads: 5,
};

/**
 * Custom hook to manage the lifecycle of the Frogger game engine.
 */
export function useFroggerGame(started: boolean, isMultiplayer: boolean = false, seed?: number) {
  const [activeMutators, setActiveMutators] = useState<Mutator[] | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const enabled = await MutatorService.isMutatorModeEnabled();
      const loaded = enabled ? MutatorService.getActiveMutatorsForGame("frogger") : [];
      setActiveMutators(loaded);
    }
    loadOptions();
  }, []);

  const memoizedGameOptions = useMemo(() => ({
    activeMutators: activeMutators || [],
  }), [activeMutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<FroggerGame, FroggerState, FroggerInput>(
      started && activeMutators !== null ? FroggerGame : null,
      isMultiplayer,
      { gameOptions: memoizedGameOptions, initialState: INITIAL_FROGGER_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("frogger-high-score");

  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_FROGGER_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart,
  };
}
