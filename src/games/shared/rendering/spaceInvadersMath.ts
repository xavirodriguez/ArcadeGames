import { colors } from "../../../theme/colors";
import type { Theme } from "@tiny-aster/core";
import { hexToRgba } from "./CosmicPalette";

/**
 * Pure math helpers for Space Invaders visual calculations.
 */

export function calculateShieldHpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1.0, hp / maxHp));
}

export interface ShieldCrackCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export function calculateShieldCrackCoords(entity: number, size: number): ShieldCrackCoords {
  const half = size / 2;
  const seed1 = (entity * 17) % size;
  const seed2 = (entity * 41) % size;
  const seed3 = (entity * 97) % size;
  return {
    x1: -half + seed1,
    y1: -half,
    x2: half - seed2,
    y2: half,
    x3: half,
    y3: -half + seed3,
    x4: -half,
    y4: half - seed3
  };
}

export interface BossPhaseState {
  phase: number;
  baseColor: string;
  accentColor: string;
  auraColor: string;
  healthBarColor: string;
  scaleMultiplier: number;
}

export function calculateBossPhase(hpRatio: number, theme?: Theme): BossPhaseState {
  let phaseIndex = 1;
  let defaultBaseColor: string = colors.gold;
  let defaultAccentColor: string = colors.cyan;
  let defaultAuraColor: string = hexToRgba(colors.gold, 0.25);
  let defaultScale = 1.0;

  if (hpRatio <= 0.33) {
    phaseIndex = 3;
    defaultBaseColor = colors.red;
    defaultAccentColor = colors.pink;
    defaultAuraColor = hexToRgba(colors.red, 0.7);
    defaultScale = 1.25;
  } else if (hpRatio <= 0.66) {
    phaseIndex = 2;
    defaultBaseColor = colors.gold;
    defaultAccentColor = colors.orange;
    defaultAuraColor = hexToRgba(colors.orange, 0.45);
    defaultScale = 1.2;
  }

  const phaseSpec = theme?.visualTheme?.phaseVisuals?.[phaseIndex];

  return {
    phase: phaseIndex,
    baseColor: phaseSpec?.color || defaultBaseColor,
    accentColor: phaseSpec?.accentColor || defaultAccentColor,
    auraColor: phaseSpec?.auraColor || defaultAuraColor,
    healthBarColor: phaseSpec?.color || defaultBaseColor,
    scaleMultiplier: defaultScale,
  };
}

export function calculateBossVibrato(phase: number, tick: number): { vibX: number; vibY: number } {
  let vibX = 0;
  let vibY = 0;
  if (phase === 2) {
    vibX = Math.sin(tick * 0.8) * 2.5;
    vibY = Math.cos(tick * 0.8) * 2.5;
  } else if (phase === 3) {
    vibX = Math.sin(tick * 1.5) * 5.0;
    vibY = Math.cos(tick * 1.5) * 5.0;
  }
  return { vibX, vibY };
}

export function calculateTeleporterShimmer(isTeleporter: boolean, tick: number): number {
  if (!isTeleporter) return 1.0;
  return 0.625 + 0.375 * Math.sin((tick / 36) * Math.PI * 2);
}

export function resolvePlayerRoleVisual(role?: string, theme?: Theme): { roleColor: string; shapeIcon: string; name: string } {
  const normRole = role || "pioneer";
  const roleSpec = theme?.visualTheme?.roleVisuals?.[normRole];
  const roleLabelOverride = theme?.conceptPack?.roleLabels?.[normRole];

  if (roleSpec) {
    return {
      roleColor: roleSpec.color || colors.green,
      shapeIcon: roleSpec.icon || "▓",
      name: roleLabelOverride || roleSpec.name || normRole.toUpperCase(),
    };
  }

  if (normRole === "hunter") return { roleColor: colors.pink, shapeIcon: "◆", name: roleLabelOverride || "HUNTER" };
  if (normRole === "sentinel") return { roleColor: colors.cyan, shapeIcon: "△", name: roleLabelOverride || "SENTINEL" };
  if (normRole === "support") return { roleColor: colors.gold, shapeIcon: "⬠", name: roleLabelOverride || "SUPPORT" };
  return { roleColor: colors.green, shapeIcon: "▓", name: roleLabelOverride || "PIONEER" };
}

export function calculateBulletProximity(world: { getComponent: (e: number, type: string) => unknown }, entity: number, isPlayerBullet: boolean): number {
  if (isPlayerBullet) return 0;
  const pos = world.getComponent(entity, "Transform") as { y: number } | undefined;
  const ttl = world.getComponent(entity, "TTL") as { remaining: number; timeLeft: number } | undefined;

  let distFactor = 0;
  if (pos) {
    distFactor = Math.max(0, Math.min(1.0, (pos.y - 300) / 220));
  }

  let ttlFactor = 0;
  if (ttl && ttl.timeLeft) {
    ttlFactor = Math.max(0, Math.min(1.0, 1.0 - (ttl.remaining / ttl.timeLeft)));
  }

  return Math.max(distFactor, ttlFactor);
}

export function calculateParticleHeatColor(colorStr: string, progress: number): string {
  if (colorStr === "white" || colorStr === colors.white) {
    if (progress < 0.2) return colors.white;
    if (progress < 0.45) return colors.yellow;
    if (progress < 0.7) return colors.orange;
    return colors.red;
  }
  return colorStr;
}
