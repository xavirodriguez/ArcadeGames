import { colors } from "../../../theme/colors";

/**
 * Pure math helpers for Space Invaders visual calculations.
 */

export function calculateShieldHpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1.0, hp / maxHp));
}

export interface BossPhaseState {
  phase: number;
  baseColor: string;
  accentColor: string;
  auraColor: string;
  healthBarColor: string;
  scaleMultiplier: number;
}

export function calculateBossPhase(hpRatio: number): BossPhaseState {
  if (hpRatio <= 0.33) {
    return {
      phase: 3,
      baseColor: "#FF4444",
      accentColor: "#FF0055",
      auraColor: "rgba(255, 68, 68, 0.7)",
      healthBarColor: "#FF4444",
      scaleMultiplier: 1.25
    };
  } else if (hpRatio <= 0.66) {
    return {
      phase: 2,
      baseColor: colors.gold,
      accentColor: "#F97316",
      auraColor: "rgba(249, 115, 22, 0.45)",
      healthBarColor: "#F97316",
      scaleMultiplier: 1.2
    };
  } else {
    return {
      phase: 1,
      baseColor: colors.gold,
      accentColor: colors.cyan,
      auraColor: "rgba(255, 215, 0, 0.25)",
      healthBarColor: colors.gold,
      scaleMultiplier: 1.0
    };
  }
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

export function resolvePlayerRoleVisual(role?: string): { roleColor: string; shapeIcon: string; name: string } {
  if (role === "hunter") return { roleColor: "#FF006E", shapeIcon: "◆", name: "HUNTER" };
  if (role === "sentinel") return { roleColor: "#00D9FF", shapeIcon: "△", name: "SENTINEL" };
  if (role === "support") return { roleColor: "#FFD700", shapeIcon: "⬠", name: "SUPPORT" };
  return { roleColor: colors.green, shapeIcon: "▓", name: "PIONEER" };
}
