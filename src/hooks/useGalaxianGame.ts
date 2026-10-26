import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import type { Theme } from "@tiny-aster/core";
import { useHighScore } from "./useHighScore";
import { GalaxianGame, GalaxianStateComponent, GalaxianInputState } from "../games/galaxian";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";

const INITIAL_GALAXIAN_STATE: GalaxianStateComponent = {
  type: "GameState",
  lives: 3,
  score: 0,
  level: 1,
  enemiesRemaining: 0,
  isGameOver: false,
  highScore: 0,
  screenShake: null,
  diveTimer: 2.2,
  activeDivesCount: 0,
  waveTransitionRemaining: 0,
};

/**
 * Custom hook to manage the lifecycle of the Galaxian game engine.
 */
export function useGalaxianGame(started: boolean, isMultiplayer: boolean = false, seed?: number, theme?: Theme) {
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then((enabled) => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("galaxian"));
      }
    });
  }, []);

  const gameOptions = useMemo(() => ({ activeMutators }), [activeMutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<GalaxianGame, GalaxianStateComponent, GalaxianInputState>(
      started ? GalaxianGame : null,
      isMultiplayer,
      { theme, gameOptions, initialState: INITIAL_GALAXIAN_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("galaxian-high-score");

  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_GALAXIAN_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart,
  };
}
