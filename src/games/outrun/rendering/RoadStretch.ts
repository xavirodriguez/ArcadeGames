/**
 * Pure stretch-builder helpers for Out Run track generation.
 *
 * Bakes per-segment curve (and optionally hill) values at build time so
 * `projectRoad` keeps integrating `dx += seg.curve` / `dy += seg.hill` unchanged.
 *
 * Inspired by javascript-racer `addRoad(enter, hold, leave, curve, y)`:
 * - enter: easeIn 0 → target (quadratic)
 * - hold:  constant target
 * - leave: easeInOut target → 0 (cosine)
 *
 * Why easeIn on enter + easeInOut on leave (Jake's split):
 * - easeIn (t²) delays the start of the bend, then commits — feels like
 *   "turning into" a curve.
 * - easeInOut on exit avoids a hard snap back to straight.
 * - Same formulas as javascript-racer so discrete segment samples match the
 *   reference authoring model.
 */

/** Quadratic ease-in from a → b. percent in [0, 1]. */
export function easeIn(a: number, b: number, percent: number): number {
  const t = percent < 0 ? 0 : percent > 1 ? 1 : percent;
  return a + (b - a) * t * t;
}

/** Cosine ease-in-out from a → b. percent in [0, 1]. */
export function easeInOut(a: number, b: number, percent: number): number {
  const t = percent < 0 ? 0 : percent > 1 ? 1 : percent;
  return a + (b - a) * ((1 - Math.cos(t * Math.PI)) / 2);
}

/**
 * Build discrete per-segment curve values for one stretch.
 *
 * @param enter - segments ramping 0 → targetCurve (easeIn). 0 = abrupt start.
 * @param hold  - segments at constant targetCurve
 * @param leave - segments ramping targetCurve → 0 (easeInOut). 0 = abrupt end.
 * @param targetCurve - peak curve value (sign = direction)
 * @returns array of length enter+hold+leave (empty if all zero)
 */
export function buildEasedCurveStretch(
  enter: number,
  hold: number,
  leave: number,
  targetCurve: number
): number[] {
  const e = Math.max(0, Math.floor(enter));
  const h = Math.max(0, Math.floor(hold));
  const l = Math.max(0, Math.floor(leave));
  const out: number[] = [];

  // Jake: easeIn(0, curve, n/enter) for n in [0, enter)
  for (let n = 0; n < e; n++) {
    const val = easeIn(0, targetCurve, e === 0 ? 1 : n / e);
    out.push(val === 0 ? 0 : val);
  }
  for (let n = 0; n < h; n++) {
    out.push(targetCurve);
  }
  // Jake: easeInOut(curve, 0, n/leave) for n in [0, leave)
  for (let n = 0; n < l; n++) {
    out.push(easeInOut(targetCurve, 0, l === 0 ? 1 : n / l));
  }
  return out;
}

/**
 * Build discrete per-segment hill (derivative) values for one stretch.
 *
 * Uses the same enter/hold/leave profile as curves. Net elevation change of the
 * stretch equals sum(values). Caller is responsible for pairing ascent + descent
 * if a return-to-baseline is required (see Session 2 elevation note).
 */
export function buildEasedHillStretch(
  enter: number,
  hold: number,
  leave: number,
  targetHill: number
): number[] {
  return buildEasedCurveStretch(enter, hold, leave, targetHill);
}

/** Minimal stretch descriptor consumed by generateRoad. */
export interface StretchDescriptor {
  enter: number;
  hold: number;
  leave: number;
  curve: number;
  /** If omitted, hill is 0 for every segment in the stretch. */
  hill?: number;
  /**
   * When true, hill is also eased with the same enter/hold/leave profile.
   * When false/undefined, hill is applied as a constant on every segment
   * (legacy abrupt vertical change).
   */
  easeHill?: boolean;
}

/**
 * Expand a stretch descriptor into parallel curve[] and hill[] arrays
 * of equal length (enter+hold+leave).
 */
export function expandStretch(desc: StretchDescriptor): {
  curves: number[];
  hills: number[];
} {
  const curves = buildEasedCurveStretch(desc.enter, desc.hold, desc.leave, desc.curve);
  const targetHill = desc.hill ?? 0;
  const hills = desc.easeHill
    ? buildEasedHillStretch(desc.enter, desc.hold, desc.leave, targetHill)
    : curves.map(() => targetHill);
  return { curves, hills };
}
