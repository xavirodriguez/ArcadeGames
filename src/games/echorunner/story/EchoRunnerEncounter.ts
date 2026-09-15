import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { EchoRunnerGame } from "../EchoRunnerGame";
import { applyStandardEncounterModifiers } from "../../shared/story/helpers/encounterHelpers";

export const ECHO_RUNNER_DASH_ENCOUNTER_ID = "echo_runner_dash_01";

/**
 * `echo_runner_dash_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Time dilation field (`timeDilationActive === true`) -> `timeLimitMultiplier = 1.25`
 * - Overcharged battery (`batteryCharged === true`) -> `energyBoost = 25`
 * - Cybernetic legs (`legsAugmented === true`) -> `speedMultiplier = 1.15`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("echoCorridorEscaped", true)`
 * B. Flawless Dash: `collisions == 0` -> `setFlag("ghostRunner", true)`, `incrementVariable("agility", 10)`
 * C. Memory Fragment: Secret `"memory_core_fragment_01"` -> `discoverEvidence("memory_core_fragment_01")`
 */
export const echoRunnerDashEncounter: MiniGameEncounter = {
  id: ECHO_RUNNER_DASH_ENCOUNTER_ID,
  gameId: "echorunner",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1500
  },
  modifierRules: [
    {
      id: "time_dilation_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.timeDilationActive,
      modifier: {
        id: "time_extension",
        targetProperty: "timeLimitMultiplier",
        value: 1.25
      }
    },
    {
      id: "battery_charge_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.batteryCharged,
      modifier: {
        id: "energy_boost_grant",
        targetProperty: "energyBoost",
        value: 25
      }
    },
    {
      id: "legs_augmented_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.legsAugmented,
      modifier: {
        id: "speed_boost_grant",
        targetProperty: "speedMultiplier",
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
          key: "echoCorridorEscaped",
          value: true
        }
      ]
    },
    {
      id: "rule_flawless",
      priority: 20,
      condition: {
        metric: "collisions",
        operator: "==",
        value: 0
      },
      effects: [
        {
          type: "setFlag",
          key: "ghostRunner",
          value: true
        },
        {
          type: "incrementVariable",
          key: "agility",
          amount: 10
        }
      ]
    },
    {
      id: "rule_memory_fragment",
      priority: 30,
      condition: {
        secret: "memory_core_fragment_01"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "memory_core_fragment_01"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Echo Runner encounters.
 */
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * ArcadeGameAdapter implementation for Echo Runner encounters.
 */
export class EchoRunnerArcadeAdapter extends BaseArcadeAdapter<EchoRunnerGame> {
  protected createGame(context: MiniGameRunContext): EchoRunnerGame {
    // TODO(refactor): código duplicado detectado (bloque) con flappybird/story/FlappyBirdEncounter.ts:126-131. Considerar extraer a función compartida. Ref: b7284545
    return new EchoRunnerGame({ seed: context.seed });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    const score = payload?.score ?? (this.game as any)?.getScore?.() ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 1500));
    const durationMs = payload?.durationMs ?? 35000;
    const collisions = payload?.collisions ?? 0;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundMemoryFragment) {
      secretsFound.push("memory_core_fragment_01");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        collisions,
        distanceCovered: payload?.distanceCovered ?? 0
      },
      secretsFound
    };
  }
}
