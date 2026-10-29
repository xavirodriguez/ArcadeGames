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

/**
 * Validate a hex value and attach its compile-time semantic role.
 * Use this when defining a palette variant; invalid CSS colors fail immediately.
 */
export function createSumiESemanticColor<Role extends SumiESemanticRole>(
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
    paper: createSumiESemanticColor("#E7DFCB", "surface"),
    paperLight: createSumiESemanticColor("#F1EBDD", "surface")
  }),
  text: Object.freeze({
    primary: createSumiESemanticColor("#151515", "text"),
    secondary: createSumiESemanticColor("#5F6466", "text")
  }),
  threat: Object.freeze({
    body: createSumiESemanticColor("#B3261E", "threat"),
    shadow: createSumiESemanticColor("#A8281F", "threat"),
    glow: createSumiESemanticColor("#FF3B30", "threat"),
    inkCreature: createSumiESemanticColor("#151515", "threat")
  }),
  player: Object.freeze({
    silhouette: createSumiESemanticColor("#151515", "player"),
    trail: createSumiESemanticColor("#4DA3FF", "player"),
    projectile: createSumiESemanticColor("#4DA3FF", "player"),
    projectileGlow: createSumiESemanticColor("#9CD0FF", "player"),
    shield: createSumiESemanticColor("#4DA3FF", "player")
  }),
  reward: Object.freeze({
    primary: createSumiESemanticColor("#E3A92F", "reward")
  }),
  landscape: Object.freeze({
    ink: createSumiESemanticColor("#5F6466", "landscape"),
    mist: createSumiESemanticColor("#C9D1D2", "landscape"),
    mountain: createSumiESemanticColor("#8FA3B3", "landscape"),
    water: createSumiESemanticColor("#2E86B0", "landscape"),
    sand: createSumiESemanticColor("#E2D1A5", "landscape"),
    safeGround: createSumiESemanticColor("#7FA38A", "landscape"),
    foliage: createSumiESemanticColor("#4A5A52", "landscape")
  }),
  ui: Object.freeze({
    frame: createSumiESemanticColor("#B9A272", "ui"),
    seal: createSumiESemanticColor("#D7473F", "ui"),
    sealShadow: createSumiESemanticColor("#A8281F", "ui"),
    panel: createSumiESemanticColor("#F1EBDD", "ui"),
    bossBarBackground: createSumiESemanticColor("#151515", "ui"),
    bossBarFill: createSumiESemanticColor("#B3261E", "ui"),
    activeLife: createSumiESemanticColor("#151515", "ui"),
    emptyLife: createSumiESemanticColor("#5F6466", "ui")
  })
} satisfies SumiESemanticTokens);
