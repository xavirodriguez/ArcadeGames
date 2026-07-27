import { Shape, ShapeType, CircleShape, BoxShape, ConvexPolygonShape } from "../shapes/Shapes";
import { CollisionManifold } from "./CollisionTypes";

function getPolygonWorldVertices(vertices: Array<{ x: number; y: number }>, cx: number, cy: number, rot: number): Array<{ x: number; y: number }> {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return vertices.map(v => ({
    x: cx + (cos * v.x - sin * v.y),
    y: cy + (sin * v.x + cos * v.y)
  }));
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

  let minOverlap = Infinity;
  let mtvX = 0;
  let mtvY = 0;

  const numA = vertsA.length;
  const numB = vertsB.length;

  const axes: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < numA; i++) {
    const p1 = vertsA[i];
    const p2 = vertsA[(i + 1) % numA];
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    if (len > 0.0001) {
      axes.push({ x: -edgeY / len, y: edgeX / len });
    }
  }

  for (let i = 0; i < numB; i++) {
    const p1 = vertsB[i];
    const p2 = vertsB[(i + 1) % numB];
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    if (len > 0.0001) {
      axes.push({ x: -edgeY / len, y: edgeX / len });
    }
  }

  for (const axis of axes) {
    let minProjA = Infinity;
    let maxProjA = -Infinity;
    for (const v of vertsA) {
      const dot = v.x * axis.x + v.y * axis.y;
      if (dot < minProjA) minProjA = dot;
      if (dot > maxProjA) maxProjA = dot;
    }

    let minProjB = Infinity;
    let maxProjB = -Infinity;
    for (const v of vertsB) {
      const dot = v.x * axis.x + v.y * axis.y;
      if (dot < minProjB) minProjB = dot;
      if (dot > maxProjB) maxProjB = dot;
    }

    if (maxProjA < minProjB || maxProjB < minProjA) {
      return manifold;
    }

    const overlap = Math.min(maxProjA, maxProjB) - Math.max(minProjA, minProjB);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvX = axis.x;
      mtvY = axis.y;
    }
  }

  manifold.colliding = true;
  manifold.depth = minOverlap;

  const dirX = bx - ax;
  const dirY = by - ay;
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
  for (const v of vertsB) {
    const dx = v.x - ax;
    const dy = v.y - ay;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestVertex = v;
    }
  }
  manifold.contactPoints.push({ x: closestVertex.x, y: closestVertex.y });

  return manifold;
}

function testPolygonVsCircle(
  verts: Array<{ x: number; y: number }>,
  ax: number, ay: number,
  cx: number, cy: number,
  radius: number
): CollisionManifold {
  const manifold = resetManifold();

  let minOverlap = Infinity;
  let mtvX = 0;
  let mtvY = 0;

  const numVerts = verts.length;
  const axes: Array<{ x: number; y: number }> = [];

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

  let closestVertex = verts[0];
  let minDistSq = Infinity;
  for (const v of verts) {
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

  for (const axis of axes) {
    let minProjA = Infinity;
    let maxProjA = -Infinity;
    for (const v of verts) {
      const dot = v.x * axis.x + v.y * axis.y;
      if (dot < minProjA) minProjA = dot;
      if (dot > maxProjA) maxProjA = dot;
    }

    const circleCenterDot = cx * axis.x + cy * axis.y;
    const minProjB = circleCenterDot - radius;
    const maxProjB = circleCenterDot + radius;

    if (maxProjA < minProjB || maxProjB < minProjA) {
      return manifold;
    }

    const overlap = Math.min(maxProjA, maxProjB) - Math.max(minProjA, minProjB);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvX = axis.x;
      mtvY = axis.y;
    }
  }

  manifold.colliding = true;
  manifold.depth = minOverlap;

  const dirX = cx - ax;
  const dirY = cy - ay;
  const dot = dirX * mtvX + dirY * mtvY;
  if (dot < 0) {
    manifold.normalX = -mtvX;
    manifold.normalY = -mtvY;
  } else {
    manifold.normalX = mtvX;
    manifold.normalY = mtvY;
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

/** @public */
export class NarrowPhase {
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

    let minOverlap = Infinity;
    let mtvX = 0;
    let mtvY = 0;

    for (const axis of axes) {
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len < 0.0001) continue;
      const unitX = axis.x / len;
      const unitY = axis.y / len;

      let minA = Infinity;
      let maxA = -Infinity;
      for (const v of vertsA) {
        const proj = v.x * unitX + v.y * unitY;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (const v of vertsB) {
        const proj = v.x * unitX + v.y * unitY;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      if (maxA < minB || maxB < minA) {
        return manifold;
      }

      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        mtvX = unitX;
        mtvY = unitY;
      }
    }

    manifold.colliding = true;
    manifold.depth = minOverlap;

    const dirX = bx - ax;
    const dirY = by - ay;
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
    for (const v of vertsB) {
      const dx = v.x - ax;
      const dy = v.y - ay;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestVertex = v;
      }
    }
    manifold.contactPoints.push({ x: closestVertex.x, y: closestVertex.y });

    return manifold;
  }
}
