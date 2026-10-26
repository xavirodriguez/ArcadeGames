import {
  mountain,
  flatMount,
  distMount,
  flatDec,
  rock
} from "../generators/terrain/TerrainGenerator";
import { Prng } from "../random/Prng";
import { Noise } from "../noise/Noise";

describe("Terrain Generators (mountain, flatMount, distMount, flatDec, rock)", () => {
  const prng = new Prng(555);
  const noise = new Noise(555);

  it("rock generates faceted stone polygon primitives", () => {
    const primitives = rock(100, 200, 1, { prng });
    expect(primitives.length).toBeGreaterThan(0);
    primitives.forEach(p => expect(p.type).toBe("polygon"));
  });

  it("mountain generates ridge polygon and vegetation without NaN coordinates", () => {
    const primitives = mountain(300, 400, 10, { hei: 150, wid: 400, veg: true, prng, noise });
    expect(primitives.length).toBeGreaterThan(1);

    primitives.forEach(prim => {
      if (prim.type === "polygon" || prim.type === "polyline") {
        prim.points.forEach(pt => {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        });
      }
    });
  });

  it("flatMount and distMount produce valid landscape silhouettes", () => {
    const flatPrims = flatMount(0, 300, 5, { prng, noise });
    expect(flatPrims.length).toBeGreaterThan(0);

    const distPrims = distMount(0, 300, 5, { prng, noise });
    expect(distPrims.length).toBeGreaterThan(0);
  });

  it("flatDec generates decorative ground accents", () => {
    const decPrims = flatDec(100, 300, { prng });
    expect(decPrims.length).toBeGreaterThan(0);
  });
});
