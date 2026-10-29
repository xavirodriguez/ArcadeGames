import fs from "fs";
import path from "path";
import { resolveRacingTheme, classicTheme } from "../mods/registry";
import { RACING_PALETTES } from "../rendering/RacingPalette";

describe("Racing theme presentation separation", () => {
  it("resolves classic theme exposing existing palettes", () => {
    expect(resolveRacingTheme()).toBe(classicTheme);
    expect(classicTheme.palettes).toBe(RACING_PALETTES);
    expect(classicTheme.palettes.breakfast.player).toMatch(/^#/);
    expect(classicTheme.defaultSkinId).toBe("tabletop");
  });

  it("keeps theme free of physics and input", () => {
    expect("registerSystems" in classicTheme).toBe(false);
    const source = fs.readFileSync(
      path.resolve(__dirname, "../mods/classic/ClassicTheme.ts"),
      "utf-8"
    );
    expect(source).not.toMatch(/CarPhysics|RacingInput|VehicleCollision|registerSystems/);
  });
});
