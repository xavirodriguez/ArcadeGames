/**
 * Pure geometric and mathematical calculation functions shared across Canvas2D and Skia visual drawers.
 *
 * @remarks
 * Strict rules for this file:
 * - Pure calculations ONLY. No Canvas2D (CanvasRenderingContext2D) or Skia imports/dependencies.
 * - Deterministic inputs and outputs to preserve determinism and visual parity across backends.
 */

export interface StarfieldStar {
  x: number;
  y: number;
  size: number;
  layer: number; // 0 = distant white, 1 = near pale blue, 2 = deep titanium dust
  alpha: number;
}

/**
 * Initializes a deterministic starfield grid for parallax background rendering.
 */
export function generateStarfield(width: number, height: number): StarfieldStar[] {
  const stars: StarfieldStar[] = [];
  // Layer 2: Deepest micro titanium space dust (50 count)
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: (i * 29 + 17) % width,
      y: (i * 71 + 11) % height,
      size: 0.5 + (i % 2) * 0.3,
      layer: 2,
      alpha: 0.2 + (i % 3) * 0.08,
    });
  }
  // Layer 0: Distant slow white stars (60 count)
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: (i * 37 + 13) % width,
      y: (i * 83 + 29) % height,
      size: 0.8 + (i % 3) * 0.4,
      layer: 0,
      alpha: 0.4 + (i % 5) * 0.12,
    });
  }
  // Layer 1: Near faster pale white-blue stars (40 count)
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: (i * 53 + 7) % width,
      y: (i * 97 + 41) % height,
      size: 1.2 + (i % 3) * 0.6,
      layer: 1,
      alpha: 0.6 + (i % 4) * 0.1,
    });
  }
  return stars;
}

/**
 * Calculates squash and stretch scale factors based on vertical velocity.
 */
export function calculateSquashAndStretch(vy: number, maxStretch = 0.18, velocityRef = 900): { scaleX: number; scaleY: number } {
  const speed = Math.abs(vy);
  const stretch = Math.min(speed / velocityRef, maxStretch);
  if (vy > 0) {
    return { scaleX: 1 - stretch * 0.8, scaleY: 1 + stretch };
  } else {
    return { scaleX: 1 + stretch, scaleY: 1 - stretch * 0.8 };
  }
}

export interface MegastructureState {
  visible: boolean;
  megaX: number;
  megaY: number;
  beaconAlpha: number;
}

/**
 * Calculates parallax position and beacon pulse for background megastructures.
 */
export function calculateMegastructurePosition(
  tick: number,
  width: number,
  height: number,
  cycle = 1600
): MegastructureState {
  const megaProgress = (tick % cycle) / cycle;
  if (megaProgress < 0.6) {
    const megaX = width - (megaProgress / 0.6) * (width + 250);
    const megaY = height * 0.35;
    const beaconAlpha = 0.2 + 0.3 * Math.sin(tick * 0.05);
    return { visible: true, megaX, megaY, beaconAlpha };
  }
  return { visible: false, megaX: 0, megaY: 0, beaconAlpha: 0 };
}

export interface PipeGeometry {
  isTopPipe: boolean;
  pipeY: number;
  pipeHeight: number;
  capYOffset: number;
  beaconY: number;
}

/**
 * Calculates bounding dimensions and docking cap offsets for Flappy pipes.
 */
export function calculateFlappyPipeGeometry(
  posY: number,
  gapY: number,
  gapSize: number,
  screenHeight: number,
  capHeight = 28
): PipeGeometry {
  const halfGap = gapSize / 2;
  const isTopPipe = posY < gapY;

  let pipeY: number;
  let pipeHeight: number;

  if (isTopPipe) {
    pipeY = -posY;
    pipeHeight = gapY - halfGap;
  } else {
    pipeY = (gapY + halfGap) - posY;
    pipeHeight = screenHeight - (gapY + halfGap);
  }

  const capYOffset = isTopPipe ? (pipeY + pipeHeight - capHeight) : pipeY;
  const beaconY = isTopPipe ? (capYOffset + capHeight - 4) : (capYOffset + 4);

  return { isTopPipe, pipeY, pipeHeight, capYOffset, beaconY };
}
