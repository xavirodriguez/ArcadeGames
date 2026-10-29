import fs from "fs";
import path from "path";
import { aquiHayDragonesConceptPack } from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import {
  resolveSpaceInvadersGameplayMod,
  resolveSpaceInvadersMod,
  resolveSpaceInvadersTheme
} from "../mods";
import { classicTheme } from "../mods/classic/ClassicTheme";
import { classicGameplayMod } from "../mods/classic/ClassicGameplayMod";
import { nauticalTheme } from "../mods/nautical/NauticalTheme";
import { nauticalGameplayMod } from "../mods/nautical/NauticalGameplayMod";

describe("Space Invaders theme/gameplay separation", () => {
  it("keeps classic and nautical modules independently resolvable", () => {
    expect(resolveSpaceInvadersTheme("classic")).toBe(classicTheme);
    expect(resolveSpaceInvadersTheme("nautical")).toBe(nauticalTheme);
    expect(resolveSpaceInvadersTheme("aqui_hay_dragones")).toBe(nauticalTheme);
    expect(resolveSpaceInvadersTheme("nautical-chart")).toBe(nauticalTheme);
    expect(resolveSpaceInvadersGameplayMod("classic")).toBe(classicGameplayMod);
    expect(resolveSpaceInvadersGameplayMod("nautical")).toBe(nauticalGameplayMod);
    expect(resolveSpaceInvadersGameplayMod(aquiHayDragonesConceptPack)).toBe(nauticalGameplayMod);
  });

  it("preserves the legacy combined mod resolver", () => {
    expect(resolveSpaceInvadersMod("nautical").id).toBe("nautical");
    expect(resolveSpaceInvadersMod(aquiHayDragonesConceptPack).theme).toBe(nauticalTheme);
    expect(resolveSpaceInvadersMod("classic").gameplay).toBe(classicGameplayMod);
  });

  it("keeps presentation modules free of simulation-system registration", () => {
    expect("registerSystems" in nauticalTheme).toBe(false);
    expect("registerDrawers" in nauticalGameplayMod).toBe(false);
    const source = fs.readFileSync(path.resolve(__dirname, "../mods/nautical/NauticalTheme.ts"), "utf-8");
    expect(source).not.toContain("NauticalWindSystem");
    expect(source).not.toContain("IslandErosionSystem");
  });

  it("leaves Nautical simulation systems in the gameplay module", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../mods/nautical/NauticalGameplayMod.ts"), "utf-8");
    expect(source).toContain("NauticalWindSystem");
    expect(source).toContain("IslandErosionSystem");
    expect(source).not.toContain("registerNauticalChartCanvasEffects");
  });
});
