import { World } from "@tiny-aster/core";
import { Entity } from "@tiny-aster/core";

export interface BulletPatternConfig {
  kind: "spread" | "ring" | "aimed" | "spiral";
  bulletCount: number;
  speed: number;
  ratePerSec: number;
  arcDegrees?: number;
}

export interface BulletPatternState { cooldownRemaining: number; phase: number; }

export function computeBulletPatternAngles(config: BulletPatternConfig, aimRadians: number, phase: number): number[] {
  const count = Math.max(1, Math.floor(config.bulletCount));
  if (config.kind === "ring") return Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count);
  if (config.kind === "spiral") return Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count + phase);
  const arc = ((config.arcDegrees ?? (count > 1 ? 45 : 0)) * Math.PI) / 180;
  if (config.kind === "aimed") return [aimRadians];
  if (count === 1) return [aimRadians];
  return Array.from({ length: count }, (_, i) => aimRadians - arc / 2 + (arc * i) / (count - 1));
}

export function tickBulletPattern(state: BulletPatternState, deltaTime: number, config: BulletPatternConfig): BulletPatternState {
  const cooldown = Math.max(0, state.cooldownRemaining - deltaTime);
  const phase = state.phase + deltaTime * config.ratePerSec * Math.PI * 2;
  return { cooldownRemaining: cooldown, phase };
}
