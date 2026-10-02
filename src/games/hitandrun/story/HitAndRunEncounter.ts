import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";
import { STANDARD_RUNNER_MODIFIER_RULES, createRunnerOutcomeRules } from "../../shared/story/helpers/encounterHelpers";
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

export const HIT_AND_RUN_DASH_ENCOUNTER_ID = "hit_and_run_dash_01";

/**
 * `hit_and_run_dash_01` encounter definition.
 */
export const hitAndRunDashEncounter: MiniGameEncounter = {
  id: HIT_AND_RUN_DASH_ENCOUNTER_ID,
  gameId: "hitandrun",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1500
  },
  modifierRules: STANDARD_RUNNER_MODIFIER_RULES,
  outcomeRules: createRunnerOutcomeRules("hitCorridorEscaped", "hitRunner")
};

/**
 * ArcadeGameAdapter implementation for Hit&Run encounters.
 */
export class HitAndRunArcadeAdapter extends BaseArcadeAdapter<HitAndRunGame> {
  protected createGame(context: MiniGameRunContext): HitAndRunGame {
    return new HitAndRunGame({ seed: context.seed });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    return this.buildRunnerResult(context, "memory_core_fragment_01", payload);
  }
}
