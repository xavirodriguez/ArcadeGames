import {
  distance,
  midPt,
  areaOf,
  sidesOf,
  intersect,
  ptInPoly,
  shatter,
  triangulate
} from "../geometry/PolyTools";
import { poly } from "../geometry/poly";
import { stroke } from "../geometry/stroke";
import { blob } from "../geometry/blob";
import { Prng } from "../random/Prng";
import { Noise } from "../noise/Noise";

describe("Procedural Geometry Engine", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];

  describe("PolyTools", () => {
    it("computes accurate distance and midpoint", () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(midPt([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toEqual({ x: 5, y: 10 });
    });

    it("calculates area and side lengths of polygons", () => {
      expect(areaOf(square)).toBe(100);
      expect(sidesOf(square)).toEqual([10, 10, 10, 10]);
    });

    it("detects line segment intersections and point in polygon", () => {
      const seg1: [{ x: number; y: number }, { x: number; y: number }] = [
        { x: 0, y: 5 },
        { x: 10, y: 5 }
      ];
      const seg2: [{ x: number; y: number }, { x: number; y: number }] = [
        { x: 5, y: 0 },
        { x: 5, y: 10 }
      ];
      const pt = intersect(seg1, seg2);
      expect(pt).toEqual({ x: 5, y: 5 });

      expect(ptInPoly({ x: 5, y: 5 }, square)).toBe(true);
      expect(ptInPoly({ x: 15, y: 15 }, square)).toBe(false);
    });

    it("shatters and triangulates polygons into valid sub-triangles", () => {
      const fragments = shatter(square, 25);
      expect(fragments.length).toBeGreaterThan(1);
      fragments.forEach(frag => {
        expect(frag).toHaveLength(3);
        frag.forEach(p => {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        });
      });

      const triList = triangulate(square, { area: 20 });
      expect(triList.length).toBeGreaterThan(0);
    });
  });

  describe("Shape Primitives (poly, stroke, blob)", () => {
    it("poly constructs a valid PolygonPrimitive", () => {
      const prim = poly(square, { xof: 5, yof: 5, fil: "#ff0000" });
      expect(prim.type).toBe("polygon");
      expect(prim.fill).toBe("#ff0000");
      expect(prim.points[0]).toEqual({ x: 5, y: 5 });
    });

    it("stroke constructs variable width polygon contour", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 }
      ];
      const prng = new Prng(123);
      const noise = new Noise(123);

      const prim = stroke(pts, { wid: 10, prng, noise }) as import("../types/ProceduralTypes").PolygonPrimitive;
      expect(prim.type).toBe("polygon");
      expect(prim.points.length).toBeGreaterThan(3);
    });

    it("blob generates multi-vertex organic shape", () => {
      const prng = new Prng(456);
      const noise = new Noise(456);

      const prim = blob(100, 100, { len: 40, wid: 20, prng, noise }) as import("../types/ProceduralTypes").PolygonPrimitive;
      expect(prim.type).toBe("polygon");
      expect(prim.points.length).toBeGreaterThan(10);
    });
  });
});
