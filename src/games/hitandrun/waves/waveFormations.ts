import type { WaveFormation } from "./HitRunWaveTypes";

export interface SpawnSlot {
  x: number;
  y: number;
}

/**
 * Calcula posiciones de un grupo de forma determinista (sin random).
 * Para scatter, el jitter usa un hash del índice (reproducible).
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
      // Fila horizontal compacta centrada en baseX
      const startX = baseX - ((n - 1) * spacing) * 0.5;
      for (let i = 0; i < n; i++) {
        slots.push({ x: startX + i * spacing, y: baseY });
      }
      break;
    }
    case "column": {
      for (let i = 0; i < n; i++) {
        slots.push({ x: baseX, y: baseY - i * spacing });
      }
      break;
    }
    case "scatter": {
      // Rejilla ~sqrt(n) con jitter determinista por índice
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jx = deterministicJitter(i, 0) * spacing * 0.35;
        const jy = deterministicJitter(i, 1) * spacing * 0.35;
        slots.push({
          x: baseX + (col - (cols - 1) * 0.5) * spacing + jx,
          y: baseY - row * spacing + jy
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
  // LCG simple sobre (index, channel)
  let h = (index + 1) * 374761393 + (channel + 1) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  // Map to [-1, 1]
  return ((h & 0xffff) / 0xffff) * 2 - 1;
}
