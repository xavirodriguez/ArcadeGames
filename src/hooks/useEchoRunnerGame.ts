import { useEffect, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { EchoRunnerGame, EchoRunnerGameState, EchoRunnerInput } from "../games/echorunner";

const INITIAL_ECHO_STATE: EchoRunnerGameState = {
  type: "EchoRunnerGameState",
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

export function useEchoRunnerGame(started: boolean, seed?: number) {
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<EchoRunnerGame, EchoRunnerGameState, EchoRunnerInput>(
      started ? EchoRunnerGame : null,
      false,
      { gameOptions: EMPTY_GAME_OPTIONS, initialState: INITIAL_ECHO_STATE, seed }
    );

  const { highScore, updateHighScore } = useHighScore("echorunner-high-score");

  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_ECHO_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}
