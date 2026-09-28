import { RandomService } from "@tiny-aster/core";
import { ScenarioConfig, PipeRecipe, PipeVariantOption, PipeMovementOption } from "./types/ScenarioConfig";
import { ScenarioId } from "./types/FlappyBirdTypes";
import { FlappyBirdConfig } from "./types/FlappyBirdConfigSchema";

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
    theme: {
      nebulae: [
        { xRatio: 0.25, yRatio: 0.3, radius: 180, colorHex: "#2A0044" },
        { xRatio: 0.75, yRatio: 0.65, radius: 210, colorHex: "#002838" },
        { xRatio: 0.5, yRatio: 0.45, radius: 150, colorHex: "#1C0033" },
      ],
      megaIndex: 0,
      palette: {
        textColor: "#00F3FF",
        bannerBg: "rgba(0, 243, 255, 0.15)",
        primaryGlow: "#00F3FF",
      },
    },
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
    theme: {
      nebulae: [
        { xRatio: 0.2, yRatio: 0.4, radius: 220, colorHex: "#3A1C08" },
        { xRatio: 0.8, yRatio: 0.3, radius: 190, colorHex: "#221008" },
        { xRatio: 0.5, yRatio: 0.7, radius: 170, colorHex: "#482612" },
      ],
      megaIndex: 1,
      palette: {
        textColor: "#D3D9E2",
        bannerBg: "rgba(211, 217, 226, 0.15)",
        primaryGlow: "#8B93A5",
      },
    },
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
    theme: {
      nebulae: [
        { xRatio: 0.3, yRatio: 0.2, radius: 200, colorHex: "#441C00" },
        { xRatio: 0.7, yRatio: 0.5, radius: 230, colorHex: "#330800" },
        { xRatio: 0.4, yRatio: 0.8, radius: 160, colorHex: "#552800" },
      ],
      megaIndex: 2,
      palette: {
        textColor: "#FFC000",
        bannerBg: "rgba(255, 192, 0, 0.15)",
        primaryGlow: "#FF3300",
      },
    },
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
    theme: {
      nebulae: [
        { xRatio: 0.15, yRatio: 0.5, radius: 240, colorHex: "#001A44" },
        { xRatio: 0.85, yRatio: 0.4, radius: 200, colorHex: "#003366" },
        { xRatio: 0.5, yRatio: 0.2, radius: 180, colorHex: "#000D22" },
      ],
      megaIndex: 3,
      palette: {
        textColor: "#00F3FF",
        bannerBg: "rgba(0, 243, 255, 0.2)",
        primaryGlow: "#00F3FF",
      },
    },
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
