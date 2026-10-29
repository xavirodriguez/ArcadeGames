import { getAestheticTheme } from "../../rendering/sumi-e/AestheticTheme";
import { createAestheticPresentationTokens } from "../adapters/AestheticThemeTokens";

describe("createAestheticPresentationTokens", () => {
  test("maps canonical Sumi-e roles to shared renderer/UI tokens", () => {
    const aesthetic = getAestheticTheme("sumi-e");
    const tokens = createAestheticPresentationTokens(aesthetic);

    expect(tokens.colors.background).toBe(aesthetic.semanticTokens?.surface.paper);
    expect(tokens.colors.surface).toBe(aesthetic.semanticTokens?.ui.panel);
    expect(tokens.colors.textPrimary).toBe(aesthetic.semanticTokens?.text.primary);
    expect(tokens.colors.player).toBe(aesthetic.semanticTokens?.player.silhouette);
    expect(tokens.colors.threat).toBe(aesthetic.semanticTokens?.threat.body);
    expect(tokens.colors.accent).toBe(aesthetic.semanticTokens?.ui.seal);
    expect(tokens.custom).toBe(aesthetic);
  });

  it.each(["cosmic", "neon"] as const)(
    "preserves existing %s palette roles without Sumi-e semantic tokens",
    (id) => {
      const aesthetic = getAestheticTheme(id);
      const tokens = createAestheticPresentationTokens(aesthetic);

      expect(tokens.colors.background).toBe(aesthetic.backgroundColor);
      expect(tokens.colors.textPrimary).toBe(aesthetic.foregroundColor);
      expect(tokens.colors.accent).toBe(aesthetic.accentColor);
      expect(tokens.custom).toBe(aesthetic);
    }
  );

  test("preserves the configured Sumi-e palette variant in the original config", () => {
    const aesthetic = getAestheticTheme("sumi-e", {
      paletteVariant: "winter",
      landscape: "coastal"
    });
    const tokens = createAestheticPresentationTokens(aesthetic);

    expect(tokens.custom.sumiPalette?.paper).toBe(aesthetic.sumiPalette?.paper);
    expect(tokens.custom.inkWashLayers).toBe(aesthetic.inkWashLayers);
  });
});
