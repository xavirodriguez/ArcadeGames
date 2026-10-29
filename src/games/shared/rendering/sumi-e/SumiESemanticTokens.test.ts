import { SUMI_E_SEMANTIC_TOKENS } from "../../../../theme/sumi-e/SumiESemanticTokens";

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

  it("keeps colors aligned with their semantic role", () => {
    const { surface, threat, player, reward, landscape, ui } = SUMI_E_SEMANTIC_TOKENS;

    expect(surface.paper).toBe("#E7DFCB");
    expect(surface.paperLight).toBe("#F1EBDD");
    expect(threat.body).toBe("#B3261E");
    expect(threat.glow).toBe("#FF3B30");
    expect(player.projectile).toBe("#4DA3FF");
    expect(player.projectileGlow).toBe("#9CD0FF");
    expect(reward.primary).toBe("#E3A92F");
    expect(landscape.mist).toBe("#C9D1D2");
    expect(landscape.mountain).toBe("#8FA3B3");
    expect(landscape.water).toBe("#2E86B0");
    expect(ui.frame).toBe("#B9A272");
    expect(ui.seal).toBe("#D7473F");

    expect(threat.glow).not.toBe(player.projectile);
    expect(threat.body).not.toBe(reward.primary);
    expect(ui.seal).not.toBe(threat.body);
  });

  it("contains only six-digit hex colors", () => {
    const colors = Object.values(SUMI_E_SEMANTIC_TOKENS).flatMap((group) =>
      Object.values(group)
    );

    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
  });

  it("freezes the top-level token map and every semantic group at runtime", () => {
    expect(Object.isFrozen(SUMI_E_SEMANTIC_TOKENS)).toBe(true);

    for (const group of Object.values(SUMI_E_SEMANTIC_TOKENS)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
  });
});
