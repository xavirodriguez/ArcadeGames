import { resolvePongTheme, classicTheme } from "../mods/registry";
import { PONG_VISUAL_TOKENS } from "../rendering/PongVisualTokens";

describe("Pong theme tokens (Lote C)", () => {
  it("resolves neon classic tokens", () => {
    expect(resolvePongTheme()).toBe(classicTheme);
    expect(classicTheme.tokens).toBe(PONG_VISUAL_TOKENS);
    expect(classicTheme.tokens.ball).toBeDefined();
    expect(classicTheme.tokens.glowP1).toBeDefined();
  });

  it("is presentation-only", () => {
    expect("registerSystems" in classicTheme).toBe(false);
  });
});
