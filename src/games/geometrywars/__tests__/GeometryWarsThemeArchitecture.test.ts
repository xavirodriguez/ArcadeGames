import fs from "fs";
import path from "path";
import { resolveGeometryWarsTheme, neonTheme } from "../mods/registry";
import { GEOMETRY_WARS_VISUAL_TOKENS } from "../rendering/GeometryWarsVisualTokens";

describe("Geometry Wars theme presentation separation", () => {
  it("resolves neon theme with visual tokens", () => {
    expect(resolveGeometryWarsTheme()).toBe(neonTheme);
    expect(neonTheme.tokens).toBe(GEOMETRY_WARS_VISUAL_TOKENS);
    expect(neonTheme.tokens.player).toBeDefined();
    expect(neonTheme.tokens.bullet).toBeDefined();
  });

  it("keeps theme free of gameplay systems", () => {
    expect("registerSystems" in neonTheme).toBe(false);
    const source = fs.readFileSync(
      path.resolve(__dirname, "../mods/neon/NeonTheme.ts"),
      "utf-8"
    );
    expect(source).not.toMatch(/registerSystems|WeaponSystem|Collision/);
  });
});
