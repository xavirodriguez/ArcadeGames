import type { StoryGraph, Mutator } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "./AsteroidRegistry";

/**
 * Game options for configuring `AsteroidsGame`.
 *
 * @public
 */
export interface AsteroidsGameOptions {
  /** Mode: infinite "deathmatch" or narrative "story". Defaults to "deathmatch". */
  mode?: "deathmatch" | "story";
  /** Injected StoryGraph instance required when `mode` is "story". */
  storyGraph?: StoryGraph;
  /** Active visual mod ("classic" | "iceberg"). */
  mod?: "classic" | "iceberg" | string;
  /** Initial random seed for gameplay determinism. */
  seed?: number;
  /** Active mutators applied to game simulation. */
  mutators?: Mutator<AsteroidsComponentRegistry>[] | unknown[];
  /** Optional modifiers array. */
  modifiers?: unknown[];
  /**
   * @deprecated Deprecated alias for `storyGraph`. Use `storyGraph` instead.
   */
  graphOverride?: StoryGraph;
  [key: string]: unknown;
}
