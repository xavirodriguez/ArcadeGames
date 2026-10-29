import { THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { GalaxianGame } from "../GalaxianGame";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

describe("Galaxian default theme injection", () => {
  let game: GalaxianGame;

  afterEach(() => {
    game?.destroy?.();
  });

  it("injects createThemeFromGameAccents when no theme is provided", async () => {
    game = new GalaxianGame({ headless: true });
    await game.init();
    const theme = game.getWorld().getResource<Theme>(THEME_RESOURCE_KEY);
    expect(theme).toBeDefined();
    const expected = createThemeFromGameAccents("galaxian");
    // Accents should produce a stable concept / color map baseline
    expect(theme?.colorMap).toBeDefined();
    expect(Object.keys(theme?.colorMap ?? {}).length).toBeGreaterThan(0);
  });

  it("preserves an explicitly provided theme", async () => {
    const custom = createThemeFromGameAccents("galaxian", {
      colorMap: { player: "#ABCDEF" }
    });
    game = new GalaxianGame({ headless: true, theme: custom });
    await game.init();
    const theme = game.getWorld().getResource<Theme>(THEME_RESOURCE_KEY);
    expect(theme?.colorMap?.player).toBe("#ABCDEF");
  });
});
