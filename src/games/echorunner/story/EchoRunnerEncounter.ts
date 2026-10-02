import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { EchoRunnerGame } from "../EchoRunnerGame";
import { STANDARD_RUNNER_MODIFIER_RULES, createRunnerOutcomeRules } from "../../shared/story/helpers/encounterHelpers";
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

export const ECHO_RUNNER_DASH_ENCOUNTER_ID = "echo_runner_dash_01";

/**
 * `echo_runner_dash_01` encounter definition.
 */
export const echoRunnerDashEncounter: MiniGameEncounter = {
  id: ECHO_RUNNER_DASH_ENCOUNTER_ID,
  gameId: "echorunner",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1500
  },
  modifierRules: STANDARD_RUNNER_MODIFIER_RULES,
  outcomeRules: createRunnerOutcomeRules("echoCorridorEscaped", "ghostRunner")
};

/**
 * ArcadeGameAdapter implementation for Echo Runner encounters.
 */
export class EchoRunnerArcadeAdapter extends BaseArcadeAdapter<EchoRunnerGame> {
  protected createGame(context: MiniGameRunContext): EchoRunnerGame {
    return new EchoRunnerGame({ seed: context.seed });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    return this.buildRunnerResult(context, "memory_core_fragment_01", payload);
  }
}
