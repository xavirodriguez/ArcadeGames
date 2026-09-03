import { CollisionManifold } from "./CollisionTypes";

/**
 * Mutable state object used during SAT projection overlap testing to avoid garbage allocation.
 * @public
 */
export interface SATOverlapState {
  /** Accumulator for minimum translation depth across axes. */
  minOverlap: number;
  /** Minimum translation vector X direction. */
  mtvX: number;
  /** Minimum translation vector Y direction. */
  mtvY: number;
}

/**
 * Extracts normalized perpendicular separation axes from a polygon's edges into a reusable array.
 *
 * @param verts - Polygon vertices in world space.
 * @param axes - Destination array where extracted normal axes will be pushed or set.
 * @public
 */
export function extractPolygonAxes(
  verts: Array<{ x: number; y: number }>,
  axes: Array<{ x: number; y: number }>
): void {
  const numVerts = verts.length;
  for (let i = 0; i < numVerts; i++) {
    const p1 = verts[i];
    const p2 = verts[(i + 1) % numVerts];
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    if (len > 0.0001) {
      axes.push({ x: -edgeY / len, y: edgeX / len });
    }
  }
}

/**
 * Projects two 1D intervals along an axis and checks for overlap, updating the SAT state if a new minimum overlap is found.
 *
 * @param minA - Minimum projection point of shape A.
 * @param maxA - Maximum projection point of shape A.
 * @param minB - Minimum projection point of shape B.
 * @param maxB - Maximum projection point of shape B.
 * @param axis - Current evaluation axis vector.
 * @param state - Mutable SAT state tracking minimum penetration overlap and MTV vector.
 * @returns True if projections overlap; false if a separating axis is found.
 * @public
 */
export function checkProjectionOverlap(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number,
  axis: { x: number; y: number },
  state: SATOverlapState
): boolean {
  if (maxA < minB || maxB < minA) {
    return false;
  }

  const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
  if (overlap < state.minOverlap) {
    state.minOverlap = overlap;
    state.mtvX = axis.x;
    state.mtvY = axis.y;
  }

  return true;
}

/**
 * Finalizes collision manifold details (normal, depth, contact point) for polygon collisions once overlap is verified.
 *
 * @param manifold - Destination collision manifold to mutate.
 * @param minOverlap - Calculated minimum penetration overlap depth.
 * @param mtvX - Minimum translation vector X.
 * @param mtvY - Minimum translation vector Y.
 * @param centerAX - Center X coordinate of shape A.
 * @param centerAY - Center Y coordinate of shape A.
 * @param centerBX - Center X coordinate of shape B.
 * @param centerBY - Center Y coordinate of shape B.
 * @param vertsB - World-space vertices of shape B (used to select contact point).
 * @returns The populated collision manifold.
 * @public
 */
export function finalizePolyManifold(
  manifold: CollisionManifold,
  minOverlap: number,
  mtvX: number,
  mtvY: number,
  centerAX: number,
  centerAY: number,
  centerBX: number,
  centerBY: number,
  vertsB: Array<{ x: number; y: number }>
): CollisionManifold {
  manifold.colliding = true;
  manifold.depth = minOverlap;

  const dirX = centerBX - centerAX;
  const dirY = centerBY - centerAY;
  const dot = dirX * mtvX + dirY * mtvY;
  if (dot < 0) {
    manifold.normalX = -mtvX;
    manifold.normalY = -mtvY;
  } else {
    manifold.normalX = mtvX;
    manifold.normalY = mtvY;
  }

  let closestVertex = vertsB[0];
  let minDist = Infinity;
  for (let i = 0; i < vertsB.length; i++) {
    const v = vertsB[i];
    const dx = v.x - centerAX;
    const dy = v.y - centerAY;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestVertex = v;
    }
  }
  manifold.contactPoints.push({ x: closestVertex.x, y: closestVertex.y });

  return manifold;
}
