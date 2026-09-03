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
// TODO(refactor): código duplicado detectado (bloque) con asteroids/story/EscapeRouteEncounter.ts:169-188. Considerar extraer a función compartida. Ref: d62b6c96
export class PongArcadeAdapter implements ArcadeGameAdapter {
  private game: PongGame | null = null;
  private resultCallback: ((result: MiniGameResult) => void) | null = null;

  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = new PongGame({ seed: context.seed });
    this.game = game;

    // Apply modifiers from run context
    for (const modifier of context.modifiers) {
      if (modifier.targetProperty === "paddleSpeedMultiplier" && typeof modifier.value === "number") {
        (game as any).paddleSpeedMultiplier = modifier.value;
      } else if (modifier.targetProperty === "ballSpeedMultiplier" && typeof modifier.value === "number") {
        (game as any).ballSpeedMultiplier = modifier.value;
      } else if (modifier.targetProperty === "extraPointsHandicap" && typeof modifier.value === "number") {
        // TODO(refactor): código duplicado detectado (bloque) con echorunner/story/EchoRunnerEncounter.ts:136-147. Considerar extraer a función compartida. Ref: c5c4d235
        (game as any).extraPointsHandicap = modifier.value;
      }
    }

    game.start();

    const eventBus = (game as any).eventBus || (game as any).getEventBus?.();
    if (eventBus) {
      eventBus.on("game:over" as any, (payload: any) => {
        this.emitResult(context, payload);
      });
      // TODO(refactor): código duplicado detectado (bloque) con asteroids/story/EscapeRouteEncounter.ts:139-152. Considerar extraer a función compartida. Ref: 472ffcf5
      eventBus.on("match:completed" as any, (payload: any) => {
        this.emitResult(context, payload);
      });
    }
  }

  public onResult(callback: (result: MiniGameResult) => void): void {
    this.resultCallback = callback;
  }

  public emitResult(context: MiniGameRunContext, payload?: any): void {
    if (!this.resultCallback) return;

    const playerScore = payload?.playerScore ?? (this.game as any)?.playerScore ?? 0;
    const opponentScore = payload?.opponentScore ?? (this.game as any)?.opponentScore ?? 0;
    const completed = payload?.completed ?? (playerScore > opponentScore && playerScore >= (context.config.targetScore ?? 5));
    const durationMs = payload?.durationMs ?? 30000;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundSchematic) {
      secretsFound.push("prototype_paddle_schematic");
    }

    const result: MiniGameResult = {
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

    this.resultCallback(result);
  }

  public dispose(): void {
    if (this.game) {
      if (typeof (this.game as any).destroy === "function") {
        (this.game as any).destroy();
      } else if (typeof (this.game as any).stop === "function") {
        (this.game as any).stop();
      }
      this.game = null;
    }
    this.resultCallback = null;
  }
}
