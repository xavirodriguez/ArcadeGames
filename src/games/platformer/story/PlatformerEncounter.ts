import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { PlatformerGame } from "../PlatformerGame";
import { applyStandardEncounterModifiers } from "../../shared/story/helpers/encounterHelpers";

export const PLATFORMER_RUN_ENCOUNTER_ID = "platformer_run_01";

/**
 * `platformer_run_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Anti-gravity boots (`antiGravBoots === true`) -> `jumpPowerMultiplier = 1.2`
 * - Rations collected (`rationsCollected > 0`) -> `extraLives = 1`
 * - Speed boots (`speedBoots === true`) -> `moveSpeedMultiplier = 1.15`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("platformerLevelCleared", true)`
 * B. Coin Collector: `coinsCollected >= 20` -> `incrementVariable("credits", 100)`
 * C. Hidden Cache: Secret `"ancient_relic_cache"` -> `discoverEvidence("ancient_relic_cache")`
 */
export const platformerRunEncounter: MiniGameEncounter = {
  id: PLATFORMER_RUN_ENCOUNTER_ID,
  gameId: "platformer",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 90000,
    targetScore: 1000
  },
  modifierRules: [
    {
      id: "anti_grav_boots_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.antiGravBoots,
      modifier: {
        id: "jump_power_boost",
        targetProperty: "jumpPowerMultiplier",
        value: 1.2
      }
    },
    {
      id: "rations_check",
      condition: (snapshot: StoryRuntimeSnapshot) => {
        const rations = typeof snapshot.variables.rationsCollected === "number" ? snapshot.variables.rationsCollected : 0;
        return rations > 0;
      },
      modifier: {
        id: "extra_life_grant",
        targetProperty: "extraLives",
        value: 1
      }
    },
    {
      id: "speed_boots_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.speedBoots,
      modifier: {
        id: "move_speed_boost",
        targetProperty: "moveSpeedMultiplier",
        value: 1.15
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
          key: "platformerLevelCleared",
          value: true
        }
      ]
    },
    {
      id: "rule_coins",
      priority: 20,
      condition: {
        metric: "coinsCollected",
        operator: ">=",
        value: 20
      },
      effects: [
        {
          type: "incrementVariable",
          key: "credits",
          amount: 100
        }
      ]
    },
    {
      id: "rule_hidden_cache",
      priority: 30,
      condition: {
        secret: "ancient_relic_cache"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "ancient_relic_cache"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Platformer encounters.
 */
import { BaseArcadeAdapter, extractCommonResultData } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * ArcadeGameAdapter implementation for Platformer encounters.
 */
export class PlatformerArcadeAdapter extends BaseArcadeAdapter<PlatformerGame> {
  protected createGame(context: MiniGameRunContext): PlatformerGame {
    return new PlatformerGame({ gameOptions: { seed: context.seed } });
  }

  protected buildResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
    const common = extractCommonResultData(
      this.game,
      context,
      payload,
      40000,
      1000,
      "foundRelicCache",
      "ancient_relic_cache"
    );

    return {
      runId: context.runId,
      gameId: context.gameId,
      score: common.score,
      completed: common.completed,
      durationMs: common.durationMs,
      metrics: {
        coinsCollected: (payload?.coinsCollected as number | undefined) ?? 0,
        enemiesDefeated: (payload?.enemiesDefeated as number | undefined) ?? 0
      },
      secretsFound: common.secretsFound
    };
  }
}
