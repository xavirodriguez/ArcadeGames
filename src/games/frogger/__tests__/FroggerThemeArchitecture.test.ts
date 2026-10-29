import fs from "fs";
import path from "path";
import { resolveFroggerTheme, classicTheme } from "../mods/registry";
import { FROGGER_VISUAL_TOKENS } from "../rendering/FroggerVisualTokens";
import { initializeFroggerRenderer } from "../rendering/FroggerPresentation";

describe("Frogger theme presentation separation", () => {
  it("resolves classic theme as default with shared visual tokens", () => {
    expect(resolveFroggerTheme()).toBe(classicTheme);
    expect(resolveFroggerTheme("classic")).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(FROGGER_VISUAL_TOKENS);
    expect(classicTheme.initializeRenderer).toBe(initializeFroggerRenderer);
  });

  it("keeps the theme module free of gameplay system registration", () => {
    expect("registerSystems" in classicTheme).toBe(false);
    const source = fs.readFileSync(
      path.resolve(__dirname, "../mods/classic/ClassicTheme.ts"),
      "utf-8"
    );
    expect(source).not.toMatch(/registerSystems|WorldCommand|CollisionSystem/);
  });

  it("does not invent an empty GameplayMod", () => {
    const modsDir = path.resolve(__dirname, "../mods");
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(name);
      }
      return out;
    };
    expect(walk(modsDir).some((f) => /Gameplay/i.test(f))).toBe(false);
  });
});
