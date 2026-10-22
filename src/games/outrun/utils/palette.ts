import { interpolateHexColor } from "../rendering/OutrunPalettes";
import type {
  OutrunHour,
  OutrunPaletteMode,
  OutrunPaletteTokens,
  OutrunTimedPaletteSet,
  OutrunVisualPaletteConfig,
  OutrunVisualPaletteResource,
  OutrunVisualStage
} from "../types/OutrunVisualTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";

export interface PaletteStageContext {
  current: OutrunVisualStage;
  next: OutrunVisualStage;
  palette: OutrunVisualPaletteConfig;
  paletteColorblind: OutrunTimedPaletteSet;
  paletteMode: OutrunPaletteMode;
  transitionFraction: number;
}

const TOKEN_KEYS: ReadonlyArray<keyof OutrunPaletteTokens> = [
  "skyHigh", "skyMid", "skyLow", "horizon", "sun", "mtnFar", "mtnMid", "mtnNear",
  "groundFar", "groundNear", "roadFar", "roadNear", "foliage", "foliageLight", "kerbB"
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerpColor(from: string, to: string, amount: number): string {
  return interpolateHexColor(from, to, clamp01(amount));
}

export function mixPaletteTokens(
  from: OutrunPaletteTokens,
  to: OutrunPaletteTokens,
  amount: number
): OutrunPaletteTokens {
  const t = clamp01(amount);
  return {
    skyHigh: lerpColor(from.skyHigh, to.skyHigh, t),
    skyMid: lerpColor(from.skyMid, to.skyMid, t),
    skyLow: lerpColor(from.skyLow, to.skyLow, t),
    horizon: lerpColor(from.horizon, to.horizon, t),
    sun: lerpColor(from.sun, to.sun, t),
    mtnFar: lerpColor(from.mtnFar, to.mtnFar, t),
    mtnMid: lerpColor(from.mtnMid, to.mtnMid, t),
    mtnNear: lerpColor(from.mtnNear, to.mtnNear, t),
    groundFar: lerpColor(from.groundFar, to.groundFar, t),
    groundNear: lerpColor(from.groundNear, to.groundNear, t),
    roadFar: lerpColor(from.roadFar, to.roadFar, t),
    roadNear: lerpColor(from.roadNear, to.roadNear, t),
    foliage: lerpColor(from.foliage, to.foliage, t),
    foliageLight: lerpColor(from.foliageLight, to.foliageLight, t),
    kerbB: lerpColor(from.kerbB, to.kerbB, t)
  };
}

export function paletteForHour(
  hour: OutrunHour,
  palettes: OutrunTimedPaletteSet
): OutrunPaletteTokens {
  if (hour === "twilight") {
    return mixPaletteTokens(palettes.afternoon, palettes.night, 0.5);
  }
  return palettes[hour];
}

/** Seven flat sky bands. Even bands are a 50% mix of their adjacent anchors. */
export function skyBandsForPalette(tokens: OutrunPaletteTokens): string[] {
  return [
    tokens.skyHigh,
    lerpColor(tokens.skyHigh, tokens.skyMid, 0.5),
    tokens.skyMid,
    lerpColor(tokens.skyMid, tokens.skyLow, 0.5),
    tokens.skyLow,
    lerpColor(tokens.skyLow, tokens.horizon, 0.5),
    tokens.horizon
  ];
}

/** Linear distance haze with 5% white mixed into odd-numbered road strips. */
function colorAtDepth(
  near: string,
  far: string,
  depth: number,
  segmentIndex: number,
  oddStripeWhiteMix: number
): string {
  const distance = clamp01(depth);
  const base = lerpColor(near, far, distance);
  return Math.abs(segmentIndex % 2) === 1
    ? lerpColor(base, "#FFFFFF", oddStripeWhiteMix)
    : base;
}

export function groundColorAtDepth(
  tokens: OutrunPaletteTokens,
  depth: number,
  segmentIndex: number,
  oddStripeWhiteMix = 0.05
): string {
  return colorAtDepth(tokens.groundNear, tokens.groundFar, depth, segmentIndex, oddStripeWhiteMix);
}

export function roadColorAtDepth(
  tokens: OutrunPaletteTokens,
  depth: number,
  segmentIndex: number,
  oddStripeWhiteMix = 0.05
): string {
  return colorAtDepth(tokens.roadNear, tokens.roadFar, depth, segmentIndex, oddStripeWhiteMix);
}

export function kerbColorForPalette(tokens: OutrunPaletteTokens): string {
  return tokens.kerbB;
}

export function stageAtProgress(
  stages: OutrunVisualStage[],
  progress: number
): { stageIndex: number; stageProgress: number; stage: OutrunVisualStage } {
  if (stages.length === 0) {
    throw new Error("Out Run visual stages must contain at least one entry.");
  }
  const normalized = ((progress % 1) + 1) % 1;
  const scaled = normalized * stages.length;
  const stageIndex = Math.min(stages.length - 1, Math.floor(scaled));
  return { stageIndex, stageProgress: scaled - stageIndex, stage: stages[stageIndex] };
}

function easeInOut(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/**
 * Resolve the active stage palette. The last transitionFraction of a stage
 * blends continuously into the following stage; twilight is generated, not stored.
 */
export function paletteAtProgress(
  stage: PaletteStageContext,
  progress: number
): OutrunPaletteTokens {
  const currentSet = stage.paletteMode === "colorblind" ? stage.paletteColorblind : stage.palette;
  const current = paletteForHour(stage.current.hour, currentSet);
  const next = paletteForHour(stage.next.hour, currentSet);
  const fraction = clamp01(stage.transitionFraction);
  const p = clamp01(progress);
  if (fraction <= 0 || p <= 1 - fraction) return current;
  const blendProgress = Number(((p - (1 - fraction)) / fraction).toFixed(10));
  return mixPaletteTokens(current, next, easeInOut(blendProgress));
}

/** List is exported so parity and visual tests cover every dynamic color token. */
export const OUTRUN_PALETTE_TOKEN_KEYS = TOKEN_KEYS;


/** Purely resolves the visual palette resource from race progress and config. */
export function createVisualPaletteResource(
  state: RaceStateComponent,
  roadData: RoadData,
  config: OutrunConfig
): OutrunVisualPaletteResource {
  const progress = (((state.playerZ % roadData.trackLength) + roadData.trackLength) % roadData.trackLength) /
    roadData.trackLength;
  const stagePosition = stageAtProgress(config.visual.stages, progress);
  const current = stagePosition.stage;
  const next = config.visual.stages[(stagePosition.stageIndex + 1) % config.visual.stages.length];
  const tokens = paletteAtProgress({
    current, next, palette: config.visual.palette,
    paletteColorblind: config.visual.paletteColorblind,
    paletteMode: config.visual.paletteMode,
    transitionFraction: config.visual.transitionFraction
  }, stagePosition.stageProgress);
  return {
    stageIndex: stagePosition.stageIndex, stageProgress: stagePosition.stageProgress,
    hour: current.hour, decor: current.decor, tokens,
    shared: config.visual.palette.shared, skyBands: skyBandsForPalette(tokens),
    quality: config.visual.quality, paletteMode: config.visual.paletteMode,
    tuning: config.visual.tuning
  };
}
