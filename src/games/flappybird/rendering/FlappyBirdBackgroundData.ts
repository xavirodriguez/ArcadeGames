import { World } from "@tiny-aster/core";
import { ScenarioId } from "../types/FlappyBirdTypes";

/**
 * Shared data structures and pure calculations for Flappy Bird background rendering across Canvas and Skia.
 */

export interface MegastructureData {
  visible: boolean;
  megaIndex: number;
  megaX: number;
  megaY: number;
  beaconAlpha: number;
  structureOpacity: number;
}

/**
 * Calculates warp factor based on combo multiplier in world.
 */
export function calculateWarpFactor(world: World<any>): number {
  const comboEntities = world.query("Combo");
  if (comboEntities.length > 0) {
    const combo = world.getComponent(comboEntities[0], "Combo");
    if (combo && combo.multiplier > 1) {
      return 1.0 + (combo.multiplier - 1) * 0.35;
    }
  }
  return 1.0;
}

/**
 * Calculates megastructure visibility, index (0..7 for designs), position, and beacon pulse.
 */
export function calculateMegastructureData(
  tick: number,
  width: number,
  height: number,
  cycle = 1600,
  megaIndexOverride?: number
): MegastructureData {
  const megaProgress = (tick % cycle) / cycle;
  const megaIndex = megaIndexOverride !== undefined
    ? Math.abs(megaIndexOverride) % 8
    : Math.floor(tick / cycle) % 8;

  if (megaProgress < 0.6) {
    const megaX = width - (megaProgress / 0.6) * (width + 250);
    const megaY = height * 0.35;
    const beaconAlpha = 0.2 + 0.3 * Math.sin(tick * 0.05);

    // Smooth fade in during first 10% of cycle, full opacity until 50%, fade out by 60%
    let structureOpacity = 1.0;
    if (megaProgress < 0.1) {
      structureOpacity = megaProgress / 0.1;
    } else if (megaProgress > 0.5) {
      structureOpacity = (0.6 - megaProgress) / 0.1;
    }
    structureOpacity = Math.max(0, Math.min(1.0, structureOpacity));

    return { visible: true, megaIndex, megaX, megaY, beaconAlpha, structureOpacity };
  }
  return { visible: false, megaIndex: 0, megaX: 0, megaY: 0, beaconAlpha: 0, structureOpacity: 0 };
}

/**
 * Calculates non-linear flickering intensity for hazard stripes on station ground.
 */
export function calculateGroundHazardFlicker(tick: number): number {
  const val = 0.75 + 0.25 * Math.sin(tick * 0.1) * Math.cos(tick * 0.23 + 1.2) + 0.1 * Math.sin(tick * 0.07);
  return Math.max(0.3, Math.min(1.0, val));
}

/**
 * Calculates transition flash/flicker intensity for scenario switching.
 */
export function calculateScenarioTransitionOverlay(transitionTicks: number, maxTicks = 30): number {
  if (transitionTicks <= 0) return 0;
  const progress = transitionTicks / maxTicks;
  const flicker = 0.5 + 0.5 * Math.sin(transitionTicks * 0.8);
  return Math.min(1.0, progress * flicker);
}

/**
 * Nebulae configuration parameters.
 */
export interface NebulaData {
  xRatio: number;
  yRatio: number;
  radius: number;
  colorHex: string;
}

export const BACKGROUND_NEBULAE: NebulaData[] = [
  { xRatio: 0.25, yRatio: 0.3, radius: 180, colorHex: "#2A0044" },
  { xRatio: 0.75, yRatio: 0.65, radius: 210, colorHex: "#002838" },
  { xRatio: 0.5, yRatio: 0.45, radius: 150, colorHex: "#1C0033" },
];

export interface ScenarioThemeData {
  nebulae: NebulaData[];
  megaIndex: number;
  palette?: {
    textColor?: string;
    bannerBg?: string;
    primaryGlow?: string;
  };
}

export const SCENARIO_THEMES: Record<ScenarioId, ScenarioThemeData> = {
  open_space: {
    nebulae: [
      { xRatio: 0.25, yRatio: 0.3, radius: 180, colorHex: "#2A0044" },
      { xRatio: 0.75, yRatio: 0.65, radius: 210, colorHex: "#002838" },
      { xRatio: 0.5, yRatio: 0.45, radius: 150, colorHex: "#1C0033" },
    ],
    megaIndex: 0,
    palette: { textColor: "#00F3FF", bannerBg: "rgba(0, 243, 255, 0.15)", primaryGlow: "#00F3FF" }
  },
  asteroid_belt: {
    nebulae: [
      { xRatio: 0.2, yRatio: 0.4, radius: 220, colorHex: "#3A1C08" },
      { xRatio: 0.8, yRatio: 0.3, radius: 190, colorHex: "#221008" },
      { xRatio: 0.5, yRatio: 0.7, radius: 170, colorHex: "#482612" },
    ],
    megaIndex: 1,
    palette: { textColor: "#D3D9E2", bannerBg: "rgba(211, 217, 226, 0.15)", primaryGlow: "#8B93A5" }
  },
  solar_storm: {
    nebulae: [
      { xRatio: 0.3, yRatio: 0.2, radius: 200, colorHex: "#441C00" },
      { xRatio: 0.7, yRatio: 0.5, radius: 230, colorHex: "#330800" },
      { xRatio: 0.4, yRatio: 0.8, radius: 160, colorHex: "#552800" },
    ],
    megaIndex: 2,
    palette: { textColor: "#FFC000", bannerBg: "rgba(255, 192, 0, 0.15)", primaryGlow: "#FF3300" }
  },
  warp_corridor: {
    nebulae: [
      { xRatio: 0.15, yRatio: 0.5, radius: 240, colorHex: "#001A44" },
      { xRatio: 0.85, yRatio: 0.4, radius: 200, colorHex: "#003366" },
      { xRatio: 0.5, yRatio: 0.2, radius: 180, colorHex: "#000D22" },
    ],
    megaIndex: 3,
    palette: { textColor: "#00F3FF", bannerBg: "rgba(0, 243, 255, 0.2)", primaryGlow: "#00F3FF" }
  }
};

export function getThemeForScenario(id?: ScenarioId): ScenarioThemeData {
  if (!id || !SCENARIO_THEMES[id]) {
    return SCENARIO_THEMES.open_space;
  }
  return SCENARIO_THEMES[id];
}
