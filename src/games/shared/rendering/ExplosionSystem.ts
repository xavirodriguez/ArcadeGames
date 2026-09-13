import { COSMIC_ARCADE_PALETTE } from "./CosmicPalette";

export type ExplosionType = "small" | "enemy" | "alien" | "tech" | "boss";

export interface ExplosionProfile {
  type: ExplosionType;
  colorSequence: readonly string[];
  maxRadius: number;
  particleCount: number;
  durationMs: number;
  hasShockwave: boolean;
  hasConcentricRings: boolean;
  residualGlow: boolean;
}

export const EXPLOSION_PROFILES: Record<ExplosionType, ExplosionProfile> = {
  small: {
    type: "small",
    colorSequence: [
      COSMIC_ARCADE_PALETTE.white,
      COSMIC_ARCADE_PALETTE.plasmaYellow,
      COSMIC_ARCADE_PALETTE.solarOrange
    ],
    maxRadius: 20,
    particleCount: 8,
    durationMs: 300,
    hasShockwave: false,
    hasConcentricRings: false,
    residualGlow: false
  },
  enemy: {
    type: "enemy",
    colorSequence: [
      COSMIC_ARCADE_PALETTE.white,
      COSMIC_ARCADE_PALETTE.plasmaYellow,
      COSMIC_ARCADE_PALETTE.solarOrange,
      COSMIC_ARCADE_PALETTE.dangerRed
    ],
    maxRadius: 40,
    particleCount: 16,
    durationMs: 450,
    hasShockwave: true,
    hasConcentricRings: false,
    residualGlow: true
  },
  alien: {
    type: "alien",
    colorSequence: [
      COSMIC_ARCADE_PALETTE.white,
      COSMIC_ARCADE_PALETTE.neonMagenta,
      COSMIC_ARCADE_PALETTE.nebulaPurple,
      COSMIC_ARCADE_PALETTE.electricIndigo
    ],
    maxRadius: 45,
    particleCount: 20,
    durationMs: 500,
    hasShockwave: true,
    hasConcentricRings: false,
    residualGlow: true
  },
  tech: {
    type: "tech",
    colorSequence: [
      COSMIC_ARCADE_PALETTE.white,
      COSMIC_ARCADE_PALETTE.neonCyan,
      COSMIC_ARCADE_PALETTE.iceBlue,
      COSMIC_ARCADE_PALETTE.electricIndigo
    ],
    maxRadius: 38,
    particleCount: 18,
    durationMs: 450,
    hasShockwave: true,
    hasConcentricRings: true,
    residualGlow: true
  },
  boss: {
    type: "boss",
    colorSequence: [
      COSMIC_ARCADE_PALETTE.white,
      COSMIC_ARCADE_PALETTE.plasmaYellow,
      COSMIC_ARCADE_PALETTE.solarOrange,
      COSMIC_ARCADE_PALETTE.neonMagenta,
      COSMIC_ARCADE_PALETTE.dangerRed
    ],
    maxRadius: 90,
    particleCount: 40,
    durationMs: 800,
    hasShockwave: true,
    hasConcentricRings: true,
    residualGlow: true
  }
};

/**
 * Calculates the active color, expansion radius, and ring properties based on time progress (0.0 to 1.0).
 */
export function computeExplosionState(
  type: ExplosionType,
  progress: number
): {
  currentColor: string;
  coreRadius: number;
  shockwaveRadius: number;
  shockwaveAlpha: number;
  flashAlpha: number;
} {
  const profile = EXPLOSION_PROFILES[type];
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Color selection based on progress
  const seq = profile.colorSequence;
  const colorIndex = Math.min(
    seq.length - 1,
    Math.floor(clampedProgress * seq.length)
  );
  const currentColor = seq[colorIndex];

  // Radial expansion curve
  const coreRadius = profile.maxRadius * Math.sin(clampedProgress * Math.PI * 0.5);
  const shockwaveRadius = profile.hasShockwave ? profile.maxRadius * 1.4 * clampedProgress : 0;
  const shockwaveAlpha = profile.hasShockwave ? Math.max(0, 1.0 - clampedProgress * 1.2) : 0;

  // Flash alpha (brief white flash at 0-10% duration)
  const flashAlpha = clampedProgress < 0.1 ? (0.1 - clampedProgress) / 0.1 : 0;

  return {
    currentColor,
    coreRadius,
    shockwaveRadius,
    shockwaveAlpha,
    flashAlpha
  };
}
