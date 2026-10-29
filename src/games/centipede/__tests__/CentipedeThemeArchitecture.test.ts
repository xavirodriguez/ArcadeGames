import { resolveCentipedeTheme, classicTheme } from "../mods/registry";
import { CENTIPEDE_VISUAL_TOKENS } from "../rendering/CentipedeVisualTokens";

describe("Centipede theme tokens (Lote C)", () => {
  it("exposes soil/fauna presentation tokens", () => {
    expect(resolveCentipedeTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(CENTIPEDE_VISUAL_TOKENS);
    expect(classicTheme.tokens.centipedeHead).toBe("#FF4D5E");
    expect(classicTheme.tokens.soil).toBe("#0A0F1C");
  });

  it("is presentation-only", () => {
    expect("registerSystems" in classicTheme).toBe(false);
  });
});
