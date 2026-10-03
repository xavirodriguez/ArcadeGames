import { Component, CoreEvents } from "@tiny-aster/core";

export interface HitAndRunEventRegistry extends CoreEvents, Record<string, unknown> {}

/**
 * Action map for the fantasy belt-scroll control scheme.
 * Bridged into BeltInput via mutateBeltInputState / setInputState.
 */
export interface HitAndRunInput {
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  jump?: boolean;
  attack?: boolean;
  fire?: boolean;
  special?: boolean;
  moveLeft?: boolean;
  moveRight?: boolean;
  pulse?: boolean;
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
