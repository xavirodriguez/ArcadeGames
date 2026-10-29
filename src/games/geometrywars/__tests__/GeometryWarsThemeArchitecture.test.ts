import fs from "fs";
import path from "path";
import { resolveGeometryWarsTheme, neonTheme } from "../mods/registry";
import { GEOMETRY_WARS_VISUAL_TOKENS } from "../presentation/GeometryWarsVisualTokens";
import { GEOMETRY_WARS_VISUAL_TOKENS as legacyVisualTokens } from "../rendering/GeometryWarsVisualTokens";
import { colors } from "../../../theme/colors";

describe("Geometry Wars theme presentation separation", () => {
  it("resolves neon theme with visual tokens", () => {
    expect(resolveGeometryWarsTheme()).toBe(neonTheme);
    expect(neonTheme.tokens).toBe(GEOMETRY_WARS_VISUAL_TOKENS);
    expect(neonTheme.tokens.player).toBeDefined();
    expect(neonTheme.tokens.bullet).toBeDefined();
    expect(legacyVisualTokens).toBe(GEOMETRY_WARS_VISUAL_TOKENS);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.chaser).toBe(GEOMETRY_WARS_VISUAL_TOKENS.seeker);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.grunt).toBe(GEOMETRY_WARS_VISUAL_TOKENS.player);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.canvas.evader).toBe(colors.warning);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.skia.chaser).toBe(colors.magenta);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.skia.bullet).toBe(colors.yellow);
    expect(GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.skia.fastSeeker).toBe(colors.danger);
  });

  it("wires canonical tokens into entity creation, pooling and both render backends", () => {
    const consumers = [
      ["../GeometryWarsGame.ts", "GEOMETRY_WARS_VISUAL_TOKENS.player"],
      ["../entities/GeometryWarsEntities.ts", "GEOMETRY_WARS_VISUAL_TOKENS.chaser"],
      ["../EntityPool.ts", "GEOMETRY_WARS_VISUAL_TOKENS.bullet"],
      ["../rendering/GeometryWarsVisualLogic.ts", "GEOMETRY_WARS_VISUAL_TOKENS.trailPrimary"],
      ["../rendering/GeometryWarsCanvasVisuals.ts", "GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.canvas"],
      ["../rendering/GeometryWarsSkiaVisuals.ts", "GEOMETRY_WARS_VISUAL_TOKENS.fallbacks.skia"]
    ] as const;
    for (const [relativePath, tokenExpression] of consumers) {
      const source = fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");
      expect(source).toContain(tokenExpression);
    }
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
