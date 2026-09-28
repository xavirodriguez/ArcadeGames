import { FlappyBirdConfig } from "./FlappyBirdConfigSchema";
import { ScenarioId } from "./FlappyBirdTypes";
import { NebulaData } from "../rendering/FlappyBirdBackgroundData";

export interface PipeMovementOption {
  type: "static" | "oscillating" | "laser_gate";
  weight: number;
  oscillationFrequency?: number;
  oscillationAmplitude?: number;
}

export interface PipeVariantOption {
  variant: "standard" | "damaged" | "rusted";
  weight: number;
}

export interface PipeRecipe {
  variants: PipeVariantOption[];
  movementTypes: PipeMovementOption[];
  narrowGapProbability?: number;
}

export interface ScenarioTheme {
  nebulae: NebulaData[];
  megaIndex: number;
  palette?: {
    textColor?: string;
    bannerBg?: string;
    primaryGlow?: string;
  };
}

export interface ScenarioConfigOverrides extends Partial<FlappyBirdConfig> {
  pipeSpeedMultiplier?: number;
}

export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  pipeRecipe: PipeRecipe;
  configOverrides?: ScenarioConfigOverrides;
  theme: ScenarioTheme;
  durationInPipes: number;
  associatedSectorEvent?: "none" | "solar_flare" | "asteroid_storm" | "hyper_warp";
}
