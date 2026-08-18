import { Replay } from "../replay/DeterministicReplay";
import {
  MiniGameResult,
  MiniGameRunContext,
  StoryRuntimeSnapshot
} from "./ArcadeIntegrationTypes";
import { StoryEffect } from "./StoryTypes";

/**
 * Version identifier for ArcadeDebugRun serialized format.
 *
 * @public
 */
export const ARCADE_DEBUG_RUN_VERSION = 1;

/**
 * Complete, versioned debug run bundle recording an arcade session and its narrative impact.
 *
 * @public
 */
export interface ArcadeDebugRun {
  readonly version: number;
  readonly encounterId: string;
  readonly runContext: MiniGameRunContext;
  readonly initialStorySnapshot: StoryRuntimeSnapshot;
  readonly replay: Replay;
  readonly expectedResult: MiniGameResult;
  readonly matchedRuleIds: ReadonlyArray<string>;
  readonly generatedEffects: ReadonlyArray<StoryEffect>;
}

/**
 * Utility functions for creating, serializing, deserializing, and validating ArcadeDebugRun bundles.
 *
 * @public
 */
export class ArcadeDebugRunManager {
  /**
   * Serializes an `ArcadeDebugRun` object into a JSON string.
   */
  public static serialize(debugRun: ArcadeDebugRun): string {
    return JSON.stringify(debugRun, null, 2);
  }

  /**
   * Deserializes and validates a JSON string into an `ArcadeDebugRun` object.
   *
   * @throws Error if version is unsupported or structure is invalid.
   */
  public static deserialize(jsonString: string): ArcadeDebugRun {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== "object") {
      throw new Error("[ArcadeDebugRunManager] Invalid JSON string payload.");
    }

    if (typeof data.version !== "number") {
      throw new Error("[ArcadeDebugRunManager] Missing version identifier in payload.");
    }

    if (data.version !== ARCADE_DEBUG_RUN_VERSION) {
      throw new Error(
        `[ArcadeDebugRunManager] Unsupported debug run version: ${data.version}. Expected ${ARCADE_DEBUG_RUN_VERSION}.`
      );
    }

    if (!data.encounterId || !data.runContext || !data.replay || !data.expectedResult) {
      throw new Error("[ArcadeDebugRunManager] Missing required fields in debug run payload.");
    }

    return data as ArcadeDebugRun;
  }
}
