import { RACING_PALETTES, TrackTheme } from "../rendering/RacingPalette";

describe("RacingPalette", () => {
  const themes: TrackTheme[] = ["breakfast", "billiard", "desk", "garden"];
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;

  test("all 4 themes are present with valid hex values for every token", () => {
    for (const theme of themes) {
      const palette = RACING_PALETTES[theme];
      expect(palette).toBeDefined();

      const tokens = Object.entries(palette);
      expect(tokens.length).toBeGreaterThanOrEqual(15);

      for (const [key, color] of tokens) {
        expect(color).toMatch(hexPattern);
      }
    }
  });
});
