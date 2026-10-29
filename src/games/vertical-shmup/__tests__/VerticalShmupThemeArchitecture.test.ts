import { resolveVerticalShmupTheme, classicTheme } from "../mods/registry";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

describe("Vertical Shmup theme tokens (Lote C)", () => {
  it("wraps existing SHMUP_COLOR_TOKENS", () => {
    expect(resolveVerticalShmupTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(SHMUP_COLOR_TOKENS);
    expect(classicTheme.tokens.player.primary).toBeDefined();
    expect(classicTheme.tokens.bullet.warm).toBeDefined();
  });

  it("is presentation-only", () => {
    expect("registerSystems" in classicTheme).toBe(false);
  });
});
