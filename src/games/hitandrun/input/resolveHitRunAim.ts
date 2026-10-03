/**
 * Resolve 8-way aim from move + aimUp/aimDown.
 * - Only left → (-1, 0)
 * - Only up → (0, -1)
 * - Up+left → normalized 45° (-√2/2, -√2/2)
 * - No aim keys → last facing on X, Y=0
 */

const DIAG = Math.SQRT1_2; // ≈ 0.707

export interface AimAxes {
  aimX: number;
  aimY: number;
}

export function resolveHitRunAim(opts: {
  moveLeft: boolean;
  moveRight: boolean;
  aimUp: boolean;
  aimDown: boolean;
  /** Fallback when no direction keys (usually transform.scaleX). */
  lastFacingX?: number;
}): AimAxes {
  let x = 0;
  let y = 0;

  if (opts.moveLeft && !opts.moveRight) x = -1;
  else if (opts.moveRight && !opts.moveLeft) x = 1;

  if (opts.aimUp && !opts.aimDown) y = -1;
  else if (opts.aimDown && !opts.aimUp) y = 1;

  // No horizontal from move: pure vertical aims stay (0, ±1)
  // No vertical: pure horizontal
  // Both: 45° diagonal
  if (x !== 0 && y !== 0) {
    return { aimX: x * DIAG, aimY: y * DIAG };
  }

  if (x === 0 && y === 0) {
    const face = (opts.lastFacingX ?? 1) >= 0 ? 1 : -1;
    return { aimX: face, aimY: 0 };
  }

  return { aimX: x, aimY: y };
}
