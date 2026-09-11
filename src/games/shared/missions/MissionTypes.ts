import { ComponentRegistry } from "@tiny-aster/core";

/**
 * Types of conditions used to track mission completion.
 * @public
 */
export type MissionConditionType =
  | "event_counter"
  | "continuous"
  | "combo_multiplier"
  | "time_limit"
  | "survival"
  | "distance_event"
  | "timed_sequence"
  | "shield_event";

/**
 * Rewards granted upon mission completion.
 * @public
 */
export interface MissionReward {
  xp?: number;
  mutatorId?: string;
  scoreBonus?: number;
  achievementId?: string;
}

/**
 * Definition of a playable mini-mission.
 * @public
 */
export interface MissionDefinition {
  /** Unique mission identifier */
  id: string;
  /** Translation key for title */
  titleKey: string;
  /** Translation key for description */
  descriptionKey: string;
  /** Primary condition type */
  conditionType: MissionConditionType;
  /** Target numeric count for event or timer goals */
  targetCount: number;
  /** Optional time limit in seconds */
  timeLimit?: number;
  /** Optional reward granted on completion */
  reward?: MissionReward;
  /** Custom thresholds, radii, or parameters */
  customData?: Record<string, unknown>;
}

/**
 * Active tracking progress of a mission during simulation.
 * @public
 */
export interface MissionProgress {
  definition: MissionDefinition;
  currentCount: number;
  completed: boolean;
  failed: boolean;
  elapsedTime: number;
  customState: Record<string, unknown>;
}

/**
 * Payload emitted on mission events.
 * @public
 */
export interface MissionEventPayload {
  missionId: string;
  progress?: MissionProgress;
  reward?: MissionReward;
}
