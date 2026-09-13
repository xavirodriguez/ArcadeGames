import { glowLevels, effects, colors } from "../../../theme";

describe("Phase 4 Depth, Glow & Polish Suite", () => {
  it("exports valid glow level functions for soft, medium, strong, intense", () => {
    const softGlow = glowLevels.soft(colors.cyan);
    const strongGlow = glowLevels.strong(colors.pink);

    expect(softGlow).toBeDefined();
    expect(strongGlow).toBeDefined();
  });

  it("exports static glow effects in effects token object", () => {
    expect(effects.cyanGlow).toBeDefined();
    expect(effects.pinkGlow).toBeDefined();
    expect(effects.goldGlow).toBeDefined();
  });
});
