import {
  tree01,
  tree02,
  tree03,
  tree04,
  tree05,
  tree06,
  tree07,
  tree08,
  barkify
} from "../generators/vegetation/TreeGenerator";
import { Prng } from "../random/Prng";
import { Noise } from "../noise/Noise";

describe("Vegetation Generators (tree01..tree08)", () => {
  const prng = new Prng(123);
  const noise = new Noise(123);

  const treeFns = [
    { name: "tree01", fn: tree01 },
    { name: "tree02", fn: tree02 },
    { name: "tree03", fn: tree03 },
    { name: "tree04", fn: tree04 },
    { name: "tree05", fn: tree05 },
    { name: "tree06", fn: tree06 },
    { name: "tree07", fn: tree07 },
    { name: "tree08", fn: tree08 }
  ];

  treeFns.forEach(({ name, fn }) => {
    it(`${name} generates non-empty vector primitives without NaN or infinity`, () => {
      const primitives = fn(100, 200, { hei: 60, wid: 5, prng, noise });
      expect(primitives.length).toBeGreaterThan(0);

      primitives.forEach(prim => {
        expect(prim.type).toBeDefined();
        if (prim.type === "polygon" || prim.type === "polyline") {
          prim.points.forEach(p => {
            expect(Number.isFinite(p.x)).toBe(true);
            expect(Number.isFinite(p.y)).toBe(true);
          });
        }
      });
    });
  });

  it("barkify generates bark texture line primitives", () => {
    const pts = [
      { x: 10, y: 10 },
      { x: 10, y: 50 },
      { x: 10, y: 100 }
    ];
    const bark = barkify(pts, prng, noise);
    expect(bark.length).toBeGreaterThan(0);
    expect(bark[0].type).toBe("line");
  });
});
