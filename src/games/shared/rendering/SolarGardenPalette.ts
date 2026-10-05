/**
 * Central design tokens for the Bio-Mechanical Solarpunk — "Solar Garden" Visual Identity.
 * Shared across Echo Runner and Vertical Shmup.
 */
export const SOLAR_GARDEN_PALETTE = {
  // Civilization Tokens (Solar Garden)
  solarWhite: '#F0F4F8',     // Ceramic porcelain architecture / Player chassis
  solarGold: '#E6B800',      // Solar energy / Trim / Purification light
  solarGoldGlow: 'rgba(230, 184, 0, 0.6)',
  solarCyan: '#00E5FF',      // Controlled energy / Restoration core / Player actions
  solarCyanGlow: 'rgba(0, 229, 255, 0.6)',
  gardenGreen: '#3D5A45',    // Synthetic vegetation / Uncorrupted flora
  gardenGreenLight: '#527A5E',

  // Biomechanical Invasion Tokens (Corruption)
  bioBlack: '#1C2026',       // Biomechanical chitin / Organic matrix frame
  bioMagenta: '#FF007F',     // Active biology / Corruption infection / Organs
  bioMagentaGlow: 'rgba(255, 0, 127, 0.6)',
  bioAcid: '#39FF14',        // Deep mutation / Infected core / Toxic sap
  bioAcidGlow: 'rgba(57, 255, 20, 0.6)',

  // Gameplay Threat Tokens
  threatOrange: '#FF3B00',   // Hostile enemy projectiles / Threat indicators
  threatOrangeGlow: 'rgba(255, 59, 0, 0.7)',

  // Neutral & Atmosphere
  skyDawn: '#0D1B2A',        // Atmospheric background void
  skyMid: '#1B263B',         // Mid-distance sky gradient
  glassPanel: 'rgba(240, 244, 248, 0.12)',
  glassBorder: 'rgba(0, 229, 255, 0.3)',
} as const;

export type SolarGardenColorKey = keyof typeof SOLAR_GARDEN_PALETTE;
