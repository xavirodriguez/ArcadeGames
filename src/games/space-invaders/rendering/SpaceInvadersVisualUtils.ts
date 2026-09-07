import { RenderComponent, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { resolveHitFlash, HitFlashState } from "../../shared/rendering/RenderUtils";

export type { HitFlashState };

/**
 * Calculates hit flash presentation properties (color and opacity) for an entity.
 * Shared between Canvas2D and Skia renderers to maintain functional visual parity.
 */
export function applyHitFlash(
  render: RenderComponent | undefined,
  baseColor: string,
  baseOpacity: number = 1.0
): HitFlashState {
  return resolveHitFlash(render, baseColor, baseOpacity);
}

/**
 * Safely extracts shooting state from the typed InputComponent of an entity.
 */
export function isPlayerShooting(world: World<SpaceInvadersComponentRegistry>, entity: number): boolean {
  const input = world.getComponent(entity, "Input");
  return Boolean(input && input.shoot);
}

/**
 * Calculates dynamic player tilt in radians based on horizontal velocity.
 *
 * @remarks
 * **Architecture Note on Juice vs Physics Derivation:**
 * Continuous motion derivatives like velocity-based leaning (tilt) and high-frequency thruster
 * plume harmonic flickering are derived deterministically from simulation state (`VelocityComponent`
 * and `world.tick`). In contrast, `JuiceSystem` manages discrete transient visual animations
 * (squash, stretch, scale pop, hit flash, and screen shake).
 */
export function calculatePlayerTilt(vx: number, maxTilt = 0.15): number {
  const targetTilt = vx * 0.0004;
  return Math.max(-maxTilt, Math.min(maxTilt, targetTilt));
}

/**
 * Calculates dual-stage thruster plume length based on tick and size.
 */
export function calculateThrusterPlumeLength(tick: number, size: number): number {
  const flicker = 1.0 + 0.18 * Math.sin(tick / 2);
  return (size / 2.2) * flicker;
}
