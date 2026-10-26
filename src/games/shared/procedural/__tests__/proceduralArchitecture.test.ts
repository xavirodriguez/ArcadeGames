import {
  hut,
  box,
  roof,
  pagroof,
  arch01,
  arch02,
  arch03,
  arch04,
  transmissionTower01
} from "../generators/architecture/ArchitectureGenerator";
import { Prng } from "../random/Prng";

describe("Architecture Generators (hut, box, roof, pagroof, arch01..arch04, transmissionTower01)", () => {
  const prng = new Prng(777);

  const archFns = [
    { name: "hut", fn: (x: number, y: number) => hut(x, y, { prng }) },
    { name: "box", fn: (x: number, y: number) => box(x, y, { prng }) },
    { name: "roof", fn: (x: number, y: number) => roof(x, y, { prng }) },
    { name: "pagroof", fn: (x: number, y: number) => pagroof(x, y, { prng }) },
    { name: "arch01", fn: (x: number, y: number) => arch01(x, y, 1, { prng }) },
    { name: "arch02", fn: (x: number, y: number) => arch02(x, y, 1, { prng, sto: 3 }) },
    { name: "arch03", fn: (x: number, y: number) => arch03(x, y, 1, { prng }) },
    { name: "arch04", fn: (x: number, y: number) => arch04(x, y, 1, { prng }) },
    { name: "transmissionTower01", fn: (x: number, y: number) => transmissionTower01(x, y, 1, { prng }) }
  ];

  archFns.forEach(({ name, fn }) => {
    it(`${name} generates valid primitives`, () => {
      const primitives = fn(100, 200);
      expect(primitives.length).toBeGreaterThan(0);
      primitives.forEach(p => expect(p.type).toBeDefined());
    });
  });
});
