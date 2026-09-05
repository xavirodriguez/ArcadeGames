import { StoryCondition } from "./StoryTypes";

/**
 * Pure helper functions for constructing `StoryCondition` predicate objects.
 *
 * @public
 */
export const cond = {
  /**
   * Constructs a flag evaluation condition.
   *
   * @param key - The boolean flag key to evaluate.
   * @param value - Expected flag value (defaults to true).
   */
  flag: (key: string, value = true): StoryCondition => ({
    type: "flag",
    key,
    value
  }),

  /**
   * Constructs a state variable comparison condition.
   *
   * @param key - The variable key to evaluate.
   * @param operator - Comparison operator (e.g. '==', '!=', '\>=', etc.).
   * @param value - Expected target value for comparison.
   */
  variable: (
    key: string,
    operator: NonNullable<StoryCondition["operator"]>,
    value: number | string | boolean
  ): StoryCondition => ({
    type: "variable",
    key,
    operator,
    value
  }),

  /**
   * Constructs an event condition.
   *
   * @param eventName - The event key or name to check.
   */
  event: (eventName: string): StoryCondition => ({
    type: "event",
    key: eventName
  }),

  /**
   * Constructs a logical AND compound condition requiring all sub-conditions to evaluate to true.
   *
   * @param conditions - List of sub-conditions.
   */
  all: (...conditions: StoryCondition[]): StoryCondition => ({
    type: "all",
    all: conditions
  }),

  /**
   * Constructs a logical OR compound condition requiring at least one sub-condition to evaluate to true.
   *
   * @param conditions - List of sub-conditions.
   */
  any: (...conditions: StoryCondition[]): StoryCondition => ({
    type: "any",
    any: conditions
  }),

  /**
   * Constructs a logical NOT inverted condition requiring the sub-condition to evaluate to false.
   *
   * @param condition - The sub-condition to invert.
   */
  not: (condition: StoryCondition): StoryCondition => ({
    type: "not",
    not: condition
  })
};
