import type { RaceStateComponent, RacerComponent, RoadData, ProjectedSegment } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { projectRoad } from "./RoadProjection";

export interface RacerProjectionResult {
  sx: number;
  sy: number;
  sw: number;
  lateral: number;
  carW: number;
  carH: number;
  bestClip: number;
}

export function computeRacerProjection(
  racer: RacerComponent,
  state: RaceStateComponent,
  roadData: RoadData,
  config: OutrunConfig,
  projectionBuffer: ProjectedSegment[],
  capacity: number
): RacerProjectionResult | null {
  const count = projectRoad(
    roadData.segments,
    state.playerZ,
    state.playerX,
    config.cameraHeight,
    config.cameraDepth,
    config.roadWidth,
    Math.min(config.drawDistance, capacity),
    config.WIDTH,
    config.HEIGHT,
    projectionBuffer
  );

  const trackLength = roadData.trackLength;
  let relZ = racer.z - state.playerZ;
  if (relZ > trackLength / 2) relZ -= trackLength;
  if (relZ < -trackLength / 2) relZ += trackLength;
  if (relZ <= 0 || relZ > config.drawDistance * config.segmentLength) return null;

  let best: ProjectedSegment | null = null;
  for (let i = 0; i < count; i++) {
    const p = projectionBuffer[i];
    if (p.p1z <= relZ && p.p2z >= relZ) {
      best = p;
      break;
    }
  }
  if (!best) return null;

  const t = (relZ - best.p1z) / Math.max(0.001, best.p2z - best.p1z);
  const sx = best.x1 + (best.x2 - best.x1) * t;
  const sy = best.y1 + (best.y2 - best.y1) * t;
  const sw = best.w1 + (best.w2 - best.w1) * t;

  const lateral = racer.lateralX * sw;
  const carW = sw * 0.35;
  const carH = carW * 0.6;

  if (sy > config.HEIGHT || sy >= best.clip || carW < 2) return null;

  return { sx, sy, sw, lateral, carW, carH, bestClip: best.clip };
}

export interface PlayerCarGeometry {
  baseX: number;
  baseY: number;
  carScale: number;
  tiltAngle: number;
  isOffroad: boolean;
  speedRatio: number;
}

export function computePlayerCarGeometry(
  state: RaceStateComponent,
  config: OutrunConfig,
  visualOffset?: { offsetX?: number; offsetY?: number }
): PlayerCarGeometry {
  const vX = visualOffset?.offsetX ?? 0;
  const vY = visualOffset?.offsetY ?? 0;

  const screenW = config.WIDTH;
  const screenH = config.HEIGHT;
  const speedRatio = state.speed / config.maxSpeed;
  const carScale = 1.0 + speedRatio * 0.08;

  const isOffroad = Math.abs(state.playerX) > 1.0;
  const bounceY = isOffroad
    ? Math.sin(state.playerZ * 0.2) * 3
    : Math.sin(state.playerZ * 0.05) * 1.2 * speedRatio;

  const tiltAngle = state.playerX * 0.08 * speedRatio;

  const baseY = screenH - 80 + bounceY + vY;
  const baseX = screenW / 2 + state.playerX * 40 + vX;

  return { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio };
}
