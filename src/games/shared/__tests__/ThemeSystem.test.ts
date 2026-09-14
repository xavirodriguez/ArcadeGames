import {
  colors,
  semanticColors,
  typography,
  spacing,
  radius,
  effects,
  LAYER_ELEVATION,
  GAME_ACCENTS,
  getGameAccentColors,
  createThemeFromGameAccents,
} from "../../../theme";

describe("Design System Theme Tokens Architecture", () => {
  it("exports valid semantic and core color tokens", () => {
    expect(semanticColors.system).toBe("#00E8D2");
    expect(semanticColors.warning).toBe("#F6C85F");
    expect(semanticColors.success).toBe("#67F7A7");
    expect(semanticColors.danger).toBe("#FF315B");

    expect(colors.system).toBe(semanticColors.system);
    expect(colors.primary).toBe("#00FF41");
    expect(colors.background).toBe("#0A0E27");
  });

  it("exports typography, spacing, radius, and elevation tokens", () => {
    expect(typography.sizes.title).toBe(48);
    expect(typography.weights.heavy).toBe("900");
    expect(spacing.md).toBe(16);
    expect(radius.xl).toBe(14);
    expect(LAYER_ELEVATION.HUD_INTERACTIVES).toBe(100);
  });

  it("resolves game accent colors correctly", () => {
    const asteroidsAccents = getGameAccentColors("asteroids");
    expect(asteroidsAccents.primary).toBe(colors[GAME_ACCENTS.asteroids.primary]);

    const campaignAccents = getGameAccentColors("campaign");
    expect(campaignAccents.primary).toBe(colors.cyan);
  });

  it("creates valid Theme objects from game accents", () => {
    const theme = createThemeFromGameAccents("space-invaders");
    expect(theme.colorMap?.primary).toBe(colors.green);
    expect(theme.colorMap?.boss).toBe(colors.magentaHot);
  });
});
