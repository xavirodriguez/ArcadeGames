import { MiniGameRunContext } from "@tiny-aster/core";

/**
 * Applies standard narrative encounter modifiers (`shieldMultiplier`, `navigationAssist`)
 * to a minigame instance.
 *
 * @public
 */
import { StoryRuntimeSnapshot, ModifierRule, MiniGameOutcomeRule } from "@tiny-aster/core";

export function applyStandardEncounterModifiers(
  game: unknown,
  context: MiniGameRunContext
): void {
  const targetGame = game as Record<string, unknown>;
  for (const modifier of context.modifiers) {
    if (modifier.targetProperty === "shieldMultiplier" && typeof modifier.value === "number") {
      targetGame.shieldMultiplier = modifier.value;
    } else if (modifier.targetProperty === "navigationAssist" && typeof modifier.value === "boolean") {
      targetGame.navigationAssist = modifier.value;
    }
  }
}

/**
 * Standard modifier rules shared by runner encounters (EchoRunner, HitAndRun).
 * @public
 */
export const STANDARD_RUNNER_MODIFIER_RULES: ModifierRule[] = [
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
];

export function createRunnerOutcomeRules(
  escapedFlagKey: string,
  flawlessFlagKey: string
): MiniGameOutcomeRule[] {
  return [
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
          key: escapedFlagKey,
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
          key: flawlessFlagKey,
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
  ];
}
