import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameThemeProvider, type GameThemeProviderProps } from "../../../../context/GameThemeProvider";
import { useGameTheme } from "../../../../context/GameThemeContext";
import { getGameAccentColors } from "../../../../theme/gameAccents";
import { SUMI_E_SEMANTIC_TOKENS } from "../../../../theme/sumi-e/SumiESemanticTokens";
import { getAestheticTheme } from "./AestheticTheme";
import { createAestheticPresentationTokens } from "../../presentation/adapters/AestheticThemeTokens";
import { SUMI_E_PALETTE, SUMI_E_WINTER_PALETTE } from "./SumiEPalette";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";

function ThemeProbe(): React.ReactElement {
  const theme = useGameTheme();
  const aesthetic = theme.aestheticTheme;

  return React.createElement(
    "span",
    {
      "data-aesthetic": aesthetic?.id ?? "legacy",
      "data-semantic-paper": aesthetic?.semanticTokens?.surface.paper ?? "",
      "data-legacy-background": aesthetic?.backgroundColor ?? "",
      "data-presentation-background": theme.presentationTokens?.colors.background ?? "",
      "data-primary-accent": theme.accentColors.primary,
      "data-ink-wash": aesthetic?.useInkWash === true ? "enabled" : "disabled"
    },
    aesthetic?.name ?? "legacy"
  );
}

function renderProvider(props: Omit<GameThemeProviderProps, "children"> = {}): string {
  return renderToStaticMarkup(
    React.createElement(GameThemeProvider, {
      ...props,
      children: React.createElement(ThemeProbe)
    })
  );
}

describe("Sumi-e AestheticTheme", () => {
  it("exposes canonical semantic tokens without replacing the legacy classic palette", () => {
    const theme = getAestheticTheme("sumi-e");

    expect(theme.semanticTokens).toBe(SUMI_E_SEMANTIC_TOKENS);
    expect(theme.semanticTokens?.surface.paper).toBe("#E7DFCB");
    expect(theme.semanticTokens?.player.projectile).toBe("#4DA3FF");
    expect(theme.sumiPalette).toBe(SUMI_E_PALETTE);
    expect(theme.backgroundColor).toBe(SUMI_E_PALETTE.paper);
    expect(theme.foregroundColor).toBe(SUMI_E_PALETTE.ink);
    expect(theme.accentColor).toBe(SUMI_E_PALETTE.vermilion);
    expect(theme.useInkWash).toBe(true);
  });

  it("keeps legacy palette variants while exposing the same canonical token contract", () => {
    const theme = getAestheticTheme("sumi-e", {
      landscape: "coastal",
      paletteVariant: "winter"
    });

    expect(theme.semanticTokens).toBe(SUMI_E_SEMANTIC_TOKENS);
    expect(theme.sumiPalette).toBe(SUMI_E_WINTER_PALETTE);
    expect(theme.backgroundColor).toBe(SUMI_E_WINTER_PALETTE.paper);
    expect(theme.semanticTokens?.surface.paper).toBe("#E7DFCB");
  });

  it("does not add Sumi-e semantic tokens to the existing cosmic and neon themes", () => {
    const cosmic = getAestheticTheme("cosmic");
    const neon = getAestheticTheme("neon");

    expect(cosmic.semanticTokens).toBeUndefined();
    expect(cosmic.backgroundColor).toBe(COSMIC_ARCADE_PALETTE.voidBlack);
    expect(cosmic.foregroundColor).toBe(COSMIC_ARCADE_PALETTE.neonCyan);
    expect(cosmic.useInkWash).toBe(false);

    expect(neon.semanticTokens).toBeUndefined();
    expect(neon.backgroundColor).toBe("#0a0a12");
    expect(neon.foregroundColor).toBe("#00f0ff");
    expect(neon.accentColor).toBe("#ff00aa");
    expect(neon.useInkWash).toBe(false);
  });
});

describe("GameThemeProvider aesthetic integration", () => {
  it("preserves legacy game accents and exposes no selected aesthetic by default", () => {
    const markup = renderProvider({ gameKey: "hitandrun" });
    const accents = getGameAccentColors("hitandrun");

    expect(markup).toContain('data-aesthetic="legacy"');
    expect(markup).toContain('data-semantic-paper=""');
    expect(markup).toContain(`data-primary-accent="${accents.primary}"`);
  });

  it("accepts normalized presentation tokens without replacing the legacy UI theme", () => {
    const aestheticTheme = getAestheticTheme("sumi-e");
    const presentationTokens = createAestheticPresentationTokens(aestheticTheme);
    const markup = renderProvider({
      gameKey: "hitandrun",
      aestheticTheme,
      presentationTokens
    });

    expect(markup).toContain('data-presentation-background="#E7DFCB"');
    expect(markup).toContain('data-legacy-background="#e8e3d4"');
  });

  it("makes canonical Sumi-e tokens available through the React theme context", () => {
    const aestheticTheme = getAestheticTheme("sumi-e", {
      landscape: "mountain",
      paletteVariant: "forest"
    });
    const markup = renderProvider({
      gameKey: "hitandrun",
      aestheticTheme
    });
    const accents = getGameAccentColors("hitandrun");

    expect(markup).toContain('data-aesthetic="sumi-e"');
    expect(markup).toContain('data-semantic-paper="#E7DFCB"');
    expect(markup).toContain('data-legacy-background="#e4e6d8"');
    expect(markup).toContain('data-ink-wash="enabled"');
    expect(markup).toContain(`data-primary-accent="${accents.primary}"`);
  });

  it.each(["cosmic", "neon"] as const)(
    "exposes the selected %s aesthetic without changing legacy game accents",
    (aesthetic) => {
      const markup = renderProvider({
        gameKey: "racing",
        aestheticTheme: getAestheticTheme(aesthetic)
      });
      const accents = getGameAccentColors("racing");

      expect(markup).toContain(`data-aesthetic="${aesthetic}"`);
      expect(markup).toContain('data-semantic-paper=""');
      expect(markup).toContain(`data-primary-accent="${accents.primary}"`);
      expect(markup).toContain('data-ink-wash="disabled"');
    }
  });
});
