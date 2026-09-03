import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { PongGame } from "../PongGame";

export const PONG_CHAMPIONSHIP_ENCOUNTER_ID = "pong_championship_01";

/**
 * `pong_championship_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Servo calibration (`paddleCalibrated === true`) -> `paddleSpeedMultiplier = 1.3`
 * - Overcharged capacitor (`capacitorCharged === true`) -> `ballSpeedMultiplier = 1.2`
 * - Tournament seed position (`seededPlayer === true`) -> `extraPointsHandicap = 1`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("pongTrophyWon", true)`
 * B. Shutout Victory: `opponentScore == 0` -> `setFlag("cleanSweeper", true)`, `incrementVariable("reputation", 15)`
 * C. Secret Prototype: Secret `"prototype_paddle_schematic"` -> `discoverEvidence("prototype_paddle_schematic")`
 */
export const pongChampionshipEncounter: MiniGameEncounter = {
  id: PONG_CHAMPIONSHIP_ENCOUNTER_ID,
  gameId: "pong",
  baseConfig: {
    difficulty: "normal",
    targetScore: 5
  },
  modifierRules: [
    {
      id: "servo_calibration_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.paddleCalibrated,
      modifier: {
        id: "paddle_speed_boost",
        targetProperty: "paddleSpeedMultiplier",
        value: 1.3
      }
    },
    {
      id: "capacitor_charged_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.capacitorCharged,
      modifier: {
        id: "ball_speed_boost",
        targetProperty: "ballSpeedMultiplier",
        value: 1.2
      }
    },
    {
      id: "seeded_player_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.seededPlayer,
      modifier: {
        id: "handicap_point_grant",
        targetProperty: "extraPointsHandicap",
        value: 1
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
          key: "pongTrophyWon",
          value: true
        }
      ]
    },
    {
      id: "rule_shutout",
      priority: 20,
      condition: {
        metric: "opponentScore",
        operator: "==",
        value: 0
      },
      effects: [
        {
          type: "setFlag",
          key: "cleanSweeper",
          value: true
        },
        {
          type: "incrementVariable",
          key: "reputation",
          amount: 15
        }
      ]
    },
    {
      id: "rule_prototype_schematic",
      priority: 30,
      condition: {
        secret: "prototype_paddle_schematic"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "prototype_paddle_schematic"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Pong encounters.
 */
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * ArcadeGameAdapter implementation for Pong encounters.
 */
export class PongArcadeAdapter extends BaseArcadeAdapter<PongGame> {
  protected createGame(context: MiniGameRunContext): PongGame {
    return new PongGame({ seed: context.seed });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    const playerScore = payload?.playerScore ?? (this.game as any)?.playerScore ?? 0;
    const opponentScore = payload?.opponentScore ?? (this.game as any)?.opponentScore ?? 0;
    const completed = payload?.completed ?? (playerScore > opponentScore && playerScore >= (context.config.targetScore ?? 5));
    const durationMs = payload?.durationMs ?? 30000;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundSchematic) {
      secretsFound.push("prototype_paddle_schematic");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score: playerScore,
      completed,
      durationMs,
      metrics: {
        playerScore,
        opponentScore,
        rallyReps: payload?.rallyReps ?? 0
      },
      secretsFound
    };
  }
}
