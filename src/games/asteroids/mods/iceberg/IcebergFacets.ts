import {
  ICEBERG_LIGHT_DIR,
  type IcebergFacetTone
} from "./IcebergPalette";
import type { IcebergVertex } from "./IcebergGeometry";

/**
 * Pure facet shading helpers for Borealis drawers (Phase 2).
 * No side effects — safe to unit-test and share across Canvas / Skia.
 *
 * @public
 */

export interface IcebergFacet {
  /** Edge start vertex index into the polygon. */
  i0: number;
  /** Edge end vertex index. */
  i1: number;
  /** Outward-ish normal (2D, not necessarily unit). */
  nx: number;
  ny: number;
  /** light | mid | dark from polar sun. */
  tone: IcebergFacetTone;
}

function classifyTone(dot: number): IcebergFacetTone {
  if (dot > 0.25) return "light";
  if (dot < -0.15) return "dark";
  return "mid";
}

/**
 * Builds facet descriptors for a closed polygon under ICEBERG_LIGHT_DIR.
 * Each edge becomes one facet; drawers fill triangles fan or stroke edges
 * according to tone.
 */
export function buildFacets(verts: ReadonlyArray<IcebergVertex>): IcebergFacet[] {
  const n = verts.length;
  if (n < 3) return [];

  const facets: IcebergFacet[] = [];
  const lx = ICEBERG_LIGHT_DIR.x;
  const ly = ICEBERG_LIGHT_DIR.y;

  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    // Outward normal for CCW polygon in screen space (y-down): (ey, -ex)
    // Asteroids verts are generated CCW in math angles; canvas y is down,
    // so we keep (ey, -ex) and let the light vector absorb the convention.
    let nx = ey;
    let ny = -ex;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const dot = nx * lx + ny * ly;
    facets.push({
      i0: i,
      i1: (i + 1) % n,
      nx,
      ny,
      tone: classifyTone(dot)
    });
  }

  return facets;
}

/**
 * Filled triangle fan from centroid: each triangle gets the tone of its
 * outer edge. Useful for solid ice blocks with 3-tone volume.
 */
export function buildFanFacets(
  verts: ReadonlyArray<IcebergVertex>
): Array<{ a: IcebergVertex; b: IcebergVertex; c: IcebergVertex; tone: IcebergFacetTone }> {
  const n = verts.length;
  if (n < 3) return [];

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += verts[i].x;
    cy += verts[i].y;
  }
  cx /= n;
  cy /= n;
  const center: IcebergVertex = { x: cx, y: cy };

  const edgeFacets = buildFacets(verts);
  const fans: Array<{ a: IcebergVertex; b: IcebergVertex; c: IcebergVertex; tone: IcebergFacetTone }> = [];

  for (let i = 0; i < n; i++) {
    const f = edgeFacets[i];
    fans.push({
      a: center,
      b: verts[f.i0],
      c: verts[f.i1],
      tone: f.tone
    });
  }

  return fans;
}
