/**
 * Canonical semantic colors for the ArcadeGames Sumi-e art direction.
 *
 * New Sumi-e presentation code should consume these role-based tokens instead of
 * introducing hex values locally. Existing palettes are intentionally not migrated
 * here; adapters can bridge them in a later phase without changing current renders.
 */

declare const hexColorBrand: unique symbol;
declare const semanticRoleBrand: unique symbol;

/** A runtime-validated six-digit CSS hex color. */
export type HexColor = string & { readonly [hexColorBrand]: true };

export type SumiESemanticRole =
  | "surface"
  | "text"
  | "threat"
  | "player"
  | "reward"
  | "landscape"
  | "ui";

/**
 * A hex color tagged with its semantic category.
 * Colors remain assignable to string APIs, but tokens from unrelated categories
 * cannot accidentally be assigned to each other.
 */
export type SemanticColor<Role extends SumiESemanticRole> = HexColor & {
  readonly [semanticRoleBrand]: Role;
};

export type SumiESurfaceColor = SemanticColor<"surface">;
export type SumiETextColor = SemanticColor<"text">;
export type SumiEThreatColor = SemanticColor<"threat">;
export type SumiEPlayerColor = SemanticColor<"player">;
export type SumiERewardColor = SemanticColor<"reward">;
export type SumiELandscapeColor = SemanticColor<"landscape">;
export type SumiEUiColor = SemanticColor<"ui">;

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

/** Validate the color at runtime and attach its compile-time semantic role. */
function semanticColor<Role extends SumiESemanticRole>(
  value: string,
  role: Role
): SemanticColor<Role> {
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new TypeError(`Invalid Sumi-e ${role} color "${value}": expected #RRGGBB.`);
  }

  return value as SemanticColor<Role>;
}

export interface SumiESurfaceTokens {
  /** Main aged washi background. */
  readonly paper: SumiESurfaceColor;
  /** Clean paper for panels and quiet UI surfaces. */
  readonly paperLight: SumiESurfaceColor;
}

export interface SumiETextTokens {
  /** Primary text, outlines and high-contrast ink details. */
  readonly primary: SumiETextColor;
  /** Secondary labels and subdued ink details; still readable on paper. */
  readonly secondary: SumiETextColor;
}

export interface SumiEThreatTokens {
  /** Main pigment for hostile bodies and red oni. */
  readonly body: SumiEThreatColor;
  /** Dark red used for threat shadows and secondary hostile details. */
  readonly shadow: SumiEThreatColor;
  /** High-intensity red reserved for hostile projectiles and threat highlights. */
  readonly glow: SumiEThreatColor;
  /** Near-black body fill for ink ghosts and other monochrome threats. */
  readonly inkCreature: SumiEThreatColor;
}

export interface SumiEPlayerTokens {
  /** Monochrome player silhouette and outline. */
  readonly silhouette: SumiEPlayerColor;
  /** Blue movement trails and player energy. */
  readonly trail: SumiEPlayerColor;
  /** Player-owned projectiles; distinct from hostile red projectiles. */
  readonly projectile: SumiEPlayerColor;
  /** Lighter blue core of player trails and projectiles. */
  readonly projectileGlow: SumiEPlayerColor;
  /** Player shield and protective abilities. */
  readonly shield: SumiEPlayerColor;
}

export interface SumiERewardTokens {
  /** Currency, ofuda, checkpoints and progression rewards. */
  readonly primary: SumiERewardColor;
}

export interface SumiELandscapeTokens {
  /** Mid-tone ink wash for rocks, trees and secondary landscape details. */
  readonly ink: SumiELandscapeColor;
  /** Fog and mist separating depth layers. */
  readonly mist: SumiELandscapeColor;
  /** Distant mountain washes. */
  readonly mountain: SumiELandscapeColor;
  /** Water surfaces in water-focused games such as Frogger. */
  readonly water: SumiELandscapeColor;
  /** Sand and riverbanks. */
  readonly sand: SumiELandscapeColor;
  /** Safe ground and traversable meadow areas. */
  readonly safeGround: SumiELandscapeColor;
  /** Pine foliage and dark vegetation. */
  readonly foliage: SumiELandscapeColor;
}

export interface SumiEUiTokens {
  /** Muted ornamental frame and parchment borders. */
  readonly frame: SumiEUiColor;
  /** Vermilion hanko seals and decorative UI accents, not gameplay threats. */
  readonly seal: SumiEUiColor;
  /** Darker seal pigment for stamped depth. */
  readonly sealShadow: SumiEUiColor;
  /** Light paper surface for UI panels. */
  readonly panel: SumiEUiColor;
  /** Ink backing of a boss health bar. */
  readonly bossBarBackground: SumiEUiColor;
  /** Red brush stroke showing remaining boss health. */
  readonly bossBarFill: SumiEUiColor;
  /** Filled life-pot or life indicator. */
  readonly activeLife: SumiEUiColor;
  /** Empty life-pot or life indicator. */
  readonly emptyLife: SumiEUiColor;
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
 * Red signals threats; blue signals player energy; gold signals rewards and progress.
 * Ink and paper construct the world. Decorative seal red is kept separate from threat red.
 */
export const SUMI_E_SEMANTIC_TOKENS = Object.freeze({
  surface: Object.freeze({
    paper: semanticColor("#E7DFCB", "surface"),
    paperLight: semanticColor("#F1EBDD", "surface")
  }),
  text: Object.freeze({
    primary: semanticColor("#151515", "text"),
    secondary: semanticColor("#5F6466", "text")
  }),
  threat: Object.freeze({
    body: semanticColor("#B3261E", "threat"),
    shadow: semanticColor("#A8281F", "threat"),
    glow: semanticColor("#FF3B30", "threat"),
    inkCreature: semanticColor("#151515", "threat")
  }),
  player: Object.freeze({
    silhouette: semanticColor("#151515", "player"),
    trail: semanticColor("#4DA3FF", "player"),
    projectile: semanticColor("#4DA3FF", "player"),
    projectileGlow: semanticColor("#9CD0FF", "player"),
    shield: semanticColor("#4DA3FF", "player")
  }),
  reward: Object.freeze({
    primary: semanticColor("#E3A92F", "reward")
  }),
  landscape: Object.freeze({
    ink: semanticColor("#5F6466", "landscape"),
    mist: semanticColor("#C9D1D2", "landscape"),
    mountain: semanticColor("#8FA3B3", "landscape"),
    water: semanticColor("#2E86B0", "landscape"),
    sand: semanticColor("#E2D1A5", "landscape"),
    safeGround: semanticColor("#7FA38A", "landscape"),
    foliage: semanticColor("#4A5A52", "landscape")
  }),
  ui: Object.freeze({
    frame: semanticColor("#B9A272", "ui"),
    seal: semanticColor("#D7473F", "ui"),
    sealShadow: semanticColor("#A8281F", "ui"),
    panel: semanticColor("#F1EBDD", "ui"),
    bossBarBackground: semanticColor("#151515", "ui"),
    bossBarFill: semanticColor("#B3261E", "ui"),
    activeLife: semanticColor("#151515", "ui"),
    emptyLife: semanticColor("#5F6466", "ui")
  })
} satisfies SumiESemanticTokens);
