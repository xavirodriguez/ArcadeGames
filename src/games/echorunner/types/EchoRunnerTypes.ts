import { Component, CoreEvents } from "@tiny-aster/core";

export interface EchoRunnerEventRegistry extends CoreEvents, Record<string, unknown> {}

export interface EchoRunnerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  pulse: boolean; // Attack verb
  [key: string]: unknown;
}

export interface EchoRunnerGameState extends Component {
  type: "EchoRunnerGameState";
  score: number;
  isGameOver: boolean;
  attempts: number;
  deaths: number;
  fragments: number;
  cores: number;
  activeCheckpoint: string | null;
  elapsedTime: number;
}

import { DEFAULT_ECHO_RUNNER_CONFIG } from "./EchoRunnerConfigSchema";

export const ECHO_CONFIG = DEFAULT_ECHO_RUNNER_CONFIG;
