import {
  SUMI_E_SEMANTIC_TOKENS,
  createSumiESemanticColor,
  createSumiESemanticTokens,
  type HexColor,
  type SumiEPlayerColor,
  type SumiERewardColor,
  type SumiESemanticTokenInput,
  type SumiESurfaceColor,
  type SumiEThreatColor,
  type SumiEUiColor
} from "../../../../theme/sumi-e/SumiESemanticTokens";

type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;
type AssertFalse<Value extends false> = Value;

/**
 * Compile-time regression guards: role tokens are intentionally not interchangeable.
 * The application typecheck validates these assertions; Jest validates runtime behavior.
 */
export type SumiESemanticTypeSafetyAssertions = [
  AssertFalse<IsAssignable<string, HexColor>>,
  AssertFalse<IsAssignable<SumiEThreatColor, SumiESurfaceColor>>,
  AssertFalse<IsAssignable<SumiEPlayerColor, SumiEThreatColor>>,
  AssertFalse<IsAssignable<SumiERewardColor, SumiEPlayerColor>>,
  AssertFalse<IsAssignable<SumiEUiColor, SumiEThreatColor>>
];

function paletteInput(): SumiESemanticTokenInput {
  return {
    surface: {
      paper: SUMI_E_SEMANTIC_TOKENS.surface.paper,
      paperLight: SUMI_E_SEMANTIC_TOKENS.surface.paperLight
    },
    text: {
      primary: SUMI_E_SEMANTIC_TOKENS.text.primary,
      secondary: SUMI_E_SEMANTIC_TOKENS.text.secondary
    },
    threat: {
      body: SUMI_E_SEMANTIC_TOKENS.threat.body,
      shadow: SUMI_E_SEMANTIC_TOKENS.threat.shadow,
      glow: SUMI_E_SEMANTIC_TOKENS.threat.glow,
      inkCreature: SUMI_E_SEMANTIC_TOKENS.threat.inkCreature
    },
    player: {
      silhouette: SUMI_E_SEMANTIC_TOKENS.player.silhouette,
      trail: SUMI_E_SEMANTIC_TOKENS.player.trail,
      projectile: SUMI_E_SEMANTIC_TOKENS.player.projectile,
      projectileGlow: SUMI_E_SEMANTIC_TOKENS.player.projectileGlow,
      shield: SUMI_E_SEMANTIC_TOKENS.player.shield
    },
    reward: {
      primary: SUMI_E_SEMANTIC_TOKENS.reward.primary
    },
    landscape: {
      ink: SUMI_E_SEMANTIC_TOKENS.landscape.ink,
      mist: SUMI_E_SEMANTIC_TOKENS.landscape.mist,
      mountain: SUMI_E_SEMANTIC_TOKENS.landscape.mountain,
      water: SUMI_E_SEMANTIC_TOKENS.landscape.water,
      sand: SUMI_E_SEMANTIC_TOKENS.landscape.sand,
      safeGround: SUMI_E_SEMANTIC_TOKENS.landscape.safeGround,
      foliage: SUMI_E_SEMANTIC_TOKENS.landscape.foliage
    },
    ui: {
      frame: SUMI_E_SEMANTIC_TOKENS.ui.frame,
      seal: SUMI_E_SEMANTIC_TOKENS.ui.seal,
      sealShadow: SUMI_E_SEMANTIC_TOKENS.ui.sealShadow,
      panel: SUMI_E_SEMANTIC_TOKENS.ui.panel,
      bossBarBackground: SUMI_E_SEMANTIC_TOKENS.ui.bossBarBackground,
      bossBarFill: SUMI_E_SEMANTIC_TOKENS.ui.bossBarFill,
      activeLife: SUMI_E_SEMANTIC_TOKENS.ui.activeLife,
      emptyLife: SUMI_E_SEMANTIC_TOKENS.ui.emptyLife
    }
  };
}

function relativeLuminance(color: string): number {
  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
  const linearize = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const values = [relativeLuminance(foreground), relativeLuminance(background)];
  const lighter = Math.max(...values);
  const darker = Math.min(...values);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("SUMI_E_SEMANTIC_TOKENS", () => {
  it("matches the approved art-direction values for every semantic role", () => {
    expect(SUMI_E_SEMANTIC_TOKENS).toEqual({
      surface: {
        paper: "#E7DFCB",
        paperLight: "#F1EBDD"
      },
      text: {
        primary: "#151515",
        secondary: "#5F6466"
      },
      threat: {
        body: "#B3261E",
        shadow: "#A8281F",
        glow: "#FF3B30",
        inkCreature: "#151515"
      },
      player: {
        silhouette: "#151515",
        trail: "#4DA3FF",
        projectile: "#4DA3FF",
        projectileGlow: "#9CD0FF",
        shield: "#4DA3FF"
      },
      reward: {
        primary: "#E3A92F"
      },
      landscape: {
        ink: "#5F6466",
        mist: "#C9D1D2",
        mountain: "#8FA3B3",
        water: "#2E86B0",
        sand: "#E2D1A5",
        safeGround: "#7FA38A",
        foliage: "#4A5A52"
      },
      ui: {
        frame: "#B9A272",
        seal: "#D7473F",
        sealShadow: "#A8281F",
        panel: "#F1EBDD",
        bossBarBackground: "#151515",
        bossBarFill: "#B3261E",
        activeLife: "#151515",
        emptyLife: "#5F6466"
      }
    });
  });

  it("validates individual semantic colors and rejects malformed hex values", () => {
    expect(createSumiESemanticColor("#FFFFFF", "surface")).toBe("#FFFFFF");
    expect(() => createSumiESemanticColor("#FFF", "surface")).toThrow(
      'Invalid Sumi-e surface color "#FFF": expected #RRGGBB.'
    );
    expect(() => createSumiESemanticColor("#12GG56", "player")).toThrow(
      'Invalid Sumi-e player color "#12GG56": expected #RRGGBB.'
    );
    expect(() => createSumiESemanticColor("4DA3FF", "player")).toThrow(
      'Invalid Sumi-e player color "4DA3FF": expected #RRGGBB.'
    );
  });

  it("rejects a missing semantic group, a missing token and unexpected keys", () => {
    const missingGroup = { ...paletteInput() } as Record<string, unknown>;
    delete missingGroup.ui;

    expect(() =>
      createSumiESemanticTokens(missingGroup as SumiESemanticTokenInput)
    ).toThrow('Invalid Sumi-e palette at "palette": missing [ui].');

    const base = paletteInput();
    const missingToken = {
      ...base,
      surface: { paper: base.surface.paper }
    };

    expect(() =>
      createSumiESemanticTokens(missingToken as SumiESemanticTokenInput)
    ).toThrow('Invalid Sumi-e palette at "surface": missing [paperLight].');

    const unexpectedKey = {
      ...base,
      threat: { ...base.threat, neutral: "#777777" }
    };

    expect(() =>
      createSumiESemanticTokens(unexpectedKey as SumiESemanticTokenInput)
    ).toThrow('Invalid Sumi-e palette at "threat": unexpected [neutral].');
  });

  it("rejects non-object input and non-string palette values", () => {
    expect(() =>
      createSumiESemanticTokens(null as unknown as SumiESemanticTokenInput)
    ).toThrow('Invalid Sumi-e palette at "palette": expected an object.');

    const input = paletteInput();
    const invalidColor = {
      ...input,
      player: { ...input.player, projectile: 42 }
    };

    expect(() =>
      createSumiESemanticTokens(invalidColor as unknown as SumiESemanticTokenInput)
    ).toThrow('Invalid Sumi-e player color at "player.projectile": expected a string.');
  });

  it("rejects text colors that fail WCAG AA contrast on either paper surface", () => {
    const input = paletteInput();
    const lowContrast = {
      ...input,
      text: { ...input.text, secondary: "#FFFFFF" }
    };

    expect(() =>
      createSumiESemanticTokens(lowContrast as SumiESemanticTokenInput)
    ).toThrow(/text\.secondary contrast against surface\.paper is .* expected at least 4\.5:1/);
  });

  it("rejects palettes that collapse threat, player, reward or seal color roles", () => {
    const input = paletteInput();
    const threatPlayerCollision = {
      ...input,
      player: { ...input.player, projectile: input.threat.glow }
    };
    const threatRewardCollision = {
      ...input,
      reward: { primary: input.threat.body }
    };
    const sealThreatCollision = {
      ...input,
      ui: { ...input.ui, seal: input.threat.body }
    };

    expect(() =>
      createSumiESemanticTokens(threatPlayerCollision as SumiESemanticTokenInput)
    ).toThrow(/threat\.glow and player\.projectile must use different colors/);
    expect(() =>
      createSumiESemanticTokens(threatRewardCollision as SumiESemanticTokenInput)
    ).toThrow(/threat\.body and reward\.primary must use different colors/);
    expect(() =>
      createSumiESemanticTokens(sealThreatCollision as SumiESemanticTokenInput)
    ).toThrow(/ui\.seal and threat\.body must use different colors/);
  });

  it("keeps gameplay color semantics distinct", () => {
    const { threat, player, reward, ui } = SUMI_E_SEMANTIC_TOKENS;

    expect(threat.glow).toBe("#FF3B30");
    expect(player.projectile).toBe("#4DA3FF");
    expect(player.projectileGlow).toBe("#9CD0FF");
    expect(reward.primary).toBe("#E3A92F");
    expect(ui.seal).toBe("#D7473F");
    expect(ui.seal).not.toBe(threat.body);
    expect(threat.glow).not.toBe(player.projectile);
    expect(threat.body).not.toBe(reward.primary);
  });

  it("contains exactly 29 six-digit hex colors", () => {
    const colors = Object.values(SUMI_E_SEMANTIC_TOKENS).flatMap((group) =>
      Object.values(group)
    );

    expect(colors).toHaveLength(29);
    expect(colors.every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
  });

  it("keeps primary and secondary text at WCAG AA contrast on both paper surfaces", () => {
    const { surface, text } = SUMI_E_SEMANTIC_TOKENS;

    for (const foreground of [text.primary, text.secondary]) {
      expect(contrastRatio(foreground, surface.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(foreground, surface.paperLight)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("freezes the top-level palette and every semantic group at runtime", () => {
    expect(Object.isFrozen(SUMI_E_SEMANTIC_TOKENS)).toBe(true);

    for (const group of Object.values(SUMI_E_SEMANTIC_TOKENS)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
  });
});
