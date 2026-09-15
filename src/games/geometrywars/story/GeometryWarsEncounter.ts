import {
  MiniGameEncounter,
  MiniGameRunContext,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { BaseMiniGameEncounter } from "@tiny-aster/gameplay-kit";
import { GeometryWarsGame } from "../GeometryWarsGame";

export const GEOMETRY_WARS_OVERDRIVE_ENCOUNTER_ID = "geometry_wars_overdrive_01";

/**
 * `geometry_wars_overdrive_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Ordnance reserves (`bombsAvailable > 0`) -> `bombCount = 3`
 * - Overclocked core (`coreOverclocked === true`) -> `multiplierBoost = 2.0`
 * - Thruster tuning (`thrustersUpgraded === true`) -> `playerSpeedMultiplier = 1.2`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("gridStabilized", true)`
 * B. High Multiplier: `maxMultiplier >= 10` -> `setFlag("overdriveMastery", true)`
 * C. Core Anomaly: Secret `"quantum_singularity_core"` -> `discoverEvidence("quantum_singularity_core")`
 */
export const geometryWarsOverdriveEncounter: MiniGameEncounter = {
  id: GEOMETRY_WARS_OVERDRIVE_ENCOUNTER_ID,
  gameId: "geometrywars",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 120000,
    targetScore: 5000
  },
  modifierRules: [
    {
      id: "ordnance_reserves_check",
      condition: (snapshot: StoryRuntimeSnapshot) => {
        const bombs = typeof snapshot.variables.bombsAvailable === "number" ? snapshot.variables.bombsAvailable : 0;
        return bombs > 0;
      },
      modifier: {
        id: "bomb_reserves_grant",
        targetProperty: "bombCount",
        value: 3
      }
    },
    {
      id: "core_overclock_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.coreOverclocked,
      modifier: {
        id: "multiplier_boost_enable",
        targetProperty: "multiplierBoost",
        value: 2.0
      }
    },
    {
      id: "thrusters_upgrade_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.thrustersUpgraded,
      modifier: {
        id: "player_speed_boost",
        targetProperty: "playerSpeedMultiplier",
        value: 1.2
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
          key: "gridStabilized",
          value: true
        }
      ]
    },
    {
      id: "rule_high_multiplier",
      priority: 20,
      condition: {
        metric: "maxMultiplier",
        operator: ">=",
        value: 10
      },
      effects: [
        {
          type: "setFlag",
          key: "overdriveMastery",
          value: true
        }
      ]
    },
    {
      id: "rule_quantum_core",
      priority: 30,
      condition: {
        secret: "quantum_singularity_core"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "quantum_singularity_core"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Geometry Wars encounters.
 */
export class GeometryWarsArcadeAdapter extends BaseMiniGameEncounter<GeometryWarsGame> {
  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = new GeometryWarsGame({ seed: context.seed });
    this.game = game;

    for (const modifier of context.modifiers) {
      if (modifier.targetProperty === "bombCount" && typeof modifier.value === "number") {
        (game as any).bombCount = modifier.value;
      } else if (modifier.targetProperty === "multiplierBoost" && typeof modifier.value === "number") {
        (game as any).multiplierBoost = modifier.value;
      } else if (modifier.targetProperty === "playerSpeedMultiplier" && typeof modifier.value === "number") {
        // TODO(refactor): código duplicado detectado (bloque) con space-invaders/story/InvasionEncounter.ts:127-145. Considerar extraer a función compartida. Ref: 1b2addb8
        (game as any).playerSpeedMultiplier = modifier.value;
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

  protected buildResultPayload(context: MiniGameRunContext, payload?: any) {
    const maxMultiplier = payload?.maxMultiplier ?? (this.game as any)?.maxMultiplier ?? 1;
    const secretsFound: string[] = payload?.secretsFound ?? [];

    if (payload?.foundQuantumCore) {
      secretsFound.push("quantum_singularity_core");
    }

    return {
      metrics: {
        maxMultiplier,
        geomsCollected: payload?.geomsCollected ?? 0
      },
      secretsFound
    };
  }
}
