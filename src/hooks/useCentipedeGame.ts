import { useEffect, useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import type { Theme } from "@tiny-aster/core";
import { useHighScore } from "./useHighScore";
import { CentipedeGame, CentipedeStateComponent, CentipedeInput, DEFAULT_CENTIPEDE_CONFIG } from "../games/centipede";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";

const INITIAL_CENTIPEDE_STATE: CentipedeStateComponent = {
  type: "CentipedeState",
  score: 0,
  lives: DEFAULT_CENTIPEDE_CONFIG.PLAYER_INITIAL_LIVES,
  level: 1,
  status: "playing",
  mushroomsRemaining: 0,
  respawnTimerMs: 0,
};

/**
 * Custom hook to manage the lifecycle of the Centipede game engine.
 */
export function useCentipedeGame(started: boolean, isMultiplayer: boolean = false, seed?: number, theme?: Theme) {
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then((enabled) => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("centipede"));
      }
    });
  }, []);

  const gameOptions = useMemo(() => ({ activeMutators }), [activeMutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<CentipedeGame, CentipedeStateComponent, CentipedeInput>(
      started ? CentipedeGame : null,
      isMultiplayer,
      { theme, gameOptions, initialState: INITIAL_CENTIPEDE_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("centipede-high-score");

  useEffect(() => {
    if (gameState?.status === "game_over") {
      updateHighScore(gameState.score);
    }
  }, [gameState?.status, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_CENTIPEDE_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart,
  };
}
