/**
 * Encounter ID for the debris field escape sequence in Asteroids.
 */
export var ESCAPE_ROUTE_01_ENCOUNTER_ID = "escape_route_01";

import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  ArcadeGameAdapter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { applyStandardEncounterModifiers } from "../../shared/story/helpers/encounterHelpers";
import { BaseArcadeAdapter } from "../../shared/story/adapters/BaseArcadeAdapter";

/**
 * `escape_route_01` encounter definition.
 *
 * Narrative Modifiers:
 * - Low reactor power (`reactorPower < 50`) -> `shieldMultiplier = 0.5`
 * - Known navigation data (`navigationData === true`) -> `navigationAssist = true`
 *
 * Cumulative Outcome Rules:
 * A. Success: `completed === true` -> `setFlag("escapedDebrisField", true)`
 * B. Severe Damage: `collisions >= 5` -> `incrementVariable("oxygen", -25)`, `setFlag("escapeShipDamaged", true)`
 * C. Black Box: Secret `"black_box_fragment"` present -> `discoverEvidence("black_box_fragment")`
 */
export const escapeRoute01Encounter: MiniGameEncounter = {
  id: ESCAPE_ROUTE_01_ENCOUNTER_ID,
  gameId: "asteroids",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1000
  },
  modifierRules: [
    {
      id: "reactor_power_check",
      condition: (snapshot: StoryRuntimeSnapshot) => {
        const reactorPower = typeof snapshot.variables.reactorPower === "number"
          ? snapshot.variables.reactorPower
          : 100;
        return reactorPower < 50;
      },
      modifier: {
        id: "low_reactor_shield_penalty",
        targetProperty: "shieldMultiplier",
        value: 0.5
      }
    },
    {
      id: "navigation_data_check",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.navigationData,
      modifier: {
        id: "navigation_assist_enable",
        targetProperty: "navigationAssist",
        value: true
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_a_success",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "setFlag",
          key: "escapedDebrisField",
          value: true
        }
      ]
    },
    {
      id: "rule_b_severe_damage",
      priority: 20,
      condition: {
        metric: "collisions",
        operator: ">=",
        value: 5
      },
      effects: [
        {
          type: "incrementVariable",
          key: "oxygen",
          amount: -25
        },
        {
          type: "setFlag",
          key: "escapeShipDamaged",
          value: true
        }
      ]
    },
    {
      id: "rule_c_black_box",
      priority: 30,
      condition: {
        secret: "black_box_fragment"
      },
      effects: [
        {
          type: "discoverEvidence",
          evidenceId: "black_box_fragment"
        }
      ]
    }
  ]
};

/**
 * ArcadeGameAdapter implementation for Asteroids encounters.
 */
export class AsteroidsArcadeAdapter extends BaseArcadeAdapter<AsteroidsGame> {
  protected createGame(_context: MiniGameRunContext): AsteroidsGame {
    return new AsteroidsGame();
  }

  protected buildResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
    const { score, completed, durationMs, secretsFound } = this.buildBaseEncounterResult(context, payload, 1000, 30000);
    const gameAsteroids = this.game as unknown as { collisionsCount?: number } | null;
    const collisions = typeof payload?.collisions === "number" ? payload.collisions : (gameAsteroids?.collisionsCount ?? 0);

    if (payload?.foundBlackBox) {
      secretsFound.push("black_box_fragment");
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        collisions,
        asteroidsDestroyed: typeof payload?.asteroidsDestroyed === "number" ? payload.asteroidsDestroyed : 0
      },
      secretsFound
    };
  }
}
