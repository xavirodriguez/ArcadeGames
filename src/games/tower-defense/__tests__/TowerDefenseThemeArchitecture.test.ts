import fs from "fs";
import path from "path";
import { resolveTowerDefenseTheme, classicTheme } from "../mods/registry";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "../presentation/TowerDefenseVisualTokens";
import { TOWER_DEFENSE_VISUAL_TOKENS as legacyVisualTokens } from "../rendering/TowerDefenseVisualTokens";

describe("Tower Defense theme presentation separation", () => {
  it("resolves classic theme with role colour tokens", () => {
    expect(resolveTowerDefenseTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(TOWER_DEFENSE_VISUAL_TOKENS);
    expect(classicTheme.tokens.creeps.grunt).toBe("#ff2d55");
    expect(classicTheme.tokens.roles.creep_boss).toBe("#ef4444");
    expect(legacyVisualTokens).toBe(TOWER_DEFENSE_VISUAL_TOKENS);
    expect(TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.grunt.fill).toBe("#ff8a3d");
    expect(TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.basic.primary).toBe("#4fc3f7");
  });

  it("wires tokens into entity defaults, fallbacks and Canvas/Skia drawers", () => {
    const consumers = [
      ["../EntityFactory.ts", "TOWER_DEFENSE_VISUAL_TOKENS.entityDefaults"],
      ["../TowerDefenseGame.ts", "TOWER_DEFENSE_VISUAL_TOKENS.creeps"],
      ["../rendering/TowerDefenseVisualHelpers.ts", "TOWER_DEFENSE_VISUAL_TOKENS.creepRendering"],
      ["../rendering/TowerDefenseCanvasVisuals.ts", "TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas"],
      ["../rendering/TowerDefenseSkiaVisuals.ts", "TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia"]
    ] as const;
    for (const [relativePath, tokenExpression] of consumers) {
      const source = fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");
      expect(source).toContain(tokenExpression);
    }
  });

  it("does not touch combat or economy modules from the theme", () => {
    expect("registerSystems" in classicTheme).toBe(false);
    const source = fs.readFileSync(
      path.resolve(__dirname, "../mods/classic/ClassicTheme.ts"),
      "utf-8"
    );
    expect(source).not.toMatch(/WaveSystem|Economy|BuildInput|registerSystems/);
  });
});
