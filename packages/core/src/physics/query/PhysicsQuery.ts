import { World, BlueprintRegistryMap } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape, ShapeType, ConvexPolygonShape, BoxShape } from "../shapes/Shapes";
import { NarrowPhase } from "../collision/NarrowPhase";
import { ComponentRegistry } from "../../ecs/Component";
import { EventRegistry } from "../../events/EventBus";
import { getColliderWorldCenter } from "../PhysicsTypes";
import { getColliderWorldBounds } from "../utils/PhysicsTransform";
import { queryActiveColliders } from "./PhysicsQueryHelper";

/**
 * Detailed raycast intersection result describing a hit against an entity's collider.
 * @public
 */
export interface RaycastHit {
  /** Entity carrying the intersected collider. */
  entity: Entity;
  /** World-space coordinate where the ray intersected the collider boundary. */
  point: { x: number; y: number };
  /** Normalized surface normal vector pointing away from the collider face. */
  normal: { x: number; y: number };
  /** Distance from ray origin to intersection point along the ray vector. */
  distance: number;
}

/**
 * Utility for performing physics-based spatial queries on the ECS world.
 *
 * @remarks
 * Enforces strong type-safety by parameterizing over the world's `ComponentRegistry` to avoid type assertions.
 * Uses `PhysicsTransformLike` and `ColliderLike` structural subtyping to query entities without strict component registry coupling.
 *
 * @public
 */
export class PhysicsQuery {
  /**
   * Casts a 2D point into the world and returns all entities whose collider intersects the point.
   *
   * @remarks
   * Evaluates point intersection against Circle, Box, and Convex Polygon geometries, accounting for world rotation and offsets.
   *
   * @param world - Simulation world instance containing Transform and Collider components.
   * @param x - Target world-space X coordinate.
   * @param y - Target world-space Y coordinate.
   * @returns Array of entity IDs overlapping the query point.
   */
  public static pointCast<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, x: number, y: number): Entity[] {
    const results: Entity[] = [];
    for (const { entity, transform, collider } of queryActiveColliders(world)) {
      const bounds = getColliderWorldBounds(transform, collider);
      if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
        continue;
      }

      const { cx, cy } = getColliderWorldCenter(transform, collider);

      const shape = collider.shape;
      if (shape.type === ShapeType.Circle) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= shape.radius * shape.radius) {
          results.push(entity);
        }
      } else if (shape.type === ShapeType.Box) {
        const halfW = shape.width / 2;
        const halfH = shape.height / 2;
        const rot = transform.worldRotation ?? transform.rotation ?? 0;
        if (rot !== 0) {
          const cos = Math.cos(-rot);
          const sin = Math.sin(-rot);
          const rx = cos * (x - cx) - sin * (y - cy);
          const ry = sin * (x - cx) + cos * (y - cy);
          if (Math.abs(rx) <= halfW && Math.abs(ry) <= halfH) {
            results.push(entity);
          }
        } else {
          if (Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfH) {
            results.push(entity);
          }
        }
      } else if (shape.type === ShapeType.Polygon) {
        const poly = shape as ConvexPolygonShape;
        if (poly.vertices) {
          const rot = transform.worldRotation ?? transform.rotation ?? 0;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const worldVerts = poly.vertices.map((v) => {
            const rx = cos * v.x - sin * v.y;
            const ry = sin * v.x + cos * v.y;
            return { x: cx + rx, y: cy + ry };
          });
          let inside = false;
          for (let i = 0, j = worldVerts.length - 1; i < worldVerts.length; j = i++) {
            const xi = worldVerts[i].x, yi = worldVerts[i].y;
            const xj = worldVerts[j].x, yj = worldVerts[j].y;
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  /**
   * Casts a primitive geometry shape into the world and returns all entities overlapping the shape.
   *
   * @remarks
   * Evaluates narrowphase SAT overlap using `NarrowPhase.test` between the input shape and world colliders.
   *
   * @param world - Simulation world instance containing Transform and Collider components.
   * @param shape - Query shape geometry (Circle, Box, or Convex Polygon).
   * @param x - World-space position X of the query shape center.
   * @param y - World-space position Y of the query shape center.
   * @returns Array of entity IDs overlapping the query shape.
   */
  public static shapeCast<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, shape: Shape, x: number, y: number): Entity[] {
    const results: Entity[] = [];
    for (const { entity, transform, collider } of queryActiveColliders(world)) {
      const { cx, cy } = getColliderWorldCenter(transform, collider);
      const rot = transform.worldRotation ?? transform.rotation ?? 0;

      const manifold = NarrowPhase.test(shape, x, y, 0, collider.shape, cx, cy, rot);
      if (manifold.colliding) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Finds the nearest entity with an active collider to a given point in 2D world space.
   *
   * @remarks
   * Evaluates distance to collider center in world coordinates.
   * Supports optional `radius` search boundary and custom `filter` predicate.
   * Tie-breaks identical distances deterministically by selecting the entity with the lower ID.
   *
   * @param world - Simulation world instance.
   * @param x - Target X coordinate.
   * @param y - Target Y coordinate.
   * @param options - Optional radius limit and filter predicate.
   * @returns Object containing the nearest `entity` and its `distance`, or `null` if no matching entity found.
   */
  public static nearest<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(
    world: World<TComponents, TEvents, TBlueprints>,
    x: number,
    y: number,
    options?: {
      radius?: number;
      filter?: (entity: Entity) => boolean;
    }
  ): { entity: Entity; distance: number } | null {
    let bestEntity: Entity | null = null;
    let bestDist = Infinity;
    const radiusSq = options?.radius !== undefined ? options.radius * options.radius : Infinity;

    for (const { entity, transform, collider } of queryActiveColliders(world)) {
      if (options?.filter && !options.filter(entity)) {
        continue;
      }

      const { cx, cy } = getColliderWorldCenter(transform, collider);
      const dx = cx - x;
      const dy = cy - y;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSq) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      // Floating-point equality epsilon for deterministic tie-breaking by entity ID
      if (Math.abs(dist - bestDist) < 1e-9) {
        if (bestEntity === null || entity < bestEntity) {
          bestEntity = entity;
          bestDist = dist;
        }
      } else if (dist < bestDist) {
        bestEntity = entity;
        bestDist = dist;
      }
    }

    if (bestEntity === null) {
      return null;
    }

    return {
      entity: bestEntity,
      distance: bestDist,
    };
  }

  /**
   * Casts a ray through world space and returns all collider hits sorted by distance.
   *
   * @remarks
   * Evaluates ray intersection against Circle, Box (rotated/OBB), and Convex Polygon geometries.
   * Pre-filters candidates using AABB bounds checks before performing detailed ray-shape testing.
   * Hits are sorted primarily by distance ascending, with deterministic tie-breaking by entity ID ascending.
   *
   * @param world - Simulation world instance.
   * @param origin - World-space origin coordinate `{ x, y }` of the ray.
   * @param direction - Direction vector `{ x, y }` of the ray (will be normalized automatically).
   * @param maxDistance - Maximum reach distance of the ray.
   * @param options - Optional filter predicate.
   * @returns Array of detailed `RaycastHit` objects sorted by distance.
   */
  public static raycastAll<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(
    world: World<TComponents, TEvents, TBlueprints>,
    origin: { x: number; y: number },
    direction: { x: number; y: number },
    maxDistance: number,
    options?: {
      filter?: (entity: Entity) => boolean;
    }
  ): RaycastHit[] {
    const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (dirLen < 1e-9) {
      return [];
    }
    const dx = direction.x / dirLen;
    const dy = direction.y / dirLen;

    const hits: RaycastHit[] = [];

    for (const { entity, transform, collider } of queryActiveColliders(world)) {
      if (options?.filter && !options.filter(entity)) {
        continue;
      }

      // Fast AABB pre-filter check
      const bounds = getColliderWorldBounds(transform, collider);
      if (
        !rayIntersectsAABB(
          origin.x,
          origin.y,
          dx,
          dy,
          maxDistance,
          bounds.minX,
          bounds.maxX,
          bounds.minY,
          bounds.maxY
        )
      ) {
        continue;
      }

      const { cx, cy } = getColliderWorldCenter(transform, collider);
      const rot = transform.worldRotation ?? transform.rotation ?? 0;
      const shape = collider.shape;

      let hitResult: { point: { x: number; y: number }; normal: { x: number; y: number }; distance: number } | null = null;

      if (shape.type === ShapeType.Circle) {
        hitResult = rayIntersectCircle(origin.x, origin.y, dx, dy, maxDistance, cx, cy, shape.radius);
      } else if (shape.type === ShapeType.Box) {
        hitResult = rayIntersectBox(origin.x, origin.y, dx, dy, maxDistance, cx, cy, shape as BoxShape, rot);
      } else if (shape.type === ShapeType.Polygon) {
        const poly = shape as ConvexPolygonShape;
        if (poly.vertices && poly.vertices.length >= 3) {
          hitResult = rayIntersectPolygon(origin.x, origin.y, dx, dy, maxDistance, cx, cy, poly.vertices, rot);
        }
      }

      if (hitResult) {
        hits.push({
          entity,
          point: hitResult.point,
          normal: hitResult.normal,
          distance: hitResult.distance,
        });
      }
    }

    // Sort by distance ascending, tie-break deterministically by Entity ID ascending
    hits.sort((a, b) => {
      const diff = a.distance - b.distance;
      if (Math.abs(diff) < 1e-9) {
        return a.entity - b.entity;
      }
      return diff;
    });

    return hits;
  }

  /**
   * Casts a ray through world space and returns the first collider hit, or `null`.
   *
   * @param world - Simulation world instance.
   * @param origin - World-space origin coordinate `{ x, y }` of the ray.
   * @param direction - Direction vector `{ x, y }` of the ray (normalized automatically).
   * @param maxDistance - Maximum reach distance of the ray.
   * @param options - Optional filter predicate.
   * @returns Nearest `RaycastHit` object or `null` if no collider was hit.
   */
  public static raycast<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(
    world: World<TComponents, TEvents, TBlueprints>,
    origin: { x: number; y: number },
    direction: { x: number; y: number },
    maxDistance: number,
    options?: {
      filter?: (entity: Entity) => boolean;
    }
  ): RaycastHit | null {
    const hits = PhysicsQuery.raycastAll(world, origin, direction, maxDistance, options);
    return hits[0] ?? null;
  }
}

/**
 * Fast ray-AABB intersection check used as broadphase pre-filter for raycasts.
 */
/**
 * Evaluates axis interval intersection for a ray against slab boundaries.
 */
function checkRaySlab(
  o: number,
  d: number,
  min: number,
  max: number,
  tmin: number,
  tmax: number
): { tmin: number; tmax: number } | null {
  if (Math.abs(d) < 1e-9) {
    if (o < min || o > max) return null;
    return { tmin, tmax };
  }
  const invD = 1 / d;
  let t1 = (min - o) * invD;
  let t2 = (max - o) * invD;
  if (t1 > t2) {
    const tmp = t1;
    t1 = t2;
    t2 = tmp;
  }
  const newTmin = Math.max(tmin, t1);
  const newTmax = Math.min(tmax, t2);
  if (newTmin > newTmax) return null;
  return { tmin: newTmin, tmax: newTmax };
}

/**
 * Fast ray-AABB intersection check used as broadphase pre-filter for raycasts.
 */
function rayIntersectsAABB(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxDistance: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  let tmin = 0;
  let tmax = maxDistance;

  const resX = checkRaySlab(ox, dx, minX, maxX, tmin, tmax);
  if (!resX) return false;
  tmin = resX.tmin;
  tmax = resX.tmax;

  const resY = checkRaySlab(oy, dy, minY, maxY, tmin, tmax);
  if (!resY) return false;
  tmin = resY.tmin;
  tmax = resY.tmax;

  return tmax >= tmin && tmax >= 0 && tmin <= maxDistance;
}

/**
 * Evaluates ray intersection against a circle shape.
 */
function rayIntersectCircle(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxDistance: number,
  cx: number,
  cy: number,
  radius: number
): { point: { x: number; y: number }; normal: { x: number; y: number }; distance: number } | null {
  const relX = ox - cx;
  const relY = oy - cy;
  const b = 2 * (relX * dx + relY * dy);
  const c = relX * relX + relY * relY - radius * radius;
  const delta = b * b - 4 * c;

  if (delta < 0) {
    return null;
  }

  const sqrtDelta = Math.sqrt(delta);
  let t = (-b - sqrtDelta) / 2;

  if (t < 0) {
    t = (-b + sqrtDelta) / 2; // Ray origin inside circle
  }

  if (t < 0 || t > maxDistance) {
    return null;
  }

  const px = ox + t * dx;
  const py = oy + t * dy;

  let nx = px - cx;
  let ny = py - cy;
  const nLen = Math.sqrt(nx * nx + ny * ny);

  if (nLen > 1e-9) {
    nx /= nLen;
    ny /= nLen;
  } else {
    nx = -dx;
    ny = -dy;
  }

  return {
    point: { x: px, y: py },
    normal: { x: nx, y: ny },
    distance: t,
  };
}

/**
 * Evaluates ray intersection against an oriented box shape (OBB).
 */
function rayIntersectBox(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxDistance: number,
  cx: number,
  cy: number,
  box: BoxShape,
  rot: number
): { point: { x: number; y: number }; normal: { x: number; y: number }; distance: number } | null {
  const halfW = box.width / 2;
  const halfH = box.height / 2;

  // Transform ray to box local coordinate space
  const relX = ox - cx;
  const relY = oy - cy;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);

  const lox = cos * relX - sin * relY;
  const loy = sin * relX + cos * relY;
  const ldx = cos * dx - sin * dy;
  const ldy = sin * dx + cos * dy;

  let tNear = -Infinity;
  let tFar = Infinity;
  let normalX = 0;
  let normalY = 0;

  // X slab
  if (Math.abs(ldx) < 1e-9) {
    if (lox < -halfW || lox > halfW) return null;
  } else {
    let t1 = (-halfW - lox) / ldx;
    let t2 = (halfW - lox) / ldx;
    let nx1 = -1;
    let nx2 = 1;
    if (t1 > t2) {
      const tmpT = t1;
      t1 = t2;
      t2 = tmpT;
      nx1 = 1;
      nx2 = -1;
    }
    if (t1 > tNear) {
      tNear = t1;
      normalX = nx1;
      normalY = 0;
    }
    if (t2 < tFar) {
      tFar = t2;
    }
    if (tNear > tFar) return null;
  }

  // Y slab
  if (Math.abs(ldy) < 1e-9) {
    if (loy < -halfH || loy > halfH) return null;
  } else {
    let t1 = (-halfH - loy) / ldy;
    let t2 = (halfH - loy) / ldy;
    let ny1 = -1;
    let ny2 = 1;
    if (t1 > t2) {
      const tmpT = t1;
      t1 = t2;
      t2 = tmpT;
      ny1 = 1;
      ny2 = -1;
    }
    if (t1 > tNear) {
      tNear = t1;
      normalX = 0;
      normalY = ny1;
    }
    if (t2 < tFar) {
      tFar = t2;
    }
    if (tNear > tFar) return null;
  }

  let tHit = tNear;
  if (tHit < 0) {
    tHit = tFar; // Ray origin inside box
    if (tHit < 0) return null;
    normalX = -ldx;
    normalY = -ldy;
  }

  if (tHit > maxDistance) {
    return null;
  }

  const hitLocalX = lox + tHit * ldx;
  const hitLocalY = loy + tHit * ldy;

  const cosW = Math.cos(rot);
  const sinW = Math.sin(rot);

  const pointX = cx + cosW * hitLocalX - sinW * hitLocalY;
  const pointY = cy + sinW * hitLocalX + cosW * hitLocalY;

  const normLen = Math.sqrt(normalX * normalX + normalY * normalY);
  if (normLen > 1e-9) {
    normalX /= normLen;
    normalY /= normLen;
  }

  const normWorldX = cosW * normalX - sinW * normalY;
  const normWorldY = sinW * normalX + cosW * normalY;

  return {
    point: { x: pointX, y: pointY },
    normal: { x: normWorldX, y: normWorldY },
    distance: tHit,
  };
}

/**
 * Evaluates ray intersection against a convex polygon shape.
 */
function rayIntersectPolygon(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxDistance: number,
  cx: number,
  cy: number,
  localVertices: Array<{ x: number; y: number }>,
  rot: number
): { point: { x: number; y: number }; normal: { x: number; y: number }; distance: number } | null {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const worldVerts = localVertices.map((v) => ({
    x: cx + (cos * v.x - sin * v.y),
    y: cy + (sin * v.x + cos * v.y),
  }));

  const numVerts = worldVerts.length;
  let bestDist = Infinity;
  let bestPoint = { x: 0, y: 0 };
  let bestNormal = { x: 0, y: 0 };

  for (let i = 0; i < numVerts; i++) {
    const p1 = worldVerts[i];
    const p2 = worldVerts[(i + 1) % numVerts];

    const ex = p2.x - p1.x;
    const ey = p2.y - p1.y;

    const det = ex * dy - ey * dx;
    if (Math.abs(det) < 1e-9) {
      continue;
    }

    const dxAO = p1.x - ox;
    const dyAO = p1.y - oy;

    const t = (ex * dyAO - ey * dxAO) / det;
    const u = (dx * dyAO - dy * dxAO) / det;

    if (u >= 0 && u <= 1 && t >= 0 && t <= maxDistance) {
      if (t < bestDist) {
        bestDist = t;
        bestPoint = { x: ox + t * dx, y: oy + t * dy };

        // Edge normal pointing outward
        const eLen = Math.sqrt(ex * ex + ey * ey);
        let nx = -ey / (eLen || 1);
        let ny = ex / (eLen || 1);

        // Ensure normal faces away from polygon interior / towards ray origin
        if (nx * dx + ny * dy > 0) {
          nx = -nx;
          ny = -ny;
        }

        bestNormal = { x: nx, y: ny };
      }
    }
  }

  if (bestDist === Infinity) {
    return null;
  }

  return {
    point: bestPoint,
    normal: bestNormal,
    distance: bestDist,
  };
}
