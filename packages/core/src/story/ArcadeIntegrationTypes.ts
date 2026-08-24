import { StoryEffect, StoryObjective } from "./StoryTypes";
import { GameId } from "../runtime/GameDefinition";

/**
 * Identifier for minigame types registered in the system (e.g. "asteroids", "space-invaders").
 *
 * @public
 */
export type MiniGameId = GameId | string;

/**
 * Difficulty level setting for minigame execution.
 *
 * @public
 */
export type MiniGameDifficulty = "easy" | "normal" | "hard" | "nightmare" | string;

/**
 * General configuration map passed into a minigame instance.
 *
 * @public
 */
export interface MiniGameConfig {
  /** Target difficulty level setting for the minigame session. */
  readonly difficulty?: MiniGameDifficulty;
  /** Optional time limit in milliseconds for completing the minigame session. */
  readonly timeLimitMs?: number;
  /** Optional target score required to pass or achieve success in the minigame. */
  readonly targetScore?: number;
  /** Key-value map of custom settings passed into the minigame. */
  readonly customSettings?: Readonly<Record<string, number | string | boolean>>;
}

/**
 * Domain-specific modifier applied to a minigame session.
 *
 * @remarks
 * Minigames consume domain modifiers directly (e.g., targetProperty: "shieldMultiplier")
 * without receiving any narrative flag names or story variables.
 *
 * @public
 */
export interface MiniGameModifier {
  /** Unique identifier for the modifier instance. */
  readonly id: string;
  /** Optional human-readable display name for the modifier. */
  readonly name?: string;
  /** Target domain property in the minigame state affected by this modifier. */
  readonly targetProperty: string;
  /** The modification value to apply (numeric multiplier/offset, string setting, or boolean flag). */
  readonly value: number | string | boolean;
  /** Optional key-value metadata attached to the modifier. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Complete runtime context passed to launch a minigame run.
 *
 * @public
 */
export interface MiniGameRunContext {
  /** Unique execution identifier for this minigame run. */
  readonly runId: string;
  /** Unique identifier of the encounter triggering this minigame run. */
  readonly encounterId: string;
  /** Optional source story node ID from which this run was launched. */
  readonly sourceStoryNodeId?: string;
  /** Identifier of the target minigame. */
  readonly gameId: MiniGameId;
  /** Seed value used for deterministic RNG initialization. */
  readonly seed: number;
  /** Configuration settings for this run. */
  readonly config: MiniGameConfig;
  /** Active modifiers applied to this session. */
  readonly modifiers: ReadonlyArray<MiniGameModifier>;
}

/**
 * Results captured upon completion or termination of a minigame run.
 *
 * @public
 */
export interface MiniGameResult {
  /** Unique execution identifier corresponding to the run context. */
  readonly runId: string;
  /** Identifier of the target minigame. */
  readonly gameId: MiniGameId;
  /** Final score achieved in the minigame run. */
  readonly score: number;
  /** Whether the minigame objective was successfully completed. */
  readonly completed: boolean;
  /** Total duration of the run in milliseconds. */
  readonly durationMs: number;
  /** Telemetry and gameplay metrics collected during the run. */
  readonly metrics: Readonly<Record<string, number>>;
  /** List of secret items or hidden achievements discovered during the run. */
  readonly secretsFound: ReadonlyArray<string>;
}

/**
 * Immutable snapshot of `StoryState` for read-only modifier resolution.
 *
 * @public
 */
export interface StoryRuntimeSnapshot {
  /** Identifier of the active story graph. */
  readonly graphId: string | null;
  /** Identifier of the current node in the story graph. */
  readonly currentNodeId: string | null;
  /** Map of active story boolean flags. */
  readonly flags: Readonly<Record<string, boolean>>;
  /** Map of active story variables. */
  readonly variables: Readonly<Record<string, number | string | boolean>>;
  /** List of choice IDs selected in the current story run. */
  readonly selectedChoices: ReadonlyArray<string>;
  /** Map of story objectives and their current states. */
  readonly objectives: Readonly<Record<string, Readonly<StoryObjective>>>;
  /** Optional list of evidence IDs discovered by the player. */
  readonly evidence?: ReadonlyArray<string>;
  /** List of node IDs visited in sequence. */
  readonly history: ReadonlyArray<string>;
}

/**
 * Relational comparison operators supported by the Outcome Rule Condition DSL.
 *
 * @public
 */
export type OutcomeComparisonOperator = "==" | "!=" | ">" | ">=" | "<" | "<=";

/**
 * Basic leaf conditions in the Outcome Rule Condition DSL.
 *
 * @public
 */
export type OutcomeLeafCondition =
  | {
      readonly field: "score" | "completed" | "durationMs" | "gameId" | "runId";
      readonly operator: OutcomeComparisonOperator;
      readonly value: number | string | boolean;
    }
  | {
      readonly metric: string;
      readonly operator: OutcomeComparisonOperator;
      readonly value: number;
    }
  | {
      readonly secret: string;
    };

/**
 * Declarative condition DSL for evaluating minigame outcomes.
 *
 * @public
 */
export type OutcomeCondition =
  | OutcomeLeafCondition
  | { readonly all: ReadonlyArray<OutcomeCondition> }
  | { readonly any: ReadonlyArray<OutcomeCondition> }
  | { readonly not: OutcomeCondition };

/**
 * Outcome rule linking minigame results to narrative effects.
 *
 * @public
 */
export interface MiniGameOutcomeRule {
  /** Unique rule identifier. */
  readonly id: string;
  /** Processing priority order for rule evaluation. */
  readonly priority: number;
  /** Declarative condition evaluated against the minigame result. */
  readonly condition: OutcomeCondition;
  /** Story narrative effects applied if the condition passes. */
  readonly effects: ReadonlyArray<StoryEffect>;
  /** Whether to stop evaluating subsequent outcome rules when this rule matches. */
  readonly stopProcessing?: boolean;
}

/**
 * Rule definition mapping story runtime state conditions to minigame domain modifiers.
 *
 * @public
 */
export interface ModifierRule {
  /** Unique rule identifier. */
  readonly id: string;
  /** Predicate function evaluating story runtime state. */
  readonly condition: (snapshot: StoryRuntimeSnapshot) => boolean;
  /** Minigame modifier applied if condition evaluates to true. */
  readonly modifier: MiniGameModifier;
}

/**
 * Declarative encounter definition bridging story nodes and minigames.
 *
 * @public
 */
export interface MiniGameEncounter {
  /** Unique encounter identifier. */
  readonly id: string;
  /** Target minigame type identifier. */
  readonly gameId: MiniGameId;
  /** Optional base configuration passed into the minigame. */
  readonly baseConfig?: MiniGameConfig;
  /** Optional list of modifier rules evaluated prior to launch. */
  readonly modifierRules?: ReadonlyArray<ModifierRule>;
  /** List of outcome rules evaluated upon run completion. */
  readonly outcomeRules: ReadonlyArray<MiniGameOutcomeRule>;
  /** Whether this encounter can be replayed. */
  readonly replayable?: boolean;
  /** Optional key-value metadata attached to the encounter. */
  readonly meta?: Readonly<Record<string, unknown>>;
}
