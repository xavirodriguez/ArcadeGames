import {
  cloud01,
  bird01,
  boat01,
  reeds01,
  lantern01,
  flag01
} from "../generators/environment/EnvironmentGenerator";
import { Prng } from "../random/Prng";

describe("Environmental Generators (cloud01, bird01, boat01, reeds01, lantern01, flag01)", () => {
  const prng = new Prng(888);

  it("cloud01 generates blob primitive clusters", () => {
    const primitives = cloud01(100, 50, 1, { prng });
    expect(primitives.length).toBeGreaterThan(0);
    primitives.forEach(p => expect(p.type).toBe("polygon"));
  });

  it("bird01 generates stroke wing silhouettes", () => {
    const primitives = bird01(200, 80, 2, { prng });
    expect(primitives.length).toBeGreaterThan(0);
  });

  it("boat01, reeds01, lantern01, flag01 produce valid vector objects", () => {
    expect(boat01(100, 300, 3, { prng }).length).toBeGreaterThan(0);
    expect(reeds01(150, 300, { prng }).length).toBeGreaterThan(0);
    expect(lantern01(200, 100, { prng }).length).toBeGreaterThan(0);
    expect(flag01(250, 200, { prng }).length).toBeGreaterThan(0);
  });
});
