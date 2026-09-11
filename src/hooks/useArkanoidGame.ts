import { useEffect, useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { ArkanoidGame } from "../games/arkanoid/ArkanoidGame";
import type { ArkanoidStateComponent, ArkanoidInput } from "../games/arkanoid/types/ArkanoidTypes";
import { ExpoAssetProvider } from "../providers/ExpoAssetProvider";

const expoAssetProvider = new ExpoAssetProvider();

export const useArkanoidGame = (started: boolean, seed?: number) => {
  const gameOptions = useMemo(
    () => ({ seed }),
    [seed]
  );

  const { game, gameState, handleInput, isPaused, isReady, togglePause, restart } =
    useGame<ArkanoidGame, ArkanoidStateComponent, ArkanoidInput>(
      started ? ArkanoidGame : null,
      false,
      {
        gameOptions,
        seed,
        assetProvider: expoAssetProvider
      }
    );

  const { highScore, updateHighScore } = useHighScore();

  useEffect(() => {
    if (gameState?.isGameOver && gameState.score !== undefined) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
};
