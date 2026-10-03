import { Component, CoreEvents } from "@tiny-aster/core";
import { DEFAULT_HIT_AND_RUN_CONFIG } from "./HitAndRunConfigSchema";

export interface HitAndRunEventRegistry extends CoreEvents, Record<string, unknown> {}

/**
 * Input schema — run-and-gun aim like Contra:
 * - moveLeft/Right face + horizontal aim
 * - aimUp / aimDown for vertical & diagonals (NOT jump)
 * - jump is Space / W only
 */
export interface HitAndRunInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  /** Melee / pulse attack */
  pulse: boolean;
  /** Hold-to-fire ranged weapon (HMG) */
  attack: boolean;
  /** Aim straight up / combine with move for 45° */
  aimUp?: boolean;
  /** Aim straight down / combine with move for 45° */
  aimDown?: boolean;
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
  waveId?: string;
  waveElapsed?: number;
  enemiesSpawned?: number;
  weaponId?: string;
  health?: number;
  maxHealth?: number;
}

export const HIT_CONFIG = DEFAULT_HIT_AND_RUN_CONFIG;
