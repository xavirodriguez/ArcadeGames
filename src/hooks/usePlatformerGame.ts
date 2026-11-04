import { useEffect } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { PlatformerGame, PlatformerGameState, PlatformerInput } from "../games/platformer";

const INITIAL_PLATFORMER_STATE: PlatformerGameState = {
  type: "PlatformerGameState",
  score: 0,
  lives: 3,
  attempts: 1,
  isGameOver: false
};

const EMPTY_GAME_OPTIONS = {};

export type PlatformerLevelSet = "classic" | "locomotion";

export function usePlatformerGame(started: boolean, seed?: number, levelSet: PlatformerLevelSet = "classic") {
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<PlatformerGame, PlatformerGameState, PlatformerInput>(
      started ? PlatformerGame : null,
      false,
      { gameOptions: { ...EMPTY_GAME_OPTIONS, levelSet }, initialState: INITIAL_PLATFORMER_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("platformer-high-score");

  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_PLATFORMER_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}
