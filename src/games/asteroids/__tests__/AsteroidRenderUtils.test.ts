import { resolveAsteroidRadius } from "../rendering/AsteroidRenderUtils";
import { ShapeType } from "@tiny-aster/core";

describe("AsteroidRenderUtils", () => {
  it("resolveAsteroidRadius resolves radius from circle collider when enabled", () => {
    const r = resolveAsteroidRadius(
      { size: 100 },
      { enabled: true, shape: { type: ShapeType.Circle, radius: 42 } }
    );
    expect(r).toBe(42);
  });

  it("resolveAsteroidRadius falls back to render.size / 2", () => {
    const r = resolveAsteroidRadius({ size: 60 }, undefined);
    expect(r).toBe(30);
  });

  it("resolveAsteroidRadius falls back to default 25", () => {
    const r = resolveAsteroidRadius(undefined, undefined);
    expect(r).toBe(25);
  });
});
