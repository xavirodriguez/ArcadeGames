import { resolveArkanoidTheme, classicTheme } from "../mods/registry";
import { ROW_GRADIENT_PALETTE } from "../rendering/ArkanoidPalette";

describe("Arkanoid theme tokens (Lote C)", () => {
  it("exposes the existing synthwave row gradient as theme tokens", () => {
    expect(resolveArkanoidTheme()).toBe(classicTheme);
    expect(classicTheme.tokens.rowGradient).toBe(ROW_GRADIENT_PALETTE);
    expect(classicTheme.tokens.rowGradient.length).toBeGreaterThanOrEqual(5);
  });

  it("is presentation-only", () => {
    expect("registerSystems" in classicTheme).toBe(false);
  });
});
