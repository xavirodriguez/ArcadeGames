import { useEffect, useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { TowerDefenseGame } from "../games/tower-defense/TowerDefenseGame";
import type { GameStateComponent, InputState } from "../games/tower-defense/types/TowerDefenseTypes";
import { ExpoAssetProvider } from "../providers/ExpoAssetProvider";

const expoAssetProvider = new ExpoAssetProvider();

export const useTowerDefenseGame = (started: boolean, seed?: number) => {
  const gameOptions = useMemo(() => ({ seed }), [seed]);

  const { game, gameState, handleInput, isPaused, isReady, togglePause, restart } =
    useGame<TowerDefenseGame, GameStateComponent, InputState>(
      started ? TowerDefenseGame : null,
      false,
      {
        gameOptions,
        seed,
        assetProvider: expoAssetProvider,
      }
    );

  const { highScore, updateHighScore } = useHighScore("tower-defense-high-score");

  useEffect(() => {
    if (gameState?.phase === "game_over" && gameState.score !== undefined) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.phase, gameState?.score, updateHighScore]);

  return {
    game,
    gameState,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed?.(),
    restartWithSeed: restart,
  };
};
