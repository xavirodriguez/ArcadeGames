import { getGameAccentColors, GAME_ACCENTS } from "../../../theme";

describe("Phase 2 & Phase 3 UI Tokens and Components", () => {
  it("resolves accent colors for all arcade stations in MissionSelector", () => {
    const stations = Object.keys(GAME_ACCENTS) as (keyof typeof GAME_ACCENTS)[];

    stations.forEach((key) => {
      const accents = getGameAccentColors(key);
      expect(accents.primary).toBeDefined();
      expect(accents.secondary).toBeDefined();
      expect(accents.accent).toBeDefined();
    });
  });

  it("provides valid game keys for campaign and minigames", () => {
    expect(GAME_ACCENTS["space-invaders"]).toBeDefined();
    expect(GAME_ACCENTS.asteroids).toBeDefined();
    expect(GAME_ACCENTS["flappy-bird"]).toBeDefined();
    expect(GAME_ACCENTS.pong).toBeDefined();
    expect(GAME_ACCENTS.platformer).toBeDefined();
    expect(GAME_ACCENTS.geometrywars).toBeDefined();
    expect(GAME_ACCENTS.arkanoid).toBeDefined();
    expect(GAME_ACCENTS.campaign).toBeDefined();
  });
});
