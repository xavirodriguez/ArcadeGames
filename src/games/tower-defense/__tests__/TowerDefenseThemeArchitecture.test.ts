import fs from "fs";
import path from "path";
import { resolveTowerDefenseTheme, classicTheme } from "../mods/registry";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "../rendering/TowerDefenseVisualTokens";

describe("Tower Defense theme presentation separation", () => {
  it("resolves classic theme with role colour tokens", () => {
    expect(resolveTowerDefenseTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(TOWER_DEFENSE_VISUAL_TOKENS);
    expect(classicTheme.tokens.creeps.grunt).toBe("#ff2d55");
    expect(classicTheme.tokens.roles.creep_boss).toBe("#ef4444");
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
