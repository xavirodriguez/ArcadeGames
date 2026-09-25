import { World, THEME_RESOURCE_KEY } from "@tiny-aster/core";
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
import { getActiveVisualContext } from "../rendering/SharedVFX";

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

  it("includes vfxProfile in createThemeFromGameAccents for Pong pilot", () => {
    const pongTheme = createThemeFromGameAccents("pong");
    expect(pongTheme.vfxProfile).toBeDefined();
    expect(pongTheme.vfxProfile?.starDensity).toBe(0.2);
    expect(pongTheme.vfxProfile?.starSpeed).toBe(0.0);
    expect(pongTheme.vfxProfile?.particleShape).toBe("circle");
  });

  it("resolves getActiveVisualContext with correct precedence for standalone vs campaign mode", () => {
    const world = new World();
    const pongTheme = createThemeFromGameAccents("pong");
    world.setResource(THEME_RESOURCE_KEY, pongTheme);

    // 1. Standalone mode (no ActiveLevelThemeName)
    const standaloneCtx = getActiveVisualContext(world);
    expect(standaloneCtx.starDensity).toBe(0.2);
    expect(standaloneCtx.starSpeed).toBe(0.0);
    expect(standaloneCtx.ambientGlow).toBe(0.2);
    expect(standaloneCtx.particleShape).toBe("circle");

    // 2. Campaign mode (ActiveLevelThemeName set to "violet_nebula")
    world.setResource("ActiveLevelThemeName", "violet_nebula");
    const campaignCtx = getActiveVisualContext(world);
    expect(campaignCtx.starDensity).toBe(0.8); // violet_nebula preset density
    expect(campaignCtx.starSpeed).toBe(0.8);   // violet_nebula preset speed
    expect(campaignCtx.ambientGlow).toBe(0.7);  // violet_nebula preset glow
    expect(campaignCtx.planetProfile).toBe("purple");
    expect(campaignCtx.particleShape).toBe("circle"); // preserved from vfxProfile
  });
});
