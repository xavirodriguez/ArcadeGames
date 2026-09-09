import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";
import { ArkanoidGame } from "../ArkanoidGame";

export const ARKANOID_ESCAPE_ENCOUNTER_ID = "arkanoid_escape_01";

export const arkanoidEscapeEncounter: MiniGameEncounter = {
  id: ARKANOID_ESCAPE_ENCOUNTER_ID,
  gameId: "arkanoid",
  baseConfig: {
    difficulty: "normal",
    targetScore: 1000
  },
  modifierRules: [
    {
      id: "paddle_overclock_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.paddleOverclocked,
      modifier: {
        id: "paddle_speed_boost",
        targetProperty: "paddleSpeedMultiplier",
        value: 1.25
      }
    },
    {
      id: "wide_laser_grid_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.wideLaserGrid,
      modifier: {
        id: "paddle_width_boost",
        targetProperty: "paddleWidthMultiplier",
        value: 1.3
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
          key: "brickBarrierCleared",
          value: true
        }
      ]
    },
    {
      id: "rule_high_score",
      priority: 20,
      condition: {
        metric: "bricksDestroyed",
        operator: ">=",
        value: 15
      },
      effects: [
        {
          type: "setFlag",
          key: "demolitionExpert",
          value: true
        },
        {
          type: "incrementVariable",
          key: "stamina",
          amount: 15
        }
      ]
    },
    {
      id: "rule_secret_core",
      priority: 30,
      condition: {
        secret: "quantum_brick_core"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "quantum_brick_core"
        }
      ]
    }
  ]
};

export class ArkanoidArcadeAdapter extends BaseArcadeAdapter<ArkanoidGame> {
  protected createGame(context: MiniGameRunContext): ArkanoidGame {
    return new ArkanoidGame({ seed: context.seed, headless: true });
  }

  protected buildResult(context: MiniGameRunContext, payload?: any): MiniGameResult {
    const score = payload?.score ?? this.game?.getGameState?.()?.score ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 1000));
    const durationMs = payload?.durationMs ?? 30000;
    const bricksDestroyed = payload?.bricksDestroyed ?? Math.floor(score / 100);
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundCore) {
      secretsFound.push("quantum_brick_core");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        bricksDestroyed,
        maxCombo: payload?.maxCombo ?? 1
      },
      secretsFound
    };
  }
}
