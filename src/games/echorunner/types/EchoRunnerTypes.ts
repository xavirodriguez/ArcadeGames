import { Component, CoreEvents } from "@tiny-aster/core";
import type { CollectibleKind } from "../../shared/componentBuilders";

export interface EchoRunnerEventRegistry extends CoreEvents, Record<string, unknown> {}

export type EchoRunnerCollectibleKind = CollectibleKind;

export interface EchoRunnerCollectibleProgress {
  kindsById: Record<string, EchoRunnerCollectibleKind>;
  valuesById: Record<string, number>;
}

export function toEchoRunnerCollectibleKind(value: string | undefined): EchoRunnerCollectibleKind | null {
  switch (value) {
    case "fragment":
    case "core":
    case "coin":
      return value;
    default:
      return null;
  }
}

export interface EchoRunnerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  pulse: boolean; // Attack verb
  [key: string]: unknown;
}

export interface EchoRunnerInputComponent extends Component {
  type: "EchoRunnerInput";
  pulsePressed: boolean;
  pulseCooldown: number;
}

export interface EchoRunnerGameState extends Component {
  type: "EchoRunnerGameState";
  score: number;
  isGameOver: boolean;
  attempts: number;
  deaths: number;
  fragments: number;
  coins: number;
  cores: number;
  activeCheckpoint: string | null;
  elapsedTime: number;
}

import { DEFAULT_ECHO_RUNNER_CONFIG } from "./EchoRunnerConfigSchema";

export const ECHO_CONFIG = DEFAULT_ECHO_RUNNER_CONFIG;
