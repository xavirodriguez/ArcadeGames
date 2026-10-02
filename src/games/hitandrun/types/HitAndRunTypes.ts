import { Component, CoreEvents } from "@tiny-aster/core";

export interface HitAndRunEventRegistry extends CoreEvents, Record<string, unknown> {}

export interface HitAndRunInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  pulse: boolean; // Attack verb
  [key: string]: unknown;
}

export interface HitAndRunGameState extends Component {
  type: "HitAndRunGameState";
  score: number;
  isGameOver: boolean;
  attempts: number;
  deaths: number;
  fragments: number;
  cores: number;
  activeCheckpoint: string | null;
  elapsedTime: number;
}

import { DEFAULT_HIT_AND_RUN_CONFIG } from "./HitAndRunConfigSchema";

export const HIT_CONFIG = DEFAULT_HIT_AND_RUN_CONFIG;
