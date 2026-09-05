import { Shape, ShapeType, CircleShape, BoxShape, ConvexPolygonShape } from "../shapes/Shapes";
import { CollisionManifold } from "./CollisionTypes";
import {
  SATOverlapState,
  extractPolygonAxes,
  checkProjectionOverlap,
  finalizePolyManifold
} from "./satUtils";

function getPolygonWorldVertices(vertices: Array<{ x: number; y: number }>, cx: number, cy: number, rot: number): Array<{ x: number; y: number }> {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return vertices.map(v => ({
    x: cx + (cos * v.x - sin * v.y),
    y: cy + (sin * v.x + cos * v.y)
  }));
}

function projectVerticesOnAxis(verts: Array<{ x: number; y: number }>, axis: { x: number; y: number }): { minProj: number; maxProj: number } {
  let minProj = Infinity;
  let maxProj = -Infinity;
  for (let j = 0; j < verts.length; j++) {
    const v = verts[j];
    const dot = v.x * axis.x + v.y * axis.y;
    if (dot < minProj) minProj = dot;
    if (dot > maxProj) maxProj = dot;
  }
  return { minProj, maxProj };
}

function getBoxWorldVertices(width: number, height: number, cx: number, cy: number, rot: number): Array<{ x: number; y: number }> {
  const halfW = width / 2;
  const halfH = height / 2;
  const localVerts = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH }
  ];
  return getPolygonWorldVertices(localVerts, cx, cy, rot);
}

function testPolygonVsPolygon(
  vertsA: Array<{ x: number; y: number }>,
  ax: number, ay: number,
  vertsB: Array<{ x: number; y: number }>,
  bx: number, by: number
): CollisionManifold {
  const manifold = resetManifold();
  const axes: Array<{ x: number; y: number }> = [];

  extractPolygonAxes(vertsA, axes);
  extractPolygonAxes(vertsB, axes);

  // TODO(refactor): código duplicado detectado (bloque) con physics/collision/NarrowPhase.ts:107-117. Considerar extraer a función compartida. Ref: ed311a16
  const state: SATOverlapState = {
    minOverlap: Infinity,
    mtvX: 0,
    mtvY: 0
  };

  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const projA = projectVerticesOnAxis(vertsA, axis);
    const projB = projectVerticesOnAxis(vertsB, axis);

    if (!checkProjectionOverlap(projA.minProj, projA.maxProj, projB.minProj, projB.maxProj, axis, state)) {
      return manifold;
    }
  }

  return finalizePolyManifold(manifold, state.minOverlap, state.mtvX, state.mtvY, ax, ay, bx, by, vertsB);
}

function testPolygonVsCircle(
  verts: Array<{ x: number; y: number }>,
  ax: number, ay: number,
  cx: number, cy: number,
  radius: number
): CollisionManifold {
  const manifold = resetManifold();
  const axes: Array<{ x: number; y: number }> = [];

  extractPolygonAxes(verts, axes);

  let closestVertex = verts[0];
  let minDistSq = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const dx = v.x - cx;
    const dy = v.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestVertex = v;
    }
  }
  const toClosestX = closestVertex.x - cx;
  const toClosestY = closestVertex.y - cy;
  const toClosestLen = Math.sqrt(toClosestX * toClosestX + toClosestY * toClosestY);
  if (toClosestLen > 0.0001) {
    axes.push({ x: toClosestX / toClosestLen, y: toClosestY / toClosestLen });
  }

  // TODO(refactor): código duplicado detectado (bloque) con physics/collision/NarrowPhase.ts:44-54. Considerar extraer a función compartida. Ref: 00b49bad
  const state: SATOverlapState = {
    minOverlap: Infinity,
    mtvX: 0,
    mtvY: 0
  };

  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const projA = projectVerticesOnAxis(verts, axis);

    const circleCenterDot = cx * axis.x + cy * axis.y;
    const minProjB = circleCenterDot - radius;
    const maxProjB = circleCenterDot + radius;

    if (!checkProjectionOverlap(projA.minProj, projA.maxProj, minProjB, maxProjB, axis, state)) {
      return manifold;
    }
  }

  manifold.colliding = true;
  manifold.depth = state.minOverlap;

  const dirX = cx - ax;
  const dirY = cy - ay;
  const dot = dirX * state.mtvX + dirY * state.mtvY;
  if (dot < 0) {
    manifold.normalX = -state.mtvX;
    manifold.normalY = -state.mtvY;
  } else {
    manifold.normalX = state.mtvX;
    manifold.normalY = state.mtvY;
  }

  manifold.contactPoints.push({
    x: cx - manifold.normalX * radius,
    y: cy - manifold.normalY * radius
  });

  return manifold;
}

function resetManifold(): CollisionManifold {
  return {
    colliding: false,
    normalX: 0,
    normalY: 0,
    depth: 0,
    contactPoints: []
  };
}

/**
 * Narrowphase collision testing engine implementing Separating Axis Theorem (SAT).
 *
 * @remarks
 * Evaluates exact geometric intersections between pairs of convex shapes (Circles, Boxes, and Convex Polygons).
 * Calculates Minimum Translation Vectors (MTV), normal directions, penetration depths, and contact points.
 *
 * Pre-condition: Polygon shapes must be convex and vertices specified in order.
 *
 * @public
 */
export class NarrowPhase {
  /**
   * Tests collision between two primitive shapes in 2D world space.
   *
   * @remarks
   * Evaluates pairwise geometric overlap across Circle, Box, and Convex Polygon geometries.
   * Collision normals point from shape A towards shape B. Pre-condition: Polygon vertices
   * must be ordered convex hulls.
   *
   * @param shapeA - First geometry shape definition.
   * @param ax - World position X of shape A center.
   * @param ay - World position Y of shape A center.
   * @param ar - World rotation in radians of shape A.
   * @param shapeB - Second geometry shape definition.
   * @param bx - World position X of shape B center.
   * @param by - World position Y of shape B center.
   * @param br - World rotation in radians of shape B.
   * @returns Detailed collision manifold indicating collision flag, penetration depth, response normals, and contact points.
   */
  public static test(
    shapeA: Shape, ax: number, ay: number, ar: number,
    shapeB: Shape, bx: number, by: number, br: number
  ): CollisionManifold {
    const isPolyA = shapeA.type === ShapeType.Polygon;
    const isPolyB = shapeB.type === ShapeType.Polygon;

    if (isPolyA || isPolyB) {
      if (shapeA.type === ShapeType.Circle) {
        const polyB = shapeB as ConvexPolygonShape;
        const vertsB = getPolygonWorldVertices(polyB.vertices, bx, by, br);
        const manifold = testPolygonVsCircle(vertsB, bx, by, ax, ay, shapeA.radius);
        manifold.normalX *= -1;
        manifold.normalY *= -1;
        return manifold;
      } else if (shapeB.type === ShapeType.Circle) {
        const polyA = shapeA as ConvexPolygonShape;
        const vertsA = getPolygonWorldVertices(polyA.vertices, ax, ay, ar);
        return testPolygonVsCircle(vertsA, ax, ay, bx, by, shapeB.radius);
      } else {
        const vertsA = isPolyA
          ? getPolygonWorldVertices((shapeA as ConvexPolygonShape).vertices, ax, ay, ar)
          : getBoxWorldVertices((shapeA as BoxShape).width, (shapeA as BoxShape).height, ax, ay, ar);
        const vertsB = isPolyB
          ? getPolygonWorldVertices((shapeB as ConvexPolygonShape).vertices, bx, by, br)
          : getBoxWorldVertices((shapeB as BoxShape).width, (shapeB as BoxShape).height, bx, by, br);
        return testPolygonVsPolygon(vertsA, ax, ay, vertsB, bx, by);
      }
    }

    if (shapeA.type === ShapeType.Circle) {
      if (shapeB.type === ShapeType.Circle) {
        return this.circleVsCircle(shapeA, ax, ay, shapeB, bx, by);
      } else if (shapeB.type === ShapeType.Box) {
        return this.circleVsBox(shapeA, ax, ay, shapeB, bx, by, br);
      }
    } else if (shapeA.type === ShapeType.Box) {
      if (shapeB.type === ShapeType.Circle) {
        const manifold = this.circleVsBox(shapeB, bx, by, shapeA, ax, ay, ar);
        manifold.normalX *= -1;
        manifold.normalY *= -1;
        return manifold;
      } else if (shapeB.type === ShapeType.Box) {
        return this.boxVsBox(shapeA, ax, ay, ar, shapeB, bx, by, br);
      }
    }

    return resetManifold();
  }

  private static circleVsCircle(
    a: CircleShape, ax: number, ay: number,
    b: CircleShape, bx: number, by: number
  ): CollisionManifold {
    const manifold = resetManifold();
    const dx = bx - ax;
    const dy = by - ay;
    const distSq = dx * dx + dy * dy;
    const radiusSum = a.radius + b.radius;

    if (distSq < radiusSum * radiusSum) {
      const distance = Math.sqrt(distSq);
      manifold.colliding = true;
      manifold.depth = radiusSum - distance;
      if (distance > 0.0001) {
        manifold.normalX = dx / distance;
        manifold.normalY = dy / distance;
      } else {
        manifold.normalX = 1;
        manifold.normalY = 0;
      }
      manifold.contactPoints.push({ x: ax + manifold.normalX * a.radius, y: ay + manifold.normalY * a.radius });
    }
    return manifold;
  }

  private static circleVsBox(
    a: CircleShape, ax: number, ay: number,
    b: BoxShape, bx: number, by: number, br: number
  ): CollisionManifold {
    const manifold = resetManifold();
    const halfW = b.width / 2;
    const halfH = b.height / 2;

    const dx = ax - bx;
    const dy = ay - by;

    const cos = Math.cos(br);
    const sin = Math.sin(br);
    const localCircleX = dx * cos + dy * sin;
    const localCircleY = -dx * sin + dy * cos;

    const closestX = Math.max(-halfW, Math.min(halfW, localCircleX));
    const closestY = Math.max(-halfH, Math.min(halfH, localCircleY));
    const distanceX = localCircleX - closestX;
    const distanceY = localCircleY - closestY;
    const distanceSq = distanceX * distanceX + distanceY * distanceY;

    if (distanceSq < a.radius * a.radius) {
      const distance = Math.sqrt(distanceSq);
      manifold.colliding = true;
      manifold.depth = a.radius - distance;

      let localNormalX = 0;
      let localNormalY = 0;

      if (distance > 0.0001) {
        localNormalX = distanceX / distance;
        localNormalY = distanceY / distance;
      } else {
        if (Math.abs(localCircleX) > Math.abs(localCircleY)) {
          localNormalX = localCircleX > 0 ? 1 : -1;
          localNormalY = 0;
          manifold.depth = a.radius + halfW - Math.abs(localCircleX);
        } else {
          localNormalX = 0;
          localNormalY = localCircleY > 0 ? 1 : -1;
          manifold.depth = a.radius + halfH - Math.abs(localCircleY);
        }
      }

      manifold.normalX = localNormalX * cos - localNormalY * sin;
      manifold.normalY = localNormalX * sin + localNormalY * cos;

      manifold.contactPoints.push({ x: ax - manifold.normalX * a.radius, y: ay - manifold.normalY * a.radius });
    }
    return manifold;
  }

  private static boxVsBox(
    a: BoxShape, ax: number, ay: number, ar: number,
    b: BoxShape, bx: number, by: number, br: number
  ): CollisionManifold {
    const manifold = resetManifold();

    const vertsA = getBoxWorldVertices(a.width, a.height, ax, ay, ar);
    const vertsB = getBoxWorldVertices(b.width, b.height, bx, by, br);

    const cosA = Math.cos(ar);
    const sinA = Math.sin(ar);
    const cosB = Math.cos(br);
    const sinB = Math.sin(br);

    const axes = [
      { x: cosA, y: sinA },
      { x: -sinA, y: cosA },
      { x: cosB, y: sinB },
      { x: -sinB, y: cosB }
    ];

    const state: SATOverlapState = {
      minOverlap: Infinity,
      mtvX: 0,
      mtvY: 0
    };

    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len < 0.0001) continue;
      const unitAxis = { x: axis.x / len, y: axis.y / len };

      let minA = Infinity;
      let maxA = -Infinity;
      for (let j = 0; j < vertsA.length; j++) {
        const v = vertsA[j];
        const proj = v.x * unitAxis.x + v.y * unitAxis.y;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (let j = 0; j < vertsB.length; j++) {
        const v = vertsB[j];
        const proj = v.x * unitAxis.x + v.y * unitAxis.y;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      if (!checkProjectionOverlap(minA, maxA, minB, maxB, unitAxis, state)) {
        return manifold;
      }
    }

    return finalizePolyManifold(manifold, state.minOverlap, state.mtvX, state.mtvY, ax, ay, bx, by, vertsB);
  }
}
