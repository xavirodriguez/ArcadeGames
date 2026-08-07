import { useEffect, useState, useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { GeometryWarsGame } from "../games/geometrywars/GeometryWarsGame";

const INITIAL_STATE = {
  type: "GeometryWarsState",
  score: 0,
  lives: 3,
  bombs: 3,
  wave: 1,
  isGameOver: false,
  gameTime: 0,
  combo: 0,
  multiplier: 1,
  comboTimerRemaining: 0
};

/**
 * Custom hook to manage the lifecycle, state, and high scores of the Geometry Wars game.
 */
export function useGeometryWarsGame(started: boolean, isMultiplayer: boolean = false, seed?: number) {
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<GeometryWarsGame, any, any>(
      started ? GeometryWarsGame : null,
      isMultiplayer,
      {
        initialState: INITIAL_STATE,
        seed
      }
    );

  const { highScore, updateHighScore } = useHighScore("geometrywars-high-score");

  // Update high score when game is over
  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

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
