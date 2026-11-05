/**
 * Stateless temporal sampling for deterministic procedural VFX.
 *
 * Progress is normalized to [0, 1]. Phases may leave gaps; gaps hold the
 * previous phase terminal value. Sampling has no history and allocates
 * nothing, so callers can evaluate arbitrary timestamps or replay out of order.
 */
import { clamp, finiteNumber } from "./vfx-core";

export type VFXEasing = "linear" | "smoothstep" | "ease-in" | "ease-out" | "ease-in-out";

export interface VFXTimelinePhase {
  start: number;
  end: number;
  from: number;
  to: number;
  easing?: VFXEasing;
}

function validatePhase(phase: VFXTimelinePhase, index: number): void {
  finiteNumber(phase.start, `phases[${index}].start`);
  finiteNumber(phase.end, `phases[${index}].end`);
  finiteNumber(phase.from, `phases[${index}].from`);
  finiteNumber(phase.to, `phases[${index}].to`);
  if (phase.start < 0 || phase.start > 1 || phase.end < 0 || phase.end > 1) {
    throw new RangeError(`phases[${index}] boundaries must be in [0, 1]`);
  }
  if (phase.end <= phase.start) throw new RangeError(`phases[${index}].end must be greater than start`);
  if (phase.easing !== undefined && !["linear", "smoothstep", "ease-in", "ease-out", "ease-in-out"].includes(phase.easing)) {
    throw new RangeError(`phases[${index}].easing is not supported`);
  }
}

/** Maps normalized progress through a named easing curve. */
export function easeProgress(progress: number, easing: VFXEasing = "linear"): number {
  const t = clamp(finiteNumber(progress, "progress"), 0, 1);
  switch (easing) {
    case "linear": return t;
    case "smoothstep": return t * t * (3 - 2 * t);
    case "ease-in": return t * t;
    case "ease-out": return 1 - (1 - t) * (1 - t);
    case "ease-in-out": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default: throw new RangeError("easing is not supported");
  }
}

/**
 * Samples ordered, non-overlapping phases. Gaps hold the previous value;
 * before the first phase its from value is returned, after the last phase
 * its to value is returned.
 */
export function sampleVFXTimeline(progress: number, phases: readonly VFXTimelinePhase[]): number {
  const t = clamp(finiteNumber(progress, "progress"), 0, 1);
  if (phases.length === 0) throw new RangeError("phases must not be empty");
  let previousEnd = 0;
  let previousValue = phases[0].from;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    validatePhase(phase, i);
    if (i > 0 && phase.start < previousEnd) throw new RangeError(`phases[${i}] overlaps or precedes the previous phase`);
    if (t < phase.start) return previousValue;
    if (t <= phase.end) {
      const localProgress = (t - phase.start) / (phase.end - phase.start);
      return phase.from + (phase.to - phase.from) * easeProgress(localProgress, phase.easing);
    }
    previousEnd = phase.end;
    previousValue = phase.to;
  }
  return previousValue;
}
