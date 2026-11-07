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
function validatePhases(phases: readonly VFXTimelinePhase[]): void {
  if (phases.length === 0) throw new RangeError("phases must not be empty");
  let previousEnd = 0;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    validatePhase(phase, i);
    if (i > 0 && phase.start < previousEnd) {
      throw new RangeError(`phases[${i}] overlaps or precedes the previous phase`);
    }
    previousEnd = phase.end;
  }
}

function sampleValidatedTimeline(progress: number, phases: readonly VFXTimelinePhase[]): number {
  const t = clamp(finiteNumber(progress, "progress"), 0, 1);
  let previousValue = phases[0].from;
  for (const phase of phases) {
    if (t < phase.start) return previousValue;
    if (t <= phase.end) {
      const localProgress = (t - phase.start) / (phase.end - phase.start);
      return phase.from + (phase.to - phase.from) * easeProgress(localProgress, phase.easing);
    }
    previousValue = phase.to;
  }
  return previousValue;
}

/** Compiles and snapshots a timeline once for allocation-free repeated sampling. */
export function createVFXTimelineSampler(phases: readonly VFXTimelinePhase[]): (progress: number) => number {
  validatePhases(phases);
  const snapshot = phases.map(phase => ({ ...phase }));
  return (progress: number): number => sampleValidatedTimeline(progress, snapshot);
}

/** Validates and samples a timeline in one call; use a compiled sampler in hot render loops. */
export function sampleVFXTimeline(progress: number, phases: readonly VFXTimelinePhase[]): number {
  validatePhases(phases);
  return sampleValidatedTimeline(progress, phases);
}


export type VFXSemanticPhase = "contact" | "expansion" | "peak" | "dissipation";

export interface VFXPhaseBoundary {
  id: VFXSemanticPhase;
  start: number;
  end: number;
}

/** Default combat beats; individual effects may supply a more specific phase map. */
export const DEFAULT_VFX_COMBAT_PHASES: readonly VFXPhaseBoundary[] = Object.freeze([
  { id: "contact", start: 0, end: 0.12 },
  { id: "expansion", start: 0.12, end: 0.52 },
  { id: "peak", start: 0.52, end: 0.68 },
  { id: "dissipation", start: 0.68, end: 1 }
]);

export interface VFXPhaseSample {
  phase: VFXSemanticPhase;
  phaseT: number;
}

/** Resolves a normalized timestamp into a semantic phase and local phase progress. */
export function resolveVFXPhase(
  progress: number,
  phases: readonly VFXPhaseBoundary[] = DEFAULT_VFX_COMBAT_PHASES
): VFXPhaseSample {
  const t = clamp(finiteNumber(progress, "progress"), 0, 1);
  if (phases.length === 0) throw new RangeError("phases must not be empty");
  let previousEnd = 0;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    finiteNumber(phase.start, `phases[${i}].start`);
    finiteNumber(phase.end, `phases[${i}].end`);
    if (phase.start < 0 || phase.end > 1 || phase.end <= phase.start || phase.start < previousEnd) {
      throw new RangeError(`phases[${i}] has invalid or overlapping boundaries`);
    }
    previousEnd = phase.end;
    if (t <= phase.end || i === phases.length - 1) {
      return { phase: phase.id, phaseT: clamp((t - phase.start) / (phase.end - phase.start), 0, 1) };
    }
  }
  const last = phases[phases.length - 1];
  return { phase: last.id, phaseT: 1 };
}
