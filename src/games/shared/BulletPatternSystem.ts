import { World } from "@tiny-aster/core";
import { Entity } from "@tiny-aster/core";

export interface BulletPatternConfig {
  kind: "spread" | "ring" | "aimed" | "spiral";
  bulletCount: number;
  speed: number;
  ratePerSec: number;
  arcDegrees?: number;
  /**
   * Angular advance applied once per emitted volley (radians).
   * Only `spiral` consumes it. When omitted, a spiral advances one bullet slot
   * (`2π / bulletCount`) per volley so the pattern never depends on frame time.
   */
  spinPerShot?: number;
}

export interface BulletPatternState { cooldownRemaining: number; phase: number; }

/** Default spiral rotation per volley: one bullet slot. */
export function resolveSpinPerShot(config: BulletPatternConfig): number {
  if (config.spinPerShot !== undefined) return config.spinPerShot;
  return (Math.PI * 2) / Math.max(1, Math.floor(config.bulletCount));
}

/**
 * Advances the pattern orientation for the next volley.
 * The phase depends only on how many volleys were emitted, never on elapsed time.
 */
export function advanceBulletPatternPhase(phase: number, config: BulletPatternConfig): number {
  if (config.kind !== "spiral") return phase;
  return phase + resolveSpinPerShot(config);
}

export function computeBulletPatternAngles(config: BulletPatternConfig, aimRadians: number, phase: number): number[] {
  const count = Math.max(1, Math.floor(config.bulletCount));
  if (config.kind === "ring") return Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count);
  if (config.kind === "spiral") return Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count + phase);
  const arc = ((config.arcDegrees ?? (count > 1 ? 45 : 0)) * Math.PI) / 180;
  if (config.kind === "aimed") return [aimRadians];
  if (count === 1) return [aimRadians];
  return Array.from({ length: count }, (_, i) => aimRadians - arc / 2 + (arc * i) / (count - 1));
}

/**
 * Ticks a bullet pattern cooldown.
 *
 * Orientation is intentionally untouched: `phase` advances once per emitted
 * volley via `advanceBulletPatternPhase`, so a different `deltaTime` (or a
 * different simulation frequency) cannot add extra revolutions between shots.
 */
export function tickBulletPattern(
  state: BulletPatternState,
  deltaTime: number,
  _config: BulletPatternConfig
): BulletPatternState {
  const cooldown = Math.max(0, state.cooldownRemaining - deltaTime);
  return { cooldownRemaining: cooldown, phase: state.phase };
}
