import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { SpaceInvadersGame } from "../SpaceInvadersGame";
import { applyStandardEncounterModifiers } from "../../shared/story/helpers/encounterHelpers";

export const SPACE_INVADERS_INVASION_ENCOUNTER_ID = "space_invaders_invasion_01";

/**
 * `space_invaders_invasion_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Low energy supply (`energy < 40`) -> `extraLives = -1`
 * - Defensive research (`defenseUpgraded === true`) -> `fireRateMultiplier = 1.25`
 * - Command intelligence (`intelGathered === true`) -> `enemySpeedMultiplier = 0.85`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("invasionRepelled", true)`
 * B. Heavy Casualties: `damageTaken >= 3` -> `incrementVariable("hullIntegrity", -20)`
 * C. Intel Data: Secret `"mothership_transmissions"` -> `discoverEvidence("mothership_transmissions")`
 */
export const spaceInvadersInvasionEncounter: MiniGameEncounter = {
  id: SPACE_INVADERS_INVASION_ENCOUNTER_ID,
  gameId: "space-invaders",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 90000,
    targetScore: 2000
  },
  modifierRules: [
    {
      id: "low_energy_check",
      condition: (snapshot: StoryRuntimeSnapshot) => {
        const energy = typeof snapshot.variables.energy === "number" ? snapshot.variables.energy : 100;
        return energy < 40;
      },
      modifier: {
        id: "energy_penalty_lives",
        targetProperty: "extraLives",
        value: -1
      }
    },
    {
      id: "defense_upgraded_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.defenseUpgraded,
      modifier: {
        id: "fire_rate_boost",
        targetProperty: "fireRateMultiplier",
        value: 1.25
      }
    },
    {
      id: "command_intel_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.intelGathered,
      modifier: {
        id: "enemy_slowdown",
        targetProperty: "enemySpeedMultiplier",
        value: 0.85
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
          key: "invasionRepelled",
          value: true
        }
      ]
    },
    {
      id: "rule_casualties",
      priority: 20,
      condition: {
        metric: "damageTaken",
        operator: ">=",
        value: 3
      },
      effects: [
        {
          type: "incrementVariable",
          key: "hullIntegrity",
          amount: -20
        }
      ]
    },
    {
      id: "rule_intel_data",
      priority: 30,
      condition: {
        secret: "mothership_transmissions"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "mothership_transmissions"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Space Invaders encounters.
 */
// TODO(refactor): código duplicado detectado (bloque) con asteroids/story/EscapeRouteEncounter.ts:169-188. Considerar extraer a función compartida. Ref: 96beae78
export class SpaceInvadersArcadeAdapter implements ArcadeGameAdapter {
  private game: SpaceInvadersGame | null = null;
  private resultCallback: ((result: MiniGameResult) => void) | null = null;

  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = new SpaceInvadersGame({ seed: context.seed });
    this.game = game;

    // Apply modifiers from run context to game instance
    for (const modifier of context.modifiers) {
      if (modifier.targetProperty === "extraLives" && typeof modifier.value === "number") {
        (game as any).extraLives = modifier.value;
      } else if (modifier.targetProperty === "fireRateMultiplier" && typeof modifier.value === "number") {
        (game as any).fireRateMultiplier = modifier.value;
      } else if (modifier.targetProperty === "enemySpeedMultiplier" && typeof modifier.value === "number") {
        // TODO(refactor): código duplicado detectado (bloque) con echorunner/story/EchoRunnerEncounter.ts:136-161. Considerar extraer a función compartida. Ref: 3c3c14f3
        (game as any).enemySpeedMultiplier = modifier.value;
      }
    }

    game.start();

    // Listen for gameplay termination / completion events
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
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 2000));
    const durationMs = payload?.durationMs ?? 45000;
    const damageTaken = payload?.damageTaken ?? (this.game as any)?.damageTaken ?? 0;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundTransmissions) {
      secretsFound.push("mothership_transmissions");
    }

    const result: MiniGameResult = {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        damageTaken,
        invadersDestroyed: payload?.invadersDestroyed ?? 0
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
