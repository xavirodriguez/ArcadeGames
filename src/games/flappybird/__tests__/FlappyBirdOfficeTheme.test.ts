import { THEME_RESOURCE_KEY, resolveThemeColor, Theme } from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { officePaperTheme } from "../../../theme/officePaperTheme";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";
import { DEFAULT_FLAPPY_BIRD_CONFIG } from "../types/FlappyBirdConfigSchema";

describe("Flappy Bird Office Paper Theme ('Oficina 8:47')", () => {
  let game: FlappyBirdGame;

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  test("should define officePaperTheme with exact office theme tokens", () => {
    expect(officePaperTheme).toBeDefined();
    expect(officePaperTheme.colorMap?.bird).toBe("#FFFFFF");
    expect(officePaperTheme.colorMap?.pipe).toBe("#475569");
    expect(officePaperTheme.colorMap?.ground).toBe("#B45309");
    expect(officePaperTheme.vfxProfile?.backgroundLayers).toEqual([]);
    expect(officePaperTheme.lore?.description).toBe("Oficina vacía, 8:47. Avión lanzado por aburrimiento.");
  });

  test("should instantiate FlappyBirdGame with officePaperTheme and apply color roles", async () => {
    game = new FlappyBirdGame({ theme: officePaperTheme });
    await game.init();

    const world = game.getWorld();
    const activeTheme = world.getResource<Theme>(THEME_RESOURCE_KEY);

    expect(activeTheme).toBeDefined();
    expect(activeTheme?.colorMap?.bird).toBe("#FFFFFF");

    const resolvedBirdColor = resolveThemeColor(world, "bird", "player");
    const resolvedPipeColor = resolveThemeColor(world, "pipe", "enemy");
    const resolvedGroundColor = resolveThemeColor(world, "ground");

    expect(resolvedBirdColor).toBe("#FFFFFF");
    expect(resolvedPipeColor).toBe("#475569");
    expect(resolvedGroundColor).toBe("#B45309");
  });

  test("should preserve game physics and rules when instantiated with custom theme", async () => {
    const defaultGame = new FlappyBirdGame({ theme: createThemeFromGameAccents("flappy-bird") });
    await defaultGame.init();

    const officeGame = new FlappyBirdGame({ theme: officePaperTheme });
    await officeGame.init();

    const defaultConfig = defaultGame.getWorld().getResource<{ GRAVITY: number; FLAP_STRENGTH: number; GAP_SIZE: number }>("GameConfig");
    const officeConfig = officeGame.getWorld().getResource<{ GRAVITY: number; FLAP_STRENGTH: number; GAP_SIZE: number }>("GameConfig");

    expect(officeConfig?.GRAVITY).toBe(defaultConfig?.GRAVITY);
    expect(officeConfig?.FLAP_STRENGTH).toBe(defaultConfig?.FLAP_STRENGTH);
    expect(officeConfig?.GAP_SIZE).toBe(defaultConfig?.GAP_SIZE);

    expect(officeConfig?.GRAVITY).toBe(DEFAULT_FLAPPY_BIRD_CONFIG.GRAVITY);
    expect(officeConfig?.FLAP_STRENGTH).toBe(DEFAULT_FLAPPY_BIRD_CONFIG.FLAP_STRENGTH);
    expect(officeConfig?.GAP_SIZE).toBe(DEFAULT_FLAPPY_BIRD_CONFIG.GAP_SIZE);

    defaultGame.destroy();
    officeGame.destroy();
  });
});
