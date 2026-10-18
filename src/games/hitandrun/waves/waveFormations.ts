import type { WaveFormation } from "./HitRunWaveTypes";

export interface SpawnSlot {
  x: number;
  y: number;
}

/** Depth-lane spacing (Transform.y) for multi-lane walls. */
const DEPTH_LANE_SPACING = 28;

/**
 * Calcula posiciones de un grupo de forma determinista (sin random).
 * Para scatter, el jitter usa un hash del índice (reproducible).
 * Y = profundidad en el belt (no altura de plataforma).
 */
export function computeFormationSlots(
  formation: WaveFormation,
  count: number,
  baseX: number,
  baseY: number,
  spacing: number
): SpawnSlot[] {
  const slots: SpawnSlot[] = [];
  const n = Math.max(1, count);

  switch (formation) {
    case "point": {
      for (let i = 0; i < n; i++) {
        slots.push({ x: baseX, y: baseY });
      }
      break;
    }
    case "line":
    case "wall":
    case "drop": {
      // Horizontal X + alternate depth lanes so the wall occupies multiple Y lanes
      const startX = baseX - ((n - 1) * spacing) * 0.5;
      const laneCount = Math.min(3, Math.max(1, Math.ceil(n / 2)));
      for (let i = 0; i < n; i++) {
        const lane = i % laneCount;
        const laneOffset = (lane - (laneCount - 1) * 0.5) * DEPTH_LANE_SPACING;
        slots.push({
          x: startX + i * spacing,
          y: baseY + laneOffset
        });
      }
      break;
    }
    case "column": {
      // Pure depth column (same X, staggered Y)
      for (let i = 0; i < n; i++) {
        slots.push({
          x: baseX,
          y: baseY + (i - (n - 1) * 0.5) * Math.max(spacing, DEPTH_LANE_SPACING)
        });
      }
      break;
    }
    case "scatter": {
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jx = deterministicJitter(i, 0) * spacing * 0.35;
        const jy = deterministicJitter(i, 1) * DEPTH_LANE_SPACING * 0.8;
        slots.push({
          x: baseX + (col - (cols - 1) * 0.5) * spacing + jx,
          y: baseY + (row - 0.5) * DEPTH_LANE_SPACING + jy
        });
      }
      break;
    }
    default: {
      slots.push({ x: baseX, y: baseY });
    }
  }

  return slots;
}

/** Jitter en [-1, 1] estable a partir de índice (sin Math.random). */
function deterministicJitter(index: number, channel: number): number {
  let h = (index + 1) * 374761393 + (channel + 1) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h & 0xffff) / 0xffff) * 2 - 1;
}
