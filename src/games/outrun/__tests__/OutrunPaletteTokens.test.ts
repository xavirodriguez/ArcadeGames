import {
  COAST_PALETTE,
  DESERT_PALETTE,
  MOUNTAIN_PALETTE,
  CLASSIC_COAST_PALETTE,
  CLASSIC_DESERT_PALETTE,
  CLASSIC_MOUNTAIN_PALETTE
} from "../rendering/OutrunPalettes";
import * as paletteTokens from "../theme/OutrunPaletteTokens";

describe("OutRun scenario palette tokens", () => {
  it("re-exports the canonical token objects without copying or changing legacy values", () => {
    expect(COAST_PALETTE).toBe(paletteTokens.COAST_PALETTE);
    expect(DESERT_PALETTE).toBe(paletteTokens.DESERT_PALETTE);
    expect(MOUNTAIN_PALETTE).toBe(paletteTokens.MOUNTAIN_PALETTE);
    expect(CLASSIC_COAST_PALETTE).toBe(paletteTokens.CLASSIC_COAST_PALETTE);
    expect(CLASSIC_DESERT_PALETTE).toBe(paletteTokens.CLASSIC_DESERT_PALETTE);
    expect(CLASSIC_MOUNTAIN_PALETTE).toBe(paletteTokens.CLASSIC_MOUNTAIN_PALETTE);
  });

  it("keeps all historical scenario IDs available to palette interpolation", () => {
    expect([
      COAST_PALETTE.id,
      DESERT_PALETTE.id,
      MOUNTAIN_PALETTE.id,
      CLASSIC_COAST_PALETTE.id,
      CLASSIC_DESERT_PALETTE.id,
      CLASSIC_MOUNTAIN_PALETTE.id
    ]).toEqual([
      "coast",
      "desert",
      "mountain",
      "classic_coast",
      "classic_desert",
      "classic_mountain"
    ]);
  });
});
