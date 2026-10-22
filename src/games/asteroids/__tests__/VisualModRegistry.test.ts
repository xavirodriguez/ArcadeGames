import { resolveVisualMod, listVisualMods } from "../mods/registry";
import { classicMod } from "../mods/classic/ClassicMod";
import { icebergMod } from "../mods/iceberg/IcebergMod";
import { ICEBERG_PALETTE } from "../mods/iceberg/IcebergPalette";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

describe("Asteroids visual mod registry", () => {
  it("defaults unknown ids to classic", () => {
    expect(resolveVisualMod(undefined).id).toBe("classic");
    expect(resolveVisualMod(null).id).toBe("classic");
    expect(resolveVisualMod("neon").id).toBe("classic");
  });

  it("resolves iceberg", () => {
    expect(resolveVisualMod("iceberg").id).toBe("iceberg");
    expect(resolveVisualMod("iceberg").displayName).toContain("Iceberg");
  });

  it("lists both mods", () => {
    const list = listVisualMods();
    expect(list.map((m) => m.id).sort()).toEqual(["classic", "iceberg"]);
  });

  it("classic theme is identity", () => {
    const base = createThemeFromGameAccents("asteroids");
    const themed = classicMod.createTheme(base);
    expect(themed).toBe(base);
  });

  it("iceberg theme overrides player and ice colors", () => {
    const base = createThemeFromGameAccents("asteroids");
    const themed = icebergMod.createTheme(base);
    expect(themed.colorMap?.["player-ship"]).toBe(ICEBERG_PALETTE.shipHull);
    expect(themed.colorMap?.["asteroid-large"]).toBe(ICEBERG_PALETTE.iceLight);
    expect(themed.colorMap?.["player-bullet"]).toBe(ICEBERG_PALETTE.thermalBeam);
    expect(themed.conceptPack?.id).toBe("iceberg");
  });
});
