import { World } from "@tiny-aster/core";

/**
 * Type of mission condition logic.
 * @public
 */
export type MissionConditionType =
  | "event_count"
  | "continuous_time"
  | "state_threshold"
  | "composite";

/**
 * Reward awarded upon mission completion.
 * @public
 */
export interface MissionReward {
  xp?: number;
  scoreBonus?: number;
  mutatorId?: string;
  achievementId?: string;
  description?: string;
}

/**
 * Active runtime state for a mission.
 * @public
 */
export interface ActiveMissionState {
  id: string;
  titleKey: string;
  descriptionKey: string;
  title: string;
  description: string;
  currentCount: number;
  targetCount: number;
  currentTimer: number;
  targetTimer: number;
  completed: boolean;
  failed: boolean;
  reward?: MissionReward;
  customData: Record<string, any>;
  definition: MissionDefinition;
}

/**
 * Declarative definition of a minigame mission.
 * @public
 */
export interface MissionDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  title: string;
  description: string;
  conditionType: MissionConditionType;
  targetCount?: number;
  targetTime?: number;
  eventKeys?: string[];
  reward?: MissionReward;
  fallbackCondition?: MissionDefinition;
  /**
   * Callback invoked when a subscribed event fires.
   */
  onEvent?: (
    world: World<any, any, any>,
    state: ActiveMissionState,
    eventName: string,
    payload: any
  ) => void;
  /**
   * Callback invoked every frame tick for continuous state or time checks.
   */
  onUpdate?: (
    world: World<any, any, any>,
    state: ActiveMissionState,
    deltaTime: number
  ) => void;
  /**
   * Callback invoked when the mission is initialized/activated.
   */
  onInit?: (
    world: World<any, any, any>,
    state: ActiveMissionState
  ) => void;
}
