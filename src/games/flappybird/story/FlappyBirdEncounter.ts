import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { applyStandardEncounterModifiers } from "../../shared/story/helpers/encounterHelpers";

export const FLAPPY_BIRD_ESCAPE_ENCOUNTER_ID = "flappy_bird_escape_01";

/**
 * `flappy_bird_escape_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Low gravity field (`gravitySuppressed === true`) -> `gravityMultiplier = 0.8`
 * - Wide passage intel (`mapScouted === true`) -> `pipeGapMultiplier = 1.2`
 * - Bonus multiplier (`featherArtifact === true`) -> `scoreMultiplier = 1.5`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("flownThroughCanyon", true)`
 * B. Long Distance Flight: `pipesCleared >= 10` -> `setFlag("enduranceFlier", true)`, `incrementVariable("stamina", 10)`
 * C. Golden Feather: Secret `"golden_feather_artifact"` -> `discoverEvidence("golden_feather_artifact")`
 */
export const flappyBirdEscapeEncounter: MiniGameEncounter = {
  id: FLAPPY_BIRD_ESCAPE_ENCOUNTER_ID,
  gameId: "flappybird",
  baseConfig: {
    difficulty: "normal",
    targetScore: 10
  },
  modifierRules: [
    {
      id: "gravity_suppression_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.gravitySuppressed,
      modifier: {
        id: "gravity_reduction",
        targetProperty: "gravityMultiplier",
        value: 0.8
      }
    },
    {
      id: "map_scouted_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.mapScouted,
      modifier: {
        id: "pipe_gap_expansion",
        targetProperty: "pipeGapMultiplier",
        value: 1.2
      }
    },
    {
      id: "feather_artifact_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.featherArtifact,
      modifier: {
        id: "score_multiplier_boost",
        targetProperty: "scoreMultiplier",
        value: 1.5
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_success",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "setFlag",
          key: "flownThroughCanyon",
          value: true
        }
      ]
    },
    {
      id: "rule_endurance",
      priority: 20,
      condition: {
        metric: "pipesCleared",
        operator: ">=",
        value: 10
      },
      effects: [
        {
          type: "setFlag",
          key: "enduranceFlier",
          value: true
        },
        {
          type: "incrementVariable",
          key: "stamina",
          amount: 10
        }
      ]
    },
    {
      id: "rule_golden_feather",
      priority: 30,
      condition: {
        secret: "golden_feather_artifact"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "golden_feather_artifact"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Flappy Bird encounters.
 */
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * ArcadeGameAdapter implementation for Flappy Bird encounters.
 */
export class FlappyBirdArcadeAdapter extends BaseArcadeAdapter<FlappyBirdGame> {
  protected createGame(context: MiniGameRunContext): FlappyBirdGame {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/story/EchoRunnerEncounter.ts:127-132. Considerar extraer a función compartida. Ref: b7284545
    return new FlappyBirdGame({ seed: context.seed });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    const score = payload?.score ?? (this.game as any)?.getScore?.() ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 10));
    const durationMs = payload?.durationMs ?? 20000;
    const pipesCleared = payload?.pipesCleared ?? score;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundFeather) {
      secretsFound.push("golden_feather_artifact");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        pipesCleared,
        nearMisses: payload?.nearMisses ?? 0
      },
      secretsFound
    };
  }
}
