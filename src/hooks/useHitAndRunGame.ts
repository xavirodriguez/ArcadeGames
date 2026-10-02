import { useEffect, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { HitAndRunGame, HitAndRunGameState, HitAndRunInput } from "../games/hitandrun";

const INITIAL_HIT_STATE: HitAndRunGameState = {
  type: "HitAndRunGameState",
  score: 0,
  isGameOver: false,
  attempts: 1,
  deaths: 0,
  fragments: 0,
  cores: 0,
  activeCheckpoint: null,
  elapsedTime: 0
};

const EMPTY_GAME_OPTIONS = {};

export function useHitAndRunGame(started: boolean, seed?: number) {
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<HitAndRunGame, HitAndRunGameState, HitAndRunInput>(
      started ? HitAndRunGame : null,
      false,
      { gameOptions: EMPTY_GAME_OPTIONS, initialState: INITIAL_HIT_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("hitandrun-high-score");

  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_HIT_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}
