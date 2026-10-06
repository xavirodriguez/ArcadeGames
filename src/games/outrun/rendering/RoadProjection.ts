import type { RoadSegment, ProjectedSegment } from "../types/OutrunTypes";

/**
 * Pure pseudo-3D road projection.
 *
 * Depends only on numeric data. Writes into a pre-allocated buffer and returns
 * the number of segments written. No Canvas/Skia/Renderer imports.
 *
 * Camera model follows classic Out Run / Lou's Pseudo-3D tutorial:
 * - camera at (playerX * roadWidth, cameraHeight, playerZ)
 * - project points with perspective: scale = cameraDepth / (z - cameraZ)
 * - accumulate curve and hill offsets while walking the segment list
 * - wrap segment index circularly
 *
 * @param segments - Road geometry (circular)
 * @param playerZ - Camera / player Z
 * @param playerX - Player lateral position (-1..1)
 * @param cameraHeight - Camera Y
 * @param cameraDepth - Perspective depth factor
 * @param roadWidth - Full road width in world units
 * @param drawDistance - Max segments to project
 * @param screenW - Viewport width
 * @param screenH - Viewport height
 * @param out - Pre-allocated ProjectedSegment[] buffer (must be >= drawDistance)
 * @returns Number of projected segments written into `out`
 */
export function projectRoad(
  segments: readonly RoadSegment[],
  playerZ: number,
  playerX: number,
  cameraHeight: number,
  cameraDepth: number,
  roadWidth: number,
  drawDistance: number,
  screenW: number,
  screenH: number,
  out: ProjectedSegment[]
): number {
  const n = segments.length;
  if (n === 0 || drawDistance <= 0) return 0;

  let trackLength = 0;
  for (let i = 0; i < n; i++) trackLength += segments[i].length;
  if (trackLength <= 0) return 0;

  let baseZ = playerZ % trackLength;
  if (baseZ < 0) baseZ += trackLength;

  let segmentIndex = 0;
  let zAccum = 0;
  for (let i = 0; i < n; i++) {
    const segLen = segments[i].length;
    if (zAccum + segLen > baseZ) {
      segmentIndex = i;
      break;
    }
    zAccum += segLen;
  }

  const cameraZ = baseZ - zAccum;
  const maxProject = Math.min(drawDistance, out.length);

  let x = 0;
  let dx = 0;
  let y = 0;
  let dy = 0;

  const cameraX = playerX * roadWidth;

  let count = 0;
  let currentSegmentIndex = segmentIndex;
  let segmentZ = -cameraZ;

  for (let i = 0; i < maxProject; i++) {
    const seg = segments[currentSegmentIndex];
    const nextIndex = (currentSegmentIndex + 1) % n;

    const p1z = segmentZ;
    const p2z = segmentZ + seg.length;

    const scale1 = p1z > 0 ? cameraDepth / p1z : cameraDepth / 0.001;
    const projX1 = (1 + ((x - cameraX) * scale1) / roadWidth) * (screenW / 2);
    const projY1 = (screenH / 2) - scale1 * (y - cameraHeight) * (screenH / 2);
    const projW1 = (scale1 * screenW) / 2;

    x += dx;
    y += dy;
    dx += seg.curve;
    dy += seg.hill;

    const scale2 = p2z > 0 ? cameraDepth / p2z : cameraDepth / 0.001;
    const projX2 = (1 + ((x - cameraX) * scale2) / roadWidth) * (screenW / 2);
    const projY2 = (screenH / 2) - scale2 * (y - cameraHeight) * (screenH / 2);
    const projW2 = (scale2 * screenW) / 2;

    const fog = Math.min(1, Math.max(0, i / maxProject));

    const dest = out[count];
    dest.x1 = projX1;
    dest.y1 = projY1;
    dest.w1 = projW1;
    dest.x2 = projX2;
    dest.y2 = projY2;
    dest.w2 = projW2;
    dest.curve = seg.curve;
    dest.fog = fog;
    dest.clip = projY2;
    dest.index = seg.index;
    dest.p1z = p1z;
    dest.p2z = p2z;

    count++;
    segmentZ = p2z;
    currentSegmentIndex = nextIndex;
  }

  return count;
}

/**
 * Create a pre-allocated projection buffer of the given capacity.
 */
export function createProjectionBuffer(capacity: number): ProjectedSegment[] {
  const buf: ProjectedSegment[] = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    buf[i] = {
      x1: 0,
      y1: 0,
      w1: 0,
      x2: 0,
      y2: 0,
      w2: 0,
      curve: 0,
      fog: 0,
      clip: 0,
      index: 0,
      p1z: 0,
      p2z: 0
    };
  }
  return buf;
}
