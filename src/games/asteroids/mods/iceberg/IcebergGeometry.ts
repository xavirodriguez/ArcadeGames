/**
 * Deterministic pure geometry generators used by Borealis' gameplay/presentation adapter.
 *
 * These functions do not mutate the World. Randomness is injected by the caller so
 * replay and multiplayer remain reproducible with the appropriate random stream.
 *
 * @public
 */

export type IcebergSize = "large" | "medium" | "small";

export interface IcebergVertex {
  x: number;
  y: number;
}

/** Vertex counts by mass tier (ART_ICEBERG.md §4.B). */
const VERT_COUNT: Record<IcebergSize, { min: number; max: number }> = {
  large: { min: 8, max: 12 },
  medium: { min: 6, max: 8 },
  small: { min: 3, max: 4 }
};

/** Radial jitter amplitude by tier (fraction of radius). */
const JITTER: Record<IcebergSize, number> = {
  large: 0.28,
  medium: 0.22,
  small: 0.12
};

/**
 * Builds a faceted iceberg polygon centered at origin.
 * More angular / crystalline than the classic jagged rock silhouette.
 */
export function createIcebergVerts(
  size: IcebergSize,
  radius: number,
  random: () => number
): IcebergVertex[] {
  const { min, max } = VERT_COUNT[size];
  const count = min + Math.floor(random() * (max - min + 1));
  const jitter = JITTER[size];
  const verts: IcebergVertex[] = [];

  // Slight global rotation so instances don't share the same flat edge angle.
  const phase = random() * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    // Uneven angular steps → crystalline asymmetry
    const t = i / count;
    const angleJitter = (random() - 0.5) * (Math.PI * 2) / count * 0.55;
    const angle = phase + t * Math.PI * 2 + angleJitter;
    const r = radius * (1 - jitter + random() * jitter * 2);
    verts.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r
    });
  }

  return verts;
}

/**
 * Normalized icebreaker hull silhouette (radius ≈ 1).
 * Oriented with bow toward +X (matches SHIP_FORWARD_AXIS convention).
 *
 * Layout (top-down):
 * - Double-wedge bow (reinforced prow)
 * - Narrow waist / bridge block
 * - Truncated stern for thermal wake attachment
 */
export const ICEBREAKER_HULL_VERTS: ReadonlyArray<IcebergVertex> = [
  { x: 1.0, y: 0.0 }, // bow tip
  { x: 0.45, y: 0.55 }, // starboard shoulder
  { x: -0.15, y: 0.48 }, // starboard mid
  { x: -0.55, y: 0.38 }, // starboard stern quarter
  { x: -0.75, y: 0.22 }, // stern SB
  { x: -0.75, y: -0.22 }, // stern PS
  { x: -0.55, y: -0.38 }, // port stern quarter
  { x: -0.15, y: -0.48 }, // port mid
  { x: 0.45, y: -0.55 } // port shoulder
];

/** Bridge / deck polygon (drawn on top of hull), normalized. */
export const ICEBREAKER_DECK_VERTS: ReadonlyArray<IcebergVertex> = [
  { x: 0.15, y: 0.18 },
  { x: -0.35, y: 0.18 },
  { x: -0.35, y: -0.18 },
  { x: 0.15, y: -0.18 }
];

/** Scale normalized verts by ship render size. */
export function scaleVerts(
  verts: ReadonlyArray<IcebergVertex>,
  size: number
): IcebergVertex[] {
  const out: IcebergVertex[] = new Array(verts.length);
  for (let i = 0; i < verts.length; i++) {
    out[i] = { x: verts[i].x * size, y: verts[i].y * size };
  }
  return out;
}
