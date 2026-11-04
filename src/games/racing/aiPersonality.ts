import type { AIPersonalityComponent, AIPersonalityPreset } from "./types/RacingTypes";

/** Factory for the three difficulty presets. */
export function createAIPersonality(
  preset: AIPersonalityPreset = "normal"
): AIPersonalityComponent {
  switch (preset) {
    case "easy":
      return {
        type: "AIPersonality",
        laneOffset: -28,
        aggression: 0.35,
        noiseAmplitude: 0.18,
        boostMultiplier: 1.12,
        nerfMultiplier: 0.92,
        minPositiveThrottle: 0.22,
        boostDistance: 2.5,
        nerfDistance: 3.5
      };
    case "hard":
      return {
        type: "AIPersonality",
        laneOffset: 22,
        aggression: 0.85,
        noiseAmplitude: 0.04,
        boostMultiplier: 1.35,
        nerfMultiplier: 0.72,
        minPositiveThrottle: 0.45,
        boostDistance: 1.4,
        nerfDistance: 2.2
      };
    case "normal":
    default:
      return {
        type: "AIPersonality",
        laneOffset: 8,
        aggression: 0.55,
        noiseAmplitude: 0.09,
        boostMultiplier: 1.22,
        nerfMultiplier: 0.85,
        minPositiveThrottle: 0.35,
        boostDistance: 2.0,
        nerfDistance: 3.0
      };
  }
}

export const AI_PERSONALITY_PRESETS: readonly AIPersonalityPreset[] = [
  "easy",
  "normal",
  "hard"
] as const;
