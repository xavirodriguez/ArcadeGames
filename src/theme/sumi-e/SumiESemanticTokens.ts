/**
 * Canonical semantic colors for the ArcadeGames Sumi-e art direction.
 *
 * New Sumi-e presentation code should consume these role-based tokens instead of
 * introducing hex values locally. Existing palettes are intentionally not migrated
 * here; adapters can bridge them in the next phase without changing current renders.
 */

export type HexColor = `#${string}`;

export interface SumiESurfaceTokens {
  /** Main aged washi background. */
  readonly paper: HexColor;
  /** Clean paper for panels and quiet UI surfaces. */
  readonly paperLight: HexColor;
}

export interface SumiETextTokens {
  /** Primary text, outlines and high-contrast ink details. */
  readonly primary: HexColor;
  /** Secondary labels and subdued ink details. */
  readonly secondary: HexColor;
}

export interface SumiEThreatTokens {
  /** Main pigment for hostile bodies and red oni. */
  readonly body: HexColor;
  /** Dark red used for threat shadows and secondary hostile details. */
  readonly shadow: HexColor;
  /** High-intensity red reserved for hostile projectiles and threat highlights. */
  readonly glow: HexColor;
  /** Near-black body fill for ink ghosts and other monochrome threats. */
  readonly inkCreature: HexColor;
}

export interface SumiEPlayerTokens {
  /** Monochrome player silhouette and outline. */
  readonly silhouette: HexColor;
  /** Blue movement trails and player energy. */
  readonly trail: HexColor;
  /** Player-owned projectiles; must remain distinct from hostile red projectiles. */
  readonly projectile: HexColor;
  /** Lighter blue core of player trails and projectiles. */
  readonly projectileGlow: HexColor;
  /** Player shield and protective abilities. */
  readonly shield: HexColor;
}

export interface SumiERewardTokens {
  /** Currency, ofuda, checkpoints and progression rewards. */
  readonly primary: HexColor;
}

export interface SumiELandscapeTokens {
  /** Mid-tone ink wash for rocks, trees and secondary landscape details. */
  readonly ink: HexColor;
  /** Fog and mist separating depth layers. */
  readonly mist: HexColor;
  /** Distant mountain washes. */
  readonly mountain: HexColor;
  /** Water surfaces in water-focused games such as Frogger. */
  readonly water: HexColor;
  /** Sand and riverbanks. */
  readonly sand: HexColor;
  /** Safe ground and traversable meadow areas. */
  readonly safeGround: HexColor;
  /** Pine foliage and dark vegetation. */
  readonly foliage: HexColor;
}

export interface SumiEUiTokens {
  /** Muted ornamental frame and parchment borders. */
  readonly frame: HexColor;
  /** Vermilion hanko seals and decorative UI accents. */
  readonly seal: HexColor;
  /** Darker seal pigment for stamped depth. */
  readonly sealShadow: HexColor;
  /** Light paper surface for UI panels. */
  readonly panel: HexColor;
  /** Ink backing of a boss health bar. */
  readonly bossBarBackground: HexColor;
  /** Red brush stroke showing remaining boss health. */
  readonly bossBarFill: HexColor;
  /** Filled life-pot or life indicator; ink avoids confusing health with threats. */
  readonly activeLife: HexColor;
  /** Empty life-pot or life indicator. */
  readonly emptyLife: HexColor;
}

export interface SumiESemanticTokens {
  readonly surface: SumiESurfaceTokens;
  readonly text: SumiETextTokens;
  readonly threat: SumiEThreatTokens;
  readonly player: SumiEPlayerTokens;
  readonly reward: SumiERewardTokens;
  readonly landscape: SumiELandscapeTokens;
  readonly ui: SumiEUiTokens;
}

/**
 * Values follow the ArcadeGames Sumi-e art-direction guide.
 *
 * Color roles are deliberate: red signals threats, blue signals player energy,
 * gold signals rewards/progression, and ink/paper build the world and interface.
 */
export const SUMI_E_SEMANTIC_TOKENS = Object.freeze({
  surface: Object.freeze({
    paper: "#E7DFCB",
    paperLight: "#F1EBDD"
  } as const),
  text: Object.freeze({
    primary: "#151515",
    secondary: "#5F6466"
  } as const),
  threat: Object.freeze({
    body: "#B3261E",
    shadow: "#A8281F",
    glow: "#FF3B30",
    inkCreature: "#151515"
  } as const),
  player: Object.freeze({
    silhouette: "#151515",
    trail: "#4DA3FF",
    projectile: "#4DA3FF",
    projectileGlow: "#9CD0FF",
    shield: "#4DA3FF"
  } as const),
  reward: Object.freeze({
    primary: "#E3A92F"
  } as const),
  landscape: Object.freeze({
    ink: "#5F6466",
    mist: "#C9D1D2",
    mountain: "#8FA3B3",
    water: "#2E86B0",
    sand: "#E2D1A5",
    safeGround: "#7FA38A",
    foliage: "#4A5A52"
  } as const),
  ui: Object.freeze({
    frame: "#B9A272",
    seal: "#D7473F",
    sealShadow: "#A8281F",
    panel: "#F1EBDD",
    bossBarBackground: "#151515",
    bossBarFill: "#B3261E",
    activeLife: "#151515",
    emptyLife: "#5F6466"
  } as const)
} satisfies SumiESemanticTokens);
