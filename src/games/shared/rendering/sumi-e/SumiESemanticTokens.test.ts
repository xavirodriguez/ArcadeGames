import {
  SUMI_E_SEMANTIC_TOKENS,
  type HexColor,
  type SumiEPlayerColor,
  type SumiERewardColor,
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

  it("keeps gameplay color semantics distinct", () => {
    const { threat, player, reward, ui } = SUMI_E_SEMANTIC_TOKENS;

    expect(threat.glow).toBe("#FF3B30");
    expect(player.projectile).toBe("#4DA3FF");
    expect(player.projectileGlow).toBe("#9CD0FF");
    expect(reward.primary).toBe("#E3A92F");

    // Decorative hanko red is intentionally distinct from the hostile body pigment.
    expect(ui.seal).toBe("#D7473F");
    expect(ui.seal).not.toBe(threat.body);
    expect(threat.glow).not.toBe(player.projectile);
    expect(threat.body).not.toBe(reward.primary);
  });

  it("contains only runtime-validated six-digit hex colors", () => {
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

  it("freezes the top-level token map and every semantic group at runtime", () => {
    expect(Object.isFrozen(SUMI_E_SEMANTIC_TOKENS)).toBe(true);

    for (const group of Object.values(SUMI_E_SEMANTIC_TOKENS)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
  });
});
