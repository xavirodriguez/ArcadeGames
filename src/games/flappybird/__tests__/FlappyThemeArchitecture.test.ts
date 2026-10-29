import fs from "fs";
import path from "path";
import { OFFICE_PAPER_THEME_ID } from "../theme/FlappyThemeShared";
import {
  resolveFlappyTheme,
  resolveFlappyCanvasVisuals,
  resolveFlappySkiaVisuals,
  neonThemeModule,
  officePaperThemeModule
} from "../mods/registry";
import { drawOfficePaperBird } from "../mods/officePaper/OfficePaperCanvasVisuals";
import { drawSkiaOfficePaperBird } from "../mods/officePaper/OfficePaperSkiaVisuals";
import { drawFlappyBird } from "../rendering/FlappyBirdCanvasVisuals";
import { drawSkiaFlappyBird } from "../rendering/FlappyBirdSkiaVisuals";

describe("Flappy Bird theme presentation separation", () => {
  it("resolves neon as default and office-paper by concept-pack id", () => {
    expect(resolveFlappyTheme(undefined)).toBe(neonThemeModule);
    expect(resolveFlappyTheme("default")).toBe(neonThemeModule);
    expect(resolveFlappyTheme("neon")).toBe(neonThemeModule);
    expect(resolveFlappyTheme(OFFICE_PAPER_THEME_ID)).toBe(officePaperThemeModule);
    expect(resolveFlappyTheme({ conceptPack: { id: OFFICE_PAPER_THEME_ID } } as any)).toBe(
      officePaperThemeModule
    );
  });

  it("preserves legacy resolveFlappyCanvasVisuals / resolveFlappySkiaVisuals APIs", () => {
    expect(resolveFlappyCanvasVisuals(OFFICE_PAPER_THEME_ID).drawBird).toBe(drawOfficePaperBird);
    expect(resolveFlappySkiaVisuals(OFFICE_PAPER_THEME_ID).drawBird).toBe(drawSkiaOfficePaperBird);
    expect(resolveFlappyCanvasVisuals("neon").drawBird).toBe(drawFlappyBird);
    expect(resolveFlappySkiaVisuals(undefined).drawBird).toBe(drawSkiaFlappyBird);
  });

  it("keeps theme modules free of gameplay system registration", () => {
    expect("registerSystems" in neonThemeModule).toBe(false);
    expect("registerSystems" in officePaperThemeModule).toBe(false);
    const officeSource = fs.readFileSync(
      path.resolve(__dirname, "../mods/officePaper/OfficePaperTheme.ts"),
      "utf-8"
    );
    expect(officeSource).not.toMatch(/System|registerSystems|WorldCommand/);
    const neonSource = fs.readFileSync(
      path.resolve(__dirname, "../mods/neon/NeonTheme.ts"),
      "utf-8"
    );
    expect(neonSource).not.toMatch(/System|registerSystems|WorldCommand/);
  });

  it("does not invent an empty GameplayMod for a pure-presentation aesthetic", () => {
    const officeDir = path.resolve(__dirname, "../mods/officePaper");
    const files = fs.readdirSync(officeDir);
    expect(files.some((f) => /Gameplay/i.test(f))).toBe(false);
  });
});
