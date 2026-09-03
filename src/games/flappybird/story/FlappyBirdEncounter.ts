import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { applyStandardEncounterModifiers } from "../../shared/story/encounterHelpers";

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
export class FlappyBirdArcadeAdapter implements ArcadeGameAdapter {
  private game: FlappyBirdGame | null = null;
  private resultCallback: ((result: MiniGameResult) => void) | null = null;

  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = new FlappyBirdGame({ seed: context.seed });
    this.game = game;

    // Apply modifiers from run context
    for (const modifier of context.modifiers) {
      if (modifier.targetProperty === "gravityMultiplier" && typeof modifier.value === "number") {
        (game as any).gravityMultiplier = modifier.value;
      } else if (modifier.targetProperty === "pipeGapMultiplier" && typeof modifier.value === "number") {
        (game as any).pipeGapMultiplier = modifier.value;
      } else if (modifier.targetProperty === "scoreMultiplier" && typeof modifier.value === "number") {
        (game as any).scoreMultiplier = modifier.value;
      }
    }

    game.start();

    const eventBus = (game as any).eventBus || (game as any).getEventBus?.();
    if (eventBus) {
      eventBus.on("game:over" as any, (payload: any) => {
        this.emitResult(context, payload);
      });
      eventBus.on("level:completed" as any, (payload: any) => {
        this.emitResult(context, payload);
      });
    }
  }

  public onResult(callback: (result: MiniGameResult) => void): void {
    this.resultCallback = callback;
  }

  public emitResult(context: MiniGameRunContext, payload?: any): void {
    if (!this.resultCallback) return;

    const score = payload?.score ?? (this.game as any)?.getScore?.() ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 10));
    const durationMs = payload?.durationMs ?? 20000;
    const pipesCleared = payload?.pipesCleared ?? score;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundFeather) {
      secretsFound.push("golden_feather_artifact");
    }

    const result: MiniGameResult = {
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
