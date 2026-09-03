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
// TODO(refactor): código duplicado detectado (bloque) con asteroids/story/EscapeRouteEncounter.ts:169-188. Considerar extraer a función compartida. Ref: 8e598bb4
export class EchoRunnerArcadeAdapter implements ArcadeGameAdapter {
  private game: EchoRunnerGame | null = null;
  private resultCallback: ((result: MiniGameResult) => void) | null = null;

  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = new EchoRunnerGame({ seed: context.seed });
    this.game = game;

    // Apply modifiers from run context
    for (const modifier of context.modifiers) {
      if (modifier.targetProperty === "timeLimitMultiplier" && typeof modifier.value === "number") {
        (game as any).timeLimitMultiplier = modifier.value;
      } else if (modifier.targetProperty === "energyBoost" && typeof modifier.value === "number") {
        (game as any).energyBoost = modifier.value;
      } else if (modifier.targetProperty === "speedMultiplier" && typeof modifier.value === "number") {
        // TODO(refactor): código duplicado detectado (bloque) con flappybird/story/FlappyBirdEncounter.ts:135-160. Considerar extraer a función compartida. Ref: a07c240f
        (game as any).speedMultiplier = modifier.value;
      }
    }

    // TODO(refactor): código duplicado detectado (bloque) con asteroids/story/EscapeRouteEncounter.ts:131-152. Considerar extraer a función compartida. Ref: bacb64ad
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
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 1500));
    const durationMs = payload?.durationMs ?? 35000;
    const collisions = payload?.collisions ?? 0;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundMemoryFragment) {
      secretsFound.push("memory_core_fragment_01");
    }

    const result: MiniGameResult = {
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
