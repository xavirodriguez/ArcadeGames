/**
 * Solar Garden Visual Debug Mode Toggles.
 * Allows runtime comparison (BEFORE vs AFTER) and feature isolation.
 */

export interface SolarGardenDebugConfig {
  solarPalette: boolean;
  bulletShell: boolean;
  enemyGlow: boolean;
  hitFlash: boolean;
  deathFracture: boolean;
  particles: boolean;
  parallax: boolean;
  bossEffects: boolean;
}

export const SOLAR_GARDEN_DEBUG_FLAGS: SolarGardenDebugConfig = {
  solarPalette: true,
  bulletShell: true,
  enemyGlow: true,
  hitFlash: true,
  deathFracture: true,
  particles: true,
  parallax: true,
  bossEffects: true,
};

export function setSolarGardenDebugFlag<K extends keyof SolarGardenDebugConfig>(
  flag: K,
  value: boolean
): void {
  SOLAR_GARDEN_DEBUG_FLAGS[flag] = value;
}

export function resetSolarGardenDebugFlags(): void {
  SOLAR_GARDEN_DEBUG_FLAGS.solarPalette = true;
  SOLAR_GARDEN_DEBUG_FLAGS.bulletShell = true;
  SOLAR_GARDEN_DEBUG_FLAGS.enemyGlow = true;
  SOLAR_GARDEN_DEBUG_FLAGS.hitFlash = true;
  SOLAR_GARDEN_DEBUG_FLAGS.deathFracture = true;
  SOLAR_GARDEN_DEBUG_FLAGS.particles = true;
  SOLAR_GARDEN_DEBUG_FLAGS.parallax = true;
  SOLAR_GARDEN_DEBUG_FLAGS.bossEffects = true;
}
