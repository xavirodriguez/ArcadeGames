import { createIcebergVerts, type IcebergSize, type IcebergVertex } from "./IcebergGeometry";

/**
 * Deterministic PRNG seeded by entity id (same LCG family as classic silhouette).
 * Presentation-only — never use Math.random in drawers.
 *
 * @public
 */
export function entitySeededRandom(entitySeed: number): () => number {
  let s = (entitySeed + 78001) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Map collider/render radius to iceberg mass tier. */
export function radiusToIcebergSize(radius: number): IcebergSize {
  if (radius > 30) return "large";
  if (radius > 15) return "medium";
  return "small";
}

/** Build iceberg polygon verts for an entity (deterministic). */
export function vertsForAsteroidEntity(
  entityId: number,
  radius: number
): IcebergVertex[] {
  return createIcebergVerts(
    radiusToIcebergSize(radius),
    radius,
    entitySeededRandom(entityId)
  );
}
