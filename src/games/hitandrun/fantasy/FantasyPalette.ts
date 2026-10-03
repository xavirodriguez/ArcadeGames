/**
 * Fantasy aesthetic for the belt-scroll conversion of Hit&Run.
 * Warm stone, moss, blood, arcane purple, gold accents.
 */

export const FANTASY_PALETTE = {
  // Backgrounds
  skyDusk: "#1a1428",
  skyMid: "#2d1f3d",
  ground: "#2a2118",
  groundHighlight: "#3d3226",
  mist: "rgba(120, 140, 160, 0.15)",

  // Player (hero / ranger-knight)
  playerBody: "#c4a574",
  playerArmor: "#4a5568",
  playerCape: "#2b6cb0",
  playerAccent: "#e2c08d",
  playerHair: "#1a202c",

  // Allies / NPCs
  ally: "#68d391",

  // Enemies
  goblin: "#5b8c3e",
  goblinDark: "#3d5c29",
  skeleton: "#d4cfc4",
  skeletonDark: "#9a958c",
  orc: "#4a7c3f",
  orcArmor: "#3f3f46",
  wraith: "#7c3aed",
  wraithCore: "#c4b5fd",
  boss: "#b91c1c",
  bossGold: "#d4a017",

  // Combat FX
  hitFlash: "#fef3c7",
  blood: "#9b1c1c",
  arcane: "#8b5cf6",
  arcaneBright: "#ddd6fe",
  fire: "#ea580c",
  ice: "#67e8f9",

  // UI / HUD
  uiGold: "#eab308",
  uiHealth: "#dc2626",
  uiMana: "#3b82f6",
  uiPanel: "rgba(15, 10, 20, 0.85)",

  // Projectiles (fantasy weapons)
  arrow: "#a8a29e",
  bolt: "#fbbf24",
  fireball: "#f97316",
  iceShard: "#22d3ee"
} as const;

export type FantasyPaletteKey = keyof typeof FANTASY_PALETTE;
