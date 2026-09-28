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
  /** Unique identifier for the narrative cue. */
  readonly id: string;
  /** Categorical type of cue influencing UI rendering or audio dispatch. */
  readonly type: NarrativeCueType;
  /** Numeric priority level used for cue queue ordering (higher values take precedence). */
  readonly priority: number;
  /** Localization key for the cue title. */
  readonly titleKey?: string;
  /** Localization key for the cue body message. */
  readonly messageKey?: string;
  /** Unlocalized fallback raw text content. */
  readonly rawText?: string;
  /** Display lifetime duration in milliseconds. */
  readonly durationMs?: number;
  /** Sound effect or voiceover track identifier associated with this cue. */
  readonly audioCueId?: string;
  /** Policy governing how this cue handles active or queued notifications. */
  readonly interruptPolicy?: CueInterruptPolicy;
  /** Whether active gameplay simulation pauses while this cue displays. */
  readonly pauseSimulation?: boolean;
  /** Additional custom metadata payload attached to the cue. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * Declarative rule consumed by MidGameNarrativeDirector.
 *
 * @public
 */
export interface MidGameDirectorRule {
  /** Unique identifier for the director rule. */
  readonly id: string;
  /** Name of the triggering gameplay or telemetry event. */
  readonly eventName: string;
  /** Evaluator predicate testing whether the rule conditions pass. */
  readonly condition?: (event: GameplayEvent, snapshot: StoryRuntimeSnapshot) => boolean;
  /** Narrative cue template to dispatch when triggered. */
  readonly cue: NarrativeCue;
  /** Minimum delay in milliseconds required between consecutive triggers of this rule. */
  readonly cooldownMs?: number;
  /** Whether this rule triggers at most once per campaign session. */
  readonly once?: boolean;
  /** Maximum total trigger count allowed per run. */
  readonly maxTriggersPerRun?: number;
}
