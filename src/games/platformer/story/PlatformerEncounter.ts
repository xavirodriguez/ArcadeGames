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
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * ArcadeGameAdapter implementation for Platformer encounters.
 */
export class PlatformerArcadeAdapter extends BaseArcadeAdapter<PlatformerGame> {
  protected createGame(_context: MiniGameRunContext): PlatformerGame {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/story/EchoRunnerEncounter.ts:127-132. Considerar extraer a función compartida. Ref: 52fd6016
    return new PlatformerGame();
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    const score = payload?.score ?? (this.game as any)?.getScore?.() ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 1000));
    const durationMs = payload?.durationMs ?? 40000;
    const coinsCollected = payload?.coinsCollected ?? 0;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundRelicCache) {
      secretsFound.push("ancient_relic_cache");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        coinsCollected,
        enemiesDefeated: payload?.enemiesDefeated ?? 0
      },
      secretsFound
    };
  }
}
