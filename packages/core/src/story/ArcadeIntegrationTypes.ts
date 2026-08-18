import { StoryEffect, StoryObjective } from "./StoryTypes";

/**
 * Identifier for minigame types registered in the system (e.g. "asteroids", "space_invaders").
 *
 * @public
 */
export type MiniGameId = string;

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
  readonly difficulty?: MiniGameDifficulty;
  readonly timeLimitMs?: number;
  readonly targetScore?: number;
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
  readonly id: string;
  readonly name?: string;
  readonly targetProperty: string;
  readonly value: number | string | boolean;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Complete runtime context passed to launch a minigame run.
 *
 * @public
 */
export interface MiniGameRunContext {
  readonly runId: string;
  readonly encounterId: string;
  readonly sourceStoryNodeId?: string;
  readonly gameId: MiniGameId;
  readonly seed: number;
  readonly config: MiniGameConfig;
  readonly modifiers: ReadonlyArray<MiniGameModifier>;
}

/**
 * Results captured upon completion or termination of a minigame run.
 *
 * @public
 */
export interface MiniGameResult {
  readonly runId: string;
  readonly gameId: MiniGameId;
  readonly score: number;
  readonly completed: boolean;
  readonly durationMs: number;
  readonly metrics: Readonly<Record<string, number>>;
  readonly secretsFound: ReadonlyArray<string>;
}

/**
 * Immutable snapshot of `StoryState` for read-only modifier resolution.
 *
 * @public
 */
export interface StoryRuntimeSnapshot {
  readonly graphId: string | null;
  readonly currentNodeId: string | null;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly variables: Readonly<Record<string, number | string | boolean>>;
  readonly selectedChoices: ReadonlyArray<string>;
  readonly objectives: Readonly<Record<string, Readonly<StoryObjective>>>;
  readonly evidence?: ReadonlyArray<string>;
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
  readonly id: string;
  readonly priority: number;
  readonly condition: OutcomeCondition;
  readonly effects: ReadonlyArray<StoryEffect>;
  readonly stopProcessing?: boolean;
}

/**
 * Rule definition mapping story runtime state conditions to minigame domain modifiers.
 *
 * @public
 */
export interface ModifierRule {
  readonly id: string;
  readonly condition: (snapshot: StoryRuntimeSnapshot) => boolean;
  readonly modifier: MiniGameModifier;
}

/**
 * Declarative encounter definition bridging story nodes and minigames.
 *
 * @public
 */
export interface MiniGameEncounter {
  readonly id: string;
  readonly gameId: MiniGameId;
  readonly baseConfig?: MiniGameConfig;
  readonly modifierRules?: ReadonlyArray<ModifierRule>;
  readonly outcomeRules: ReadonlyArray<MiniGameOutcomeRule>;
  readonly meta?: Readonly<Record<string, unknown>>;
}
