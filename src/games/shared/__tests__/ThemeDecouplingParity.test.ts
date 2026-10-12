import { World, THEME_RESOURCE_KEY, resolveThemeColor, resolveThemeColorWithFallback, Theme } from "@tiny-aster/core";
import { createThemeFromGameAccents, GameKey } from "../../../theme/gameAccents";

describe("Phase 5 — Theme Decoupling & Color Resolution Parity Tests", () => {
  const gamesToVerify: GameKey[] = [
    "asteroids",
    "space-invaders",
    "flappy-bird",
    "pong",
    "platformer",
    "echorunner",
    "hitandrun",
    "geometrywars",
    "arkanoid",
    "frogger",
    "racing",
    "outrun",
    "vertical-shmup",
    "tower-defense"
  ];

  for (const game of gamesToVerify) {
    test(`[${game}] theme contains default primary, secondary, accent, and role mappings`, () => {
      const defaultTheme = createThemeFromGameAccents(game);
      expect(defaultTheme.colorMap.primary).toBeDefined();
      expect(defaultTheme.colorMap.secondary).toBeDefined();
      expect(defaultTheme.colorMap.accent).toBeDefined();
    });
  }

  test("Tower Defense keys default to original values and accept custom theme overrides", () => {
    const world = new World();
    const defaultTheme = createThemeFromGameAccents("tower-defense");
    world.setResource(THEME_RESOURCE_KEY, defaultTheme);

    expect(resolveThemeColorWithFallback(world, "#4fc3f7", "tower_basic")).toBe("#4fc3f7");
    expect(resolveThemeColorWithFallback(world, "#ab47bc", "tower_sniper")).toBe("#ab47bc");
    expect(resolveThemeColorWithFallback(world, "#66bb6a", "tower_rapid")).toBe("#66bb6a");
    expect(resolveThemeColorWithFallback(world, "#4dd0e1", "tower_frost")).toBe("#4dd0e1");

    expect(resolveThemeColorWithFallback(world, "#ff7043", "creep_grunt")).toBe("#ff7043");
    expect(resolveThemeColorWithFallback(world, "#29b6f6", "creep_fast")).toBe("#29b6f6");
    expect(resolveThemeColorWithFallback(world, "#8d6e63", "creep_tank")).toBe("#8d6e63");
    expect(resolveThemeColorWithFallback(world, "#c62828", "creep_boss")).toBe("#c62828");

    // Custom Theme Override
    const customTheme: Theme = {
      spriteMap: {},
      colorMap: {
        tower_basic: "#ff0000",
        creep_grunt: "#00ff00"
      }
    };
    world.setResource(THEME_RESOURCE_KEY, customTheme);

    expect(resolveThemeColorWithFallback(world, "#4fc3f7", "tower_basic")).toBe("#ff0000");
    expect(resolveThemeColorWithFallback(world, "#ff7043", "creep_grunt")).toBe("#00ff00");
  });

  test("Frogger keys default to original values and accept custom theme overrides", () => {
    const world = new World();
    const defaultTheme = createThemeFromGameAccents("frogger");
    world.setResource(THEME_RESOURCE_KEY, defaultTheme);

    expect(resolveThemeColorWithFallback(world, "#00AA44", "home_slot")).toBe("#00AA44");
    expect(resolveThemeColorWithFallback(world, "#39FF14", "home_slot_occupied")).toBe("#39FF14");
    expect(resolveThemeColorWithFallback(world, "#051C33", "water")).toBe("#051C33");

    const customTheme: Theme = {
      spriteMap: {},
      colorMap: {
        home_slot: "#123456",
        water: "#654321"
      }
    };
    world.setResource(THEME_RESOURCE_KEY, customTheme);

    expect(resolveThemeColorWithFallback(world, "#00AA44", "home_slot")).toBe("#123456");
    expect(resolveThemeColorWithFallback(world, "#051C33", "water")).toBe("#654321");
  });

  test("Outrun & Platformer keys default to original values and accept custom theme overrides", () => {
    const world = new World();
    const defaultTheme = createThemeFromGameAccents("outrun");
    world.setResource(THEME_RESOURCE_KEY, defaultTheme);

    expect(resolveThemeColorWithFallback(world, "#e63946", "outrun_car")).toBe("#e63946");

    const customTheme: Theme = {
      spriteMap: {},
      colorMap: {
        outrun_car: "#ffff00",
        tile_slate: "#222222"
      }
    };
    world.setResource(THEME_RESOURCE_KEY, customTheme);

    expect(resolveThemeColorWithFallback(world, "#e63946", "outrun_car")).toBe("#ffff00");
    expect(resolveThemeColorWithFallback(world, "#1e293b", "tile_slate")).toBe("#222222");
  });
});
