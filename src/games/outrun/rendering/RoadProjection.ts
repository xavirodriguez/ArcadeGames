import type { RoadSegment, ProjectedSegment } from "../types/OutrunTypes";

/**
 * Near-plane distance in world units. Segments fully behind this plane are not
 * projected. Segments that straddle the plane have their near endpoint
 * geometrically clipped to this plane (no scale clamp, no whole-segment skip).
 *
 * Chosen so scale = cameraDepth / NEAR_PLANE stays bounded (~1–2 for typical
 * cameraDepth ≈ 0.84) while still covering the first visible road slice.
 */
const NEAR_PLANE = 0.5;

/**
 * Pure pseudo-3D road projection.
 *
 * Depends only on numeric data. Writes into a pre-allocated buffer and returns
 * the number of segments written. No Canvas/Skia/Renderer imports.
 *
 * Camera model follows classic Out Run / Lou's Pseudo-3D tutorial:
 * - camera at (playerX * roadWidth, cameraHeight, playerZ)
 * - project points with perspective: scale = cameraDepth / z (z > 0 only)
 * - accumulate curve and hill offsets while walking the segment list
 * - partial-segment base correction so curve/hill are continuous at boundaries
 * - geometric near-plane clip for segments straddling the camera
 * - wrap segment index circularly
 *
 * @param segments - Road geometry (circular)
 * @param playerZ - Camera / player Z
 * @param playerX - Player lateral position (-1..1)
 * @param cameraHeight - Camera Y
 * @param cameraDepth - Perspective depth factor
 * @param roadWidth - Road lateral half-width in world units
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

  // H4: partial-segment curve/hill correction — start accumulation already
  // partway through the base segment so lateral/vertical offset is continuous
  // when the camera crosses a segment boundary mid-curve.
  const baseSeg = segments[segmentIndex];
  const baseLen = baseSeg.length > 0 ? baseSeg.length : 1;
  const basePercent = cameraZ / baseLen;

  let x = 0;
  let dx = -(baseSeg.curve * basePercent);
  let y = 0;
  let dy = -(baseSeg.hill * basePercent);

  const cameraX = playerX * roadWidth;

  let count = 0;
  let currentSegmentIndex = segmentIndex;
  let segmentZ = -cameraZ;
  let maxy = screenH;

  for (let i = 0; i < maxProject; i++) {
    const seg = segments[currentSegmentIndex];
    const nextIndex = (currentSegmentIndex + 1) % n;

    const rawP1z = segmentZ;
    const rawP2z = segmentZ + seg.length;

    // Camera-relative offsets at p1 (before this segment's curve/hill)
    let camX1 = x - cameraX;
    let camY1 = y - cameraHeight;

    // Advance accumulation for p2 (this segment's full curve/hill)
    x += dx;
    y += dy;
    dx += seg.curve;
    dy += seg.hill;

    const camX2 = x - cameraX;
    const camY2 = y - cameraHeight;

    const dest = out[count];
    dest.curve = seg.curve;
    dest.fog = Math.min(1, Math.max(0, i / maxProject));
    dest.index = seg.index;
    dest.p1z = rawP1z;
    dest.p2z = rawP2z;
    dest.clip = maxy;

    // Fully behind near plane → invalid projection (no finite screen coords)
    if (rawP2z <= NEAR_PLANE) {
      dest.x1 = 0;
      dest.y1 = 0;
      dest.w1 = 0;
      dest.x2 = 0;
      dest.y2 = 0;
      dest.w2 = 0;
      count++;
      segmentZ = rawP2z;
      currentSegmentIndex = nextIndex;
      continue;
    }

    // Geometric near-plane clip when p1 is behind / at the plane and p2 is ahead
    let p1z = rawP1z;
    if (rawP1z < NEAR_PLANE) {
      const t = (NEAR_PLANE - rawP1z) / (rawP2z - rawP1z);
      camX1 = camX1 + t * (camX2 - camX1);
      camY1 = camY1 + t * (camY2 - camY1);
      p1z = NEAR_PLANE;
    }

    const scale1 = cameraDepth / p1z;
    const scale2 = cameraDepth / rawP2z;

    const projX1 = (1 + camX1 * scale1) * (screenW / 2);
    const projY1 = screenH / 2 - scale1 * camY1 * (screenH / 2);
    const projW1 = scale1 * roadWidth * (screenW / 2);

    const projX2 = (1 + camX2 * scale2) * (screenW / 2);
    const projY2 = screenH / 2 - scale2 * camY2 * (screenH / 2);
    const projW2 = scale2 * roadWidth * (screenW / 2);

    dest.x1 = projX1;
    dest.y1 = projY1;
    dest.w1 = projW1;
    dest.x2 = projX2;
    dest.y2 = projY2;
    dest.w2 = projW2;
    // Store clipped p1z so consumers know the effective near depth
    dest.p1z = p1z;

    if (projY2 < maxy) maxy = projY2;

    count++;
    segmentZ = rawP2z;
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
