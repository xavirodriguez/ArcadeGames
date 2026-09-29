import { RandomService } from "@tiny-aster/core";
import { ScenarioConfig, PipeRecipe, PipeVariantOption, PipeMovementOption } from "./types/ScenarioConfig";
import { ScenarioId } from "./types/FlappyBirdTypes";
import { FlappyBirdConfig } from "./types/FlappyBirdConfigSchema";
import { SCENARIO_THEMES } from "./rendering/FlappyBirdBackgroundData";

export const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  open_space: {
    id: "open_space",
    name: "Open Space",
    pipeRecipe: {
      variants: [{ variant: "standard", weight: 1.0 }],
      movementTypes: [
        { type: "static", weight: 0.8 },
        { type: "oscillating", weight: 0.2, oscillationFrequency: 2.0, oscillationAmplitude: 30 },
      ],
      narrowGapProbability: 0.05,
    },
    configOverrides: {
      GAP_SIZE: 140,
      PIPE_SPAWN_INTERVAL: 2400,
    },
    theme: SCENARIO_THEMES.open_space,
    durationInPipes: 5,
    associatedSectorEvent: "none",
  },
  asteroid_belt: {
    id: "asteroid_belt",
    name: "Asteroid Belt",
    pipeRecipe: {
      variants: [
        { variant: "damaged", weight: 0.6 },
        { variant: "rusted", weight: 0.4 },
      ],
      movementTypes: [
        { type: "static", weight: 0.3 },
        { type: "oscillating", weight: 0.7, oscillationFrequency: 2.5, oscillationAmplitude: 45 },
      ],
      narrowGapProbability: 0.2,
    },
    configOverrides: {
      GAP_SIZE: 125,
      PIPE_SPAWN_INTERVAL: 2200,
    },
    theme: SCENARIO_THEMES.asteroid_belt,
    durationInPipes: 5,
    associatedSectorEvent: "asteroid_storm",
  },
  solar_storm: {
    id: "solar_storm",
    name: "Solar Storm",
    pipeRecipe: {
      variants: [
        { variant: "standard", weight: 0.5 },
        { variant: "damaged", weight: 0.5 },
      ],
      movementTypes: [
        { type: "laser_gate", weight: 0.6 },
        { type: "oscillating", weight: 0.4, oscillationFrequency: 3.0, oscillationAmplitude: 40 },
      ],
      narrowGapProbability: 0.15,
    },
    configOverrides: {
      GAP_SIZE: 135,
      PIPE_SPAWN_INTERVAL: 2000,
    },
    theme: SCENARIO_THEMES.solar_storm,
    durationInPipes: 5,
    associatedSectorEvent: "solar_flare",
  },
  warp_corridor: {
    id: "warp_corridor",
    name: "Warp Corridor",
    pipeRecipe: {
      variants: [
        { variant: "standard", weight: 0.8 },
        { variant: "rusted", weight: 0.2 },
      ],
      movementTypes: [
        { type: "static", weight: 0.2 },
        { type: "laser_gate", weight: 0.4 },
        { type: "oscillating", weight: 0.4, oscillationFrequency: 3.5, oscillationAmplitude: 50 },
      ],
      narrowGapProbability: 0.3,
    },
    configOverrides: {
      GAP_SIZE: 120,
      PIPE_SPAWN_INTERVAL: 1800,
    },
    theme: SCENARIO_THEMES.warp_corridor,
    durationInPipes: 5,
    associatedSectorEvent: "hyper_warp",
  },
};

export function getScenarioConfig(id: ScenarioId): ScenarioConfig {
  return SCENARIOS[id] ?? SCENARIOS.open_space;
}

export function sampleWeightedOption<T extends { weight: number }>(
  options: T[],
  randomFloatFn: () => number
): T {
  if (options.length === 0) {
    throw new Error("Cannot sample from an empty options list");
  }
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  if (totalWeight <= 0) return options[0];

  let roll = randomFloatFn() * totalWeight;
  for (const opt of options) {
    if (roll < opt.weight) {
      return opt;
    }
    roll -= opt.weight;
  }
  return options[options.length - 1];
}

export interface SampledPipeProps {
  visualVariant: "standard" | "damaged" | "rusted";
  movementType: "static" | "oscillating" | "laser_gate";
  oscillationSpeed?: number;
  oscillationAmplitude?: number;
  isNarrowGap: boolean;
}

export function samplePipeFromRecipe(
  recipe: PipeRecipe,
  random: RandomService
): SampledPipeProps {
  const variantOpt = sampleWeightedOption(recipe.variants, () => random.next());
  const moveOpt = sampleWeightedOption(recipe.movementTypes, () => random.next());
  const isNarrowGap = recipe.narrowGapProbability !== undefined
    ? random.next() < recipe.narrowGapProbability
    : false;

  return {
    visualVariant: variantOpt.variant,
    movementType: moveOpt.type,
    oscillationSpeed: moveOpt.oscillationFrequency,
    oscillationAmplitude: moveOpt.oscillationAmplitude,
    isNarrowGap,
  };
}
