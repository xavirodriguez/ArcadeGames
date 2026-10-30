import fs from "fs";
import path from "path";

const canvasSource = fs.readFileSync(
  path.resolve(__dirname, "../rendering/TowerDefenseCanvasVisuals.ts"),
  "utf-8"
);
const skiaSource = fs.readFileSync(
  path.resolve(__dirname, "../rendering/TowerDefenseSkiaVisuals.ts"),
  "utf-8"
);

describe("Tower Defense entity projection backend contract", () => {
  it.each([
    ["Canvas", canvasSource],
    ["Skia", skiaSource],
  ])("%s projects towers, creeps and projectiles through the shared resolver", (_backend, source) => {
    const resolvedEntityTypes = Array.from(
      source.matchAll(/resolveEntityIsometricOffset\(world, entity, "(tower|creep|projectile)"\)/g),
      (match) => match[1]
    ).sort();

    expect(resolvedEntityTypes).toEqual([
      "creep",
      "creep",
      "creep",
      "creep",
      "projectile",
      "tower",
    ]);
    expect(source).toContain("screenX - worldX, screenY - worldY");
    expect(source).toContain("projectVector(projection.isoCfg, velocity.vx, velocity.vy)");
  });
});
