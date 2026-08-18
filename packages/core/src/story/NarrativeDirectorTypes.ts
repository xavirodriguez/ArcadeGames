import { StoryRuntimeSnapshot } from "./ArcadeIntegrationTypes";

/**
 * High frequency telemetry event payload (e.g. shield, speed, score, distance).
 *
 * @public
 */
export interface TelemetryEvent {
  readonly timestamp: number;
  readonly type: string;
  readonly value: number;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Significant gameplay event emitted during arcade simulation.
 *
 * @public
 */
export interface GameplayEvent {
  readonly id: string;
  readonly name: string;
  readonly timestamp: number;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * Narrative cue types dispatched for UI rendering or audio playback.
 *
 * @public
 */
export type NarrativeCueType =
  | "radio"
  | "warning"
  | "glitch"
  | "music"
  | "objective_highlight"
  | "hud_distortion";

/**
 * Interrupt behavior policy for narrative cues.
 *
 * @public
 */
export type CueInterruptPolicy = "queue" | "interrupt" | "ignore";

/**
 * Decoupled narrative cue descriptor returned by MidGameNarrativeDirector.
 *
 * @public
 */
export interface NarrativeCue {
  readonly id: string;
  readonly type: NarrativeCueType;
  readonly priority: number;
  readonly titleKey?: string;
  readonly messageKey?: string;
  readonly rawText?: string;
  readonly durationMs?: number;
  readonly audioCueId?: string;
  readonly interruptPolicy?: CueInterruptPolicy;
  readonly pauseSimulation?: boolean;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * Declarative rule consumed by MidGameNarrativeDirector.
 *
 * @public
 */
export interface MidGameDirectorRule {
  readonly id: string;
  readonly eventName: string;
  readonly condition?: (event: GameplayEvent, snapshot: StoryRuntimeSnapshot) => boolean;
  readonly cue: NarrativeCue;
  readonly cooldownMs?: number;
  readonly once?: boolean;
  readonly maxTriggersPerRun?: number;
}
