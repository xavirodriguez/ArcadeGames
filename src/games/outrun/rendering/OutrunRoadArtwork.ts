import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { ProjectedSegment, RaceStateComponent } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { groundColorAtDepth, lerpColor, roadColorAtDepth } from "../utils/palette";

export interface OutrunRoadSegmentArtwork {
  groundColor: string;
  roadColor: string;
  kerbColor: string;
  laneColor: string;
  waterColor: string | null;
  drawLane: boolean;
  kerbWidthRatio: number;
  laneMarkWidthRatio: number;
}

export interface OutrunRoadSpeedLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface OutrunRoadSpeedLineInput {
  projectedSegments: readonly ProjectedSegment[];
  count: number;
  state: RaceStateComponent;
  config: OutrunConfig;
  visualPalette: OutrunVisualPaletteResource;
  screenW: number;
  screenH: number;
  horizonY: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const fraction = (value: number): number => ((value % 1) + 1) % 1;

/**
 * Resolves one road slice from the phase-2 palette. Geometry remains owned by
 * projectRoad; this helper only returns deterministic paint and stripe choices.
 */
export function resolveOutrunRoadSegmentArtwork(
  segmentIndex: number,
  depth: number,
  visualPalette: OutrunVisualPaletteResource
): OutrunRoadSegmentArtwork {
  const { tokens, shared, tuning, decor } = visualPalette;
  const stripeMix = tuning.road.stripeWhiteMix;
  const normalizedDepth = clamp01(depth);
  const rawGround = groundColorAtDepth(tokens, normalizedDepth, segmentIndex, stripeMix);
  const groundColor = decor === "desert"
    ? lerpColor(rawGround, tuning.decor.desertSandColor, tuning.decor.desertGroundMix)
    : rawGround;
  const rawWater = lerpColor(tokens.skyMid, tokens.skyLow, normalizedDepth);
  const waterColor = Math.abs(segmentIndex % 2) === 1
    ? lerpColor(rawWater, "#FFFFFF", stripeMix)
    : rawWater;

  return {
    groundColor,
    roadColor: roadColorAtDepth(tokens, normalizedDepth, segmentIndex, stripeMix),
    kerbColor: Math.abs(segmentIndex % 2) === 0 ? tokens.kerbB : shared.cream,
    laneColor: shared.cream,
    waterColor: decor === "coast" ? waterColor : null,
    drawLane: Math.abs(segmentIndex % 2) === 0,
    kerbWidthRatio: tuning.road.kerbWidthToRoadHalfWidth,
    laneMarkWidthRatio: tuning.road.laneMarkWidthToRoadHalfWidth
  };
}

function distanceFromRoadEdge(
  segment: ProjectedSegment,
  t: number,
  side: -1 | 1,
  vanishingX: number,
  targetX: number,
  horizonY: number,
  verticalSpan: number,
  outerRoadRatio: number
): number {
  const y = horizonY + t * verticalSpan;
  const segmentT = clamp01((y - segment.y2) / Math.max(0.001, segment.y1 - segment.y2));
  const x = vanishingX + (targetX - vanishingX) * t;
  const leftEdgeTop = segment.x2 - segment.w2 * outerRoadRatio;
  const leftEdgeBottom = segment.x1 - segment.w1 * outerRoadRatio;
  const rightEdgeTop = segment.x2 + segment.w2 * outerRoadRatio;
  const rightEdgeBottom = segment.x1 + segment.w1 * outerRoadRatio;
  const leftEdge = leftEdgeTop + (leftEdgeBottom - leftEdgeTop) * segmentT;
  const rightEdge = rightEdgeTop + (rightEdgeBottom - rightEdgeTop) * segmentT;
  return side < 0 ? leftEdge - x : x - rightEdge;
}

/**
 * Computes short radial streak pieces and clips them to the ground outside both
 * kerbs. Low quality disables the effect. All phase and placement inputs are
 * deterministic, so Canvas and Skia render the same streak geometry.
 */
export function computeOutrunRoadSpeedLineSegments(
  input: OutrunRoadSpeedLineInput
): OutrunRoadSpeedLineSegment[] {
  const { projectedSegments, state, config, visualPalette, screenW, screenH, horizonY } = input;
  const count = Math.min(Math.max(0, Math.floor(input.count)), projectedSegments.length);
  const tuning = visualPalette.tuning.road;
  const speedRatio = config.maxSpeed > 0 ? clamp01(state.speed / config.maxSpeed) : 0;
  if (visualPalette.quality !== "high" || count === 0 ||
      speedRatio <= tuning.speedLineStartSpeedRatio || screenH <= horizonY) {
    return [];
  }

  let vanishingSegment: ProjectedSegment | undefined;
  let nearestSegment: ProjectedSegment | undefined;
  let smallestHorizonDistance = Number.POSITIVE_INFINITY;
  let largestBottomY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < count; index++) {
    const segment = projectedSegments[index];
    if (!segment || segment.y1 <= segment.y2 || segment.w1 <= 0 || segment.w2 < 0 ||
        segment.y2 >= segment.clip) continue;
    const horizonDistance = Math.abs(segment.y2 - horizonY);
    if (horizonDistance < smallestHorizonDistance) {
      smallestHorizonDistance = horizonDistance;
      vanishingSegment = segment;
    }
    if (segment.y1 > largestBottomY) {
      largestBottomY = segment.y1;
      nearestSegment = segment;
    }
  }
  if (!vanishingSegment || !nearestSegment) return [];

  const vanishingX = vanishingSegment.x2;
  const verticalSpan = screenH - horizonY;
  const outerRoadRatio = 1 + tuning.kerbWidthToRoadHalfWidth;
  const linesPerSide = 5;
  const totalLines = linesPerSide * 2;
  const lineLength = 0.14;
  const distancePhase = state.lapTime * speedRatio * 0.9;
  const output: OutrunRoadSpeedLineSegment[] = [];

  for (const side of [-1, 1] as const) {
    const sideSpan = side < 0 ? vanishingX : screenW - vanishingX;
    if (sideSpan <= 1) continue;

    for (let index = 0; index < linesPerSide; index++) {
      const lineIndex = (side < 0 ? 0 : linesPerSide) + index;
      const sideFraction = 0.55 + (index / Math.max(1, linesPerSide - 1)) * 0.4;
      const targetX = vanishingX + side * sideSpan * sideFraction;
      const phase = fraction(distancePhase + lineIndex / totalLines);
      const lineStart = 0.04 + phase * 0.78;
      const lineEnd = Math.min(0.98, lineStart + lineLength);

      for (let segmentIndex = 0; segmentIndex < count; segmentIndex++) {
        const segment = projectedSegments[segmentIndex];
        if (!segment || segment.y1 <= segment.y2 || segment.w1 <= 0 ||
            segment.y2 >= segment.clip) continue;

        const segmentTopT = clamp01((Math.max(horizonY, segment.y2) - horizonY) / verticalSpan);
        const segmentBottomT = clamp01((Math.min(screenH, segment.y1) - horizonY) / verticalSpan);
        const from = Math.max(lineStart, segmentTopT);
        const to = Math.min(lineEnd, segmentBottomT);
        if (to - from <= 0.001) continue;

        const distanceFromEdge = (t: number): number => distanceFromRoadEdge(
          segment, t, side, vanishingX, targetX, horizonY, verticalSpan, outerRoadRatio
        );
        const startDistance = distanceFromEdge(from);
        const endDistance = distanceFromEdge(to);
        if (startDistance < 0 && endDistance < 0) continue;

        let clippedFrom = from;
        let clippedTo = to;
        if (startDistance < 0 || endDistance < 0) {
          const denominator = startDistance - endDistance;
          if (Math.abs(denominator) < 0.000001) continue;
          const crossing = from + (to - from) * (startDistance / denominator);
          if (startDistance < 0) clippedFrom = crossing;
          else clippedTo = crossing;
        }
        if (clippedTo - clippedFrom <= 0.001) continue;

        output.push({
          x1: vanishingX + (targetX - vanishingX) * clippedFrom,
          y1: horizonY + verticalSpan * clippedFrom,
          x2: vanishingX + (targetX - vanishingX) * clippedTo,
          y2: horizonY + verticalSpan * clippedTo
        });
      }
    }
  }

  return output;
}
